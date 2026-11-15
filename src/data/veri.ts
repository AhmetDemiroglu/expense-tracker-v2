// Veri store'u: işlemler, dönemler, düzenli ödemeler, ayarlar. Bir kez yüklenir, tüm ekranlar aynı kaynağı okur.
// Yazma: yerel durum HEMEN değişir. Misafirde yazım beklenir (hata fırlatır). Hesaplı kullanıcıda sunucu onayı
// beklenmez (çevrimdışı asılı kalmasın); sonradan ret gelirse geri alınır ve sonYazimHatasi dolar.

import { create } from "zustand";
import {
  activationPatch,
  isCategoryKey,
  parseLocalDate,
  processRecurring,
  writeSettings,
  type Period,
  type Recurring,
  type Settings,
  type Transaction,
} from "@/core";
import { UygulamaHatasi, veriHatasinaCevir } from "./hatalar";
import { yeniKimlik } from "./kimlik";
import { donemSirala, islemSirala } from "./depo/esleme";
import type { AyarDurumu, BozukKayit, PaketMeta, Repository, VeriPaketi } from "./depo/tipler";
import { useBugunStore } from "./bugun";

export type YeniIslem = Omit<Transaction, "id" | "userId" | "createdAt"> & { id?: string };
export type DonemGirdisi = Omit<Period, "id" | "userId"> & { id?: string };
export type DuzenliGirdisi = Omit<Recurring, "id" | "userId"> & { id?: string };
export type AyarYamasi = Partial<Omit<Settings, "userId">>;

export interface VeriDurumu {
  durum: "bos" | "yukleniyor" | "hazir" | "hata";
  ayarDurumu: AyarDurumu;
  hata: UygulamaHatasi | null;
  islemler: Transaction[];
  donemler: Period[];
  duzenliler: Recurring[];
  ayarlar: Settings | null;
  bozuk: BozukKayit[];
  onbellektenMi: boolean;
  bekleyenYazim: boolean;
  sonYazimHatasi: UygulamaHatasi | null;

  islemEkle(t: YeniIslem): Promise<Transaction>;
  islemleriEkle(t: readonly Transaction[]): Promise<void>;
  islemGuncelle(t: Transaction): Promise<void>;
  islemSil(id: string): Promise<void>;
  islemleriSil(ids: readonly string[]): Promise<void>;
  donemKaydet(p: DonemGirdisi): Promise<Period>;
  donemSil(id: string): Promise<void>;
  donemAktifEt(id: string): Promise<void>;
  duzenliKaydet(r: DuzenliGirdisi): Promise<Recurring>;
  duzenliSil(id: string): Promise<void>;
  ayarlarKaydet(yama: AyarYamasi): Promise<void>;
  yenile(): Promise<void>;
  yazimHatasiniTemizle(): void;
}

type Veri = Pick<VeriDurumu, "islemler" | "donemler" | "duzenliler" | "ayarlar" | "ayarDurumu">;

const BOS: Omit<VeriDurumu, keyof Eylemler> = {
  durum: "bos",
  ayarDurumu: "bilinmiyor",
  hata: null,
  islemler: [],
  donemler: [],
  duzenliler: [],
  ayarlar: null,
  bozuk: [],
  onbellektenMi: false,
  bekleyenYazim: false,
  sonYazimHatasi: null,
};

type Eylemler = Pick<
  VeriDurumu,
  | "islemEkle"
  | "islemleriEkle"
  | "islemGuncelle"
  | "islemSil"
  | "islemleriSil"
  | "donemKaydet"
  | "donemSil"
  | "donemAktifEt"
  | "duzenliKaydet"
  | "duzenliSil"
  | "ayarlarKaydet"
  | "yenile"
  | "yazimHatasiniTemizle"
>;

// --- Bağlantı durumu (modül içi): hangi depo, hangi kullanıcı ---
let aktifRepo: Repository | null = null;
let birak: (() => void) | null = null;
let uretimSuruyor = false;
let sonUretim = "";

export function varsayilanAyarlar(userId: string): Settings {
  return {
    userId,
    period: null,
    currency: "TRY",
    financialGoal: "stability",
    savingsStyle: "balanced",
    riskTolerance: "medium",
  };
}

const AYAR_ALANLARI: Record<keyof Omit<Settings, "userId">, readonly string[]> = {
  period: ["periodName", "periodStartDate", "periodEndDate", "monthlyIncome", "fixedExpenses"],
  activePeriodId: ["activePeriodId"],
  payday: ["payday"],
  currency: ["currency"],
  financialGoal: ["financialGoal"],
  savingsStyle: ["savingsStyle"],
  riskTolerance: ["riskTolerance"],
};

/** Yalnız değişen alanları içeren ham yama (writeSettings çıktısından seçilir). userId her zaman. */
export function ayarYamasi(s: Settings, anahtarlar: readonly (keyof Omit<Settings, "userId">)[]): Record<string, unknown> {
  const tam = writeSettings(s);
  const out: Record<string, unknown> = { userId: s.userId };
  for (const k of anahtarlar) {
    for (const alan of AYAR_ALANLARI[k]) if (alan in tam) out[alan] = tam[alan];
  }
  return out;
}

function islemDogrula(t: Transaction): void {
  if (!Number.isInteger(t.amount) || t.amount < 0) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Tutar geçersiz." });
  if (parseLocalDate(t.date) !== t.date) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Tarih geçersiz." });
  if (!isCategoryKey(t.category)) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Kategori geçersiz." });
  if (t.type !== "income" && t.type !== "expense") throw new UygulamaHatasi("GECERSIZ");
}

function degistir<T extends { id: string }>(liste: readonly T[], yeni: readonly T[]): T[] {
  const m = new Map(yeni.map((x) => [x.id, x]));
  const out = liste.map((x) => m.get(x.id) ?? x);
  const var_ = new Set(liste.map((x) => x.id));
  for (const x of yeni) if (!var_.has(x.id)) out.push(x);
  return out;
}

function cikar<T extends { id: string }>(liste: readonly T[], ids: readonly string[]): T[] {
  const s = new Set(ids);
  return liste.filter((x) => !s.has(x.id));
}

export const useVeri = create<VeriDurumu>((set, get) => {
  function gerekliRepo(): Repository {
    if (!aktifRepo) throw new UygulamaHatasi("OTURUM_YOK");
    return aktifRepo;
  }

  /** İyimser uygula, depoya yaz, hata olursa geri al. */
  async function uygula(
    ileri: (s: VeriDurumu) => Partial<Veri>,
    geri: (s: VeriDurumu) => Partial<Veri>,
    yaz: (r: Repository) => Promise<void>,
  ): Promise<void> {
    const repo = gerekliRepo();
    set((s) => ileri(s));
    let p: Promise<void>;
    try {
      p = yaz(repo);
    } catch (e) {
      set((s) => geri(s));
      throw veriHatasinaCevir(e);
    }
    if (repo.tur === "yerel") {
      try {
        await p;
      } catch (e) {
        set((s) => geri(s));
        throw veriHatasinaCevir(e);
      }
      return;
    }
    p.catch((e: unknown) => {
      if (aktifRepo !== repo) return;
      set((s) => ({ ...geri(s), sonYazimHatasi: veriHatasinaCevir(e) }));
    });
  }

  return {
    ...BOS,

    async islemEkle(girdi) {
      const repo = gerekliRepo();
      const { id, ...rest } = girdi;
      const tx: Transaction = { ...rest, id: id ?? yeniKimlik(), userId: repo.userId, createdAt: Date.now() };
      islemDogrula(tx);
      const onceki = get().islemler.find((x) => x.id === tx.id);
      await uygula(
        (s) => ({ islemler: degistir(s.islemler, [tx]).sort(islemSirala) }),
        (s) => ({ islemler: onceki ? degistir(s.islemler, [onceki]).sort(islemSirala) : cikar(s.islemler, [tx.id]) }),
        (r) => r.islemYaz(tx),
      );
      return tx;
    },

    async islemleriEkle(liste) {
      const repo = gerekliRepo();
      const txs = liste.map((t) => ({ ...t, userId: repo.userId }));
      txs.forEach(islemDogrula);
      const ids = txs.map((t) => t.id);
      const onceki = get().islemler.filter((x) => ids.includes(x.id));
      await uygula(
        (s) => ({ islemler: degistir(s.islemler, txs).sort(islemSirala) }),
        (s) => ({ islemler: degistir(cikar(s.islemler, ids), onceki).sort(islemSirala) }),
        (r) => r.islemleriYaz(txs),
      );
    },

    async islemGuncelle(t) {
      const repo = gerekliRepo();
      const tx = { ...t, userId: repo.userId };
      islemDogrula(tx);
      const onceki = get().islemler.find((x) => x.id === tx.id);
      if (!onceki) throw new UygulamaHatasi("BULUNAMADI");
      await uygula(
        (s) => ({ islemler: degistir(s.islemler, [tx]).sort(islemSirala) }),
        (s) => ({ islemler: degistir(s.islemler, [onceki]).sort(islemSirala) }),
        (r) => r.islemYaz(tx),
      );
    },

    islemSil(id) {
      return get().islemleriSil([id]);
    },

    async islemleriSil(ids) {
      const silinen = get().islemler.filter((x) => ids.includes(x.id));
      await uygula(
        (s) => ({ islemler: cikar(s.islemler, ids) }),
        (s) => ({ islemler: degistir(s.islemler, silinen).sort(islemSirala) }),
        (r) => r.islemleriSil(ids),
      );
    },

    async donemKaydet(girdi) {
      const repo = gerekliRepo();
      const { id, ...rest } = girdi;
      const p: Period = { ...rest, id: id ?? yeniKimlik(), userId: repo.userId };
      if (parseLocalDate(p.start) !== p.start || parseLocalDate(p.end) !== p.end) {
        throw new UygulamaHatasi("GECERSIZ", { mesaj: "Dönem tarihleri geçersiz." });
      }
      const onceki = get().donemler.find((x) => x.id === p.id);
      // Aktif dönem düzenlendiyse settings'teki kopya da güncellenir (tek kaynak settings).
      const ayarlar = get().ayarlar;
      const aktifMi =
        !!ayarlar?.period &&
        (ayarlar.activePeriodId === p.id ||
          (!ayarlar.activePeriodId && !!onceki && onceki.name === ayarlar.period.name && onceki.start === ayarlar.period.start));
      await uygula(
        (s) => ({ donemler: degistir(s.donemler, [p]).sort(donemSirala) }),
        (s) => ({ donemler: onceki ? degistir(s.donemler, [onceki]).sort(donemSirala) : cikar(s.donemler, [p.id]) }),
        (r) => r.donemYaz(p),
      );
      if (aktifMi) await get().donemAktifEt(p.id);
      return p;
    },

    async donemSil(id) {
      const silinen = get().donemler.find((x) => x.id === id);
      if (!silinen) return;
      await uygula(
        (s) => ({ donemler: cikar(s.donemler, [id]) }),
        (s) => ({ donemler: degistir(s.donemler, [silinen]).sort(donemSirala) }),
        (r) => r.donemSil(id),
      );
    },

    async donemAktifEt(id) {
      const repo = gerekliRepo();
      const p = get().donemler.find((x) => x.id === id);
      if (!p) throw new UygulamaHatasi("BULUNAMADI");
      const onceki = get().ayarlar;
      const oncekiDurum = get().ayarDurumu;
      const yeni: Settings = {
        ...(onceki ?? varsayilanAyarlar(repo.userId)),
        period: { name: p.name, start: p.start, end: p.end, plannedIncome: p.plannedIncome, fixedExpenses: p.fixedExpenses },
        activePeriodId: p.id,
      };
      await uygula(
        () => ({ ayarlar: yeni, ayarDurumu: "var" }),
        () => ({ ayarlar: onceki, ayarDurumu: oncekiDurum }),
        (r) => r.ayarlarYaz(activationPatch({ ...p, userId: repo.userId })),
      );
    },

    async duzenliKaydet(girdi) {
      const repo = gerekliRepo();
      const { id, ...rest } = girdi;
      const r: Recurring = { ...rest, id: id ?? yeniKimlik(), userId: repo.userId };
      if (!Number.isInteger(r.amount) || r.amount < 0 || parseLocalDate(r.startDate) !== r.startDate) {
        throw new UygulamaHatasi("GECERSIZ");
      }
      const onceki = get().duzenliler.find((x) => x.id === r.id);
      await uygula(
        (s) => ({ duzenliler: degistir(s.duzenliler, [r]) }),
        (s) => ({ duzenliler: onceki ? degistir(s.duzenliler, [onceki]) : cikar(s.duzenliler, [r.id]) }),
        (x) => x.duzenliYaz(r),
      );
      // Yeni ya da tarihi geçmiş düzenli ödeme hemen işlensin.
      sonUretim = "";
      void duzenliOdemeleriIsle();
      return r;
    },

    async duzenliSil(id) {
      const silinen = get().duzenliler.find((x) => x.id === id);
      if (!silinen) return;
      await uygula(
        (s) => ({ duzenliler: cikar(s.duzenliler, [id]) }),
        (s) => ({ duzenliler: degistir(s.duzenliler, [silinen]) }),
        (r) => r.duzenliSil(id),
      );
    },

    async ayarlarKaydet(yama) {
      const repo = gerekliRepo();
      const onceki = get().ayarlar;
      const oncekiDurum = get().ayarDurumu;
      const yeni: Settings = { ...(onceki ?? varsayilanAyarlar(repo.userId)), ...yama, userId: repo.userId };
      const anahtarlar = Object.keys(yama) as (keyof Omit<Settings, "userId">)[];
      const ham = ayarYamasi(yeni, anahtarlar.filter((k) => k in AYAR_ALANLARI));
      await uygula(
        () => ({ ayarlar: yeni, ayarDurumu: yeni.period ? "var" : oncekiDurum }),
        () => ({ ayarlar: onceki, ayarDurumu: oncekiDurum }),
        (r) => r.ayarlarYaz(ham),
      );
    },

    async yenile() {
      const repo = aktifRepo;
      if (repo) depoyaBaglan(repo, { sessiz: true });
    },

    yazimHatasiniTemizle() {
      set({ sonYazimHatasi: null });
    },
  };
});

function paketiUygula(p: VeriPaketi, m: PaketMeta): void {
  useVeri.setState({
    durum: "hazir",
    hata: null,
    islemler: p.islemler,
    donemler: p.donemler,
    duzenliler: p.duzenliler,
    ayarlar: p.ayarlar,
    ayarDurumu: p.ayarDurumu,
    bozuk: p.bozuk,
    onbellektenMi: m.onbellektenMi,
    bekleyenYazim: m.bekleyenYazim,
  });
  if (!m.onbellektenMi) void duzenliOdemeleriIsle();
}

/**
 * Oturum değişince çağrılır. null: oturum kapandı, store boşalır.
 * sessiz: yeniden bağlanırken var olan veriyi göstermeye devam et (aşağı çekip yenileme).
 */
export function depoyaBaglan(repo: Repository | null, opts: { sessiz?: boolean } = {}): void {
  if (birak) birak();
  birak = null;
  const ayni = aktifRepo?.userId === repo?.userId;
  aktifRepo = repo;
  uretimSuruyor = false;
  if (!ayni) sonUretim = "";
  if (!repo) {
    useVeri.setState({ ...BOS });
    return;
  }
  if (!(opts.sessiz && ayni)) useVeri.setState({ ...BOS, durum: "yukleniyor" });
  birak = repo.dinle(
    (p, m) => {
      if (aktifRepo !== repo) return; // kullanıcı değişti: geç gelen sonucu at
      paketiUygula(p, m);
    },
    (e) => {
      if (aktifRepo !== repo) return;
      useVeri.setState({ durum: "hata", hata: e });
    },
  );
}

export function aktifDepo(): Repository | null {
  return aktifRepo;
}

/**
 * Düzenli ödemelerden kaçan vadeleri üretir (çekirdek kuralı, deterministik kimlik, toplu yazım).
 * Tek seferde bir kez çalışır; aynı kullanıcı ve gün için tekrar çalışmaz.
 */
export async function duzenliOdemeleriIsle(): Promise<number> {
  const repo = aktifRepo;
  if (!repo || uretimSuruyor) return 0;
  const bugun = useBugunStore.getState().bugun;
  const anahtar = `${repo.userId}|${bugun}`;
  if (sonUretim === anahtar) return 0;
  const s = useVeri.getState();
  if (s.durum !== "hazir") return 0;
  uretimSuruyor = true;
  try {
    const { create, update } = processRecurring(s.duzenliler, s.islemler, bugun, Date.now());
    sonUretim = anahtar;
    if (create.length === 0 && update.length === 0) return 0;
    const byId = new Map(update.map((u) => [u.id, u]));
    useVeri.setState((st) => ({
      islemler: degistir(st.islemler, create).sort(islemSirala),
      duzenliler: st.duzenliler.map((r) => {
        const u = byId.get(r.id);
        return u ? { ...r, nextDueDate: u.nextDueDate, lastProcessedDate: u.lastProcessedDate } : r;
      }),
    }));
    // Kimlikler deterministik: hata olursa bir sonraki açılışta yeniden denenir, çift kayıt olmaz.
    // Hesaplı kullanıcıda sunucu onayı beklenmez (çevrimdışı asılı kalmasın).
    const p = repo.duzenliUret(create, update).catch((e: unknown) => {
      sonUretim = "";
      if (aktifRepo === repo) useVeri.setState({ sonYazimHatasi: veriHatasinaCevir(e) });
    });
    if (repo.tur === "yerel") await p;
    return create.length;
  } finally {
    uretimSuruyor = false;
  }
}

// Gün değişince düzenli ödemeler yeniden işlenir.
useBugunStore.subscribe((s, once) => {
  if (s.bugun !== once.bugun) void duzenliOdemeleriIsle();
});
