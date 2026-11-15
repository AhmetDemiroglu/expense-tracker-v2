// Misafir modu: kayıtlı misafiri bulma, "Hesapsız dene" demo verisi, misafirden hesaba aktarım.
// Aktarım kuralı ve sınırları: kaynaklar/havuz/P4-gunluk.md "Misafirden hesaba aktarım".

import {
  ACTIVE_GUEST_KEY,
  DEMO_PERIOD_NAME,
  GUEST_PREFIX,
  activePeriod,
  buildDemoData,
  findOverlaps,
  guestStorageKeys,
  stripAutoSuffix,
  trFold,
  withId,
  writePeriod,
  writeRecurring,
  writeSettings,
  writeTransaction,
  type LocalDate,
  type Period,
  type Recurring,
  type Settings,
  type Transaction,
} from "@/core";
import type { AnahtarDeger } from "./depo/depolama";
import { jsonOku } from "./depo/depolama";
import { LocalRepo } from "./depo/localRepo";
import type { VeriPaketi } from "./depo/tipler";
import { yeniKimlik, yeniMisafirKimligi } from "./kimlik";

/** Yeni demo kayıtlarının kimlik öneki: aktarımda tanınır. */
export const DEMO_ONEKI = "demo_";
/** Aktarım kararları: { [guestId]: "aktarildi:<uid>" | "reddedildi" } */
export const AKTARIM_ANAHTARI = "fintel_misafir_aktarim";

export function kayitliMisafir(depo: AnahtarDeger): string | null {
  const g = depo.getItem(ACTIVE_GUEST_KEY);
  return g && g.startsWith(GUEST_PREFIX) ? g : null;
}

/** "Hesapsız dene": yeni misafir + çekirdeğin demo verisi (eski anahtarlarla, eski alan adlarıyla). */
export function demoMisafirOlustur(depo: AnahtarDeger, bugun: LocalDate, now: number): string {
  const guestId = yeniMisafirKimligi();
  const demo = buildDemoData({ guestId, today: bugun, now, idFor: (n) => `${DEMO_ONEKI}${guestId}_${n}` });
  const k = guestStorageKeys(guestId);
  depo.setItem(k.transactions, JSON.stringify(demo.transactions.map((t) => withId(writeTransaction(t), t.id))));
  depo.setItem(k.periods, JSON.stringify(demo.periods.map((p) => withId(writePeriod(p), p.id))));
  depo.setItem(k.recurring, JSON.stringify(demo.recurrences.map((r) => withId(writeRecurring(r), r.id))));
  depo.setItem(k.settings, JSON.stringify(writeSettings(demo.settings)));
  depo.setItem(ACTIVE_GUEST_KEY, guestId);
  return guestId;
}

// ---------------- Demo tanıma ----------------

/** Eski sürümün demo seti (demoService.ts): açıklama, kuruş, tür. Düzenlenmiş kayıt eşleşmez: kullanıcınındır. */
const ESKI_DEMO: ReadonlyArray<readonly [string, number, "income" | "expense"]> = [
  ["Aylık Maaş", 4_500_000, "income"],
  ["Ev Kirası", 1_200_000, "expense"],
  ["Elektrik", 85_000, "expense"],
  ["Haftalık Alışveriş", 125_000, "expense"],
  ["Benzin", 35_000, "expense"],
  ["Sinema & Yemek", 140_000, "expense"],
  ["T-Shirt", 45_000, "expense"],
  ["Eksikler", 22_000, "expense"],
];

function eskiDemoParmakIzi(t: Transaction): boolean {
  return ESKI_DEMO.some(([d, a, ty]) => t.description === d && t.amount === a && t.type === ty);
}

/**
 * Demo işlemleri: yeni demo (kimlik öneki) ya da eski demo seti.
 * Eski demo için: parmak izi tutan ve aynı anda (10 sn içinde) oluşturulmuş en az 4 eşi olan kayıt.
 */
export function demoIslemKimlikleri(islemler: readonly Transaction[]): Set<string> {
  const out = new Set<string>();
  const eski = islemler.filter(eskiDemoParmakIzi);
  for (const t of islemler) {
    if (t.id.startsWith(DEMO_ONEKI)) {
      out.add(t.id);
      continue;
    }
    if (!eskiDemoParmakIzi(t)) continue;
    const es = eski.filter((x) => Math.abs(x.createdAt - t.createdAt) <= 10_000).length;
    if (es >= 4) out.add(t.id);
  }
  return out;
}

function demoDonemMi(p: { id?: string; name: string }): boolean {
  return (p.id?.startsWith(DEMO_ONEKI) ?? false) || p.name === DEMO_PERIOD_NAME;
}

/** Misafirin KENDİ eklediği kayıtlar (demo hariç). */
export function kullaniciKayitlari(p: VeriPaketi): {
  islemler: Transaction[];
  donemler: Period[];
  duzenliler: Recurring[];
  ayarlar: Settings | null;
} {
  const demo = demoIslemKimlikleri(p.islemler);
  const duzenliler = p.duzenliler.filter((r) => !r.id.startsWith(DEMO_ONEKI));
  const duzenliIds = new Set(p.duzenliler.map((r) => r.id));
  const islemler = p.islemler.filter(
    (t) => !demo.has(t.id) && !(t.recurringId && t.recurringId.startsWith(DEMO_ONEKI) && duzenliIds.has(t.recurringId)),
  );
  const donemler = p.donemler.filter((d) => !demoDonemMi(d));
  const ayarlar = p.ayarlar?.period && !demoDonemMi(p.ayarlar.period) ? p.ayarlar : null;
  return { islemler, donemler, duzenliler, ayarlar };
}

// ---------------- Aktarım planı (saf) ----------------

export type AktarimProfili = Pick<Settings, "financialGoal" | "savingsStyle" | "riskTolerance" | "payday">;

export interface AktarimPlani {
  islemler: Transaction[];
  donemler: Period[];
  duzenliler: Recurring[];
  /** Hedefte aktif dönem yoksa: settings'e birleştirilecek dönem ve Nova profili */
  ayarlar: { donem: Period; profil: AktarimProfili } | null;
  atlanan: number;
}

function islemImzasi(t: Transaction): string {
  return [t.type, t.date, t.amount, t.category, trFold(stripAutoSuffix(t.description).trim())].join("|");
}

function duzenliImzasi(r: Recurring): string {
  return [r.type, r.amount, r.frequency, trFold(r.description.trim())].join("|");
}

/**
 * Misafir verisini hedef hesaba birleştirir. Kurallar:
 * 1. Demo kayıtları aktarılmaz. Kimlikler korunur (aynı aktarım ikinci kez çalışırsa aynı dokümanlar yazılır).
 * 2. Düzenli ödeme: aynı kimlik ya da aynı tür + tutar + sıklık + ad hedefte varsa atlanır; atlananın
 *    ürettiği işlemler de atlanır (hedefteki ödeme kendi işlemini üretir).
 * 3. İşlem: aynı kimlik ya da aynı tür + tarih + tutar + kategori + ad (eksiz) hedefte varsa atlanır.
 *    Sayımlı eşleşme: hedefte 1, misafirde 2 aynı kahve varsa 1 tanesi aktarılır.
 * 4. Dönem: aynı kimlik ya da hedefteki bir dönemle çakışıyorsa atlanır (hedef esastır, işlemler tarihe göre
 *    hedefin dönemine düşer).
 * 5. Ayarlar: yalnız hedefte aktif dönem YOKSA (sunucu doğruladı) misafirin aktif dönemi ve Nova profili aktarılır.
 */
export function aktarimPlaniKur(misafir: VeriPaketi, hedef: VeriPaketi, uid: string): AktarimPlani {
  const kendi = kullaniciKayitlari(misafir);
  let atlanan = 0;

  // Düzenli ödemeler
  const hedefDuzenliIds = new Set(hedef.duzenliler.map((r) => r.id));
  const hedefDuzenliImza = new Set(hedef.duzenliler.map(duzenliImzasi));
  const atlananDuzenli = new Set<string>();
  const duzenliler: Recurring[] = [];
  for (const r of kendi.duzenliler) {
    if (hedefDuzenliIds.has(r.id) || hedefDuzenliImza.has(duzenliImzasi(r))) {
      atlananDuzenli.add(r.id);
      atlanan += 1;
      continue;
    }
    duzenliler.push({ ...r, userId: uid });
  }

  // İşlemler (sayımlı imza eşleşmesi)
  const hedefIslemIds = new Set(hedef.islemler.map((t) => t.id));
  const kalanImza = new Map<string, number>();
  for (const t of hedef.islemler) kalanImza.set(islemImzasi(t), (kalanImza.get(islemImzasi(t)) ?? 0) + 1);
  const islemler: Transaction[] = [];
  for (const t of kendi.islemler) {
    if (hedefIslemIds.has(t.id) || (t.recurringId && atlananDuzenli.has(t.recurringId))) {
      atlanan += 1;
      continue;
    }
    const imza = islemImzasi(t);
    const n = kalanImza.get(imza) ?? 0;
    if (n > 0) {
      kalanImza.set(imza, n - 1);
      atlanan += 1;
      continue;
    }
    islemler.push({ ...t, userId: uid });
  }

  // Dönemler
  const hedefDonemIds = new Set(hedef.donemler.map((p) => p.id));
  const donemler: Period[] = [];
  const eklenen: Period[] = [];
  for (const p of kendi.donemler) {
    if (hedefDonemIds.has(p.id) || findOverlaps(p, [...hedef.donemler, ...eklenen]).length > 0) {
      atlanan += 1;
      continue;
    }
    const yeni = { ...p, userId: uid };
    donemler.push(yeni);
    eklenen.push(yeni);
  }

  // Ayarlar
  let ayarlar: AktarimPlani["ayarlar"] = null;
  if (hedef.ayarDurumu === "yok" && kendi.ayarlar?.period) {
    let donem = activePeriod(kendi.ayarlar, kendi.donemler);
    if (donem) {
      const kayitli = donemler.find((p) => p.id === donem?.id);
      if (!kayitli && findOverlaps(donem, [...hedef.donemler, ...eklenen]).length === 0) {
        // Kayıtlı karşılığı olmayan aktif dönem (eski misafir): kayıt olarak da eklenir.
        donem = { ...donem, id: donem.id === "active" ? yeniKimlik() : donem.id, userId: uid };
        if (!hedefDonemIds.has(donem.id)) donemler.push(donem);
      }
      const s = kendi.ayarlar;
      const profil: AktarimProfili = {
        financialGoal: s.financialGoal,
        savingsStyle: s.savingsStyle,
        riskTolerance: s.riskTolerance,
      };
      if (s.payday !== undefined) profil.payday = s.payday;
      ayarlar = { donem: { ...donem, userId: uid }, profil };
    }
  }

  return { islemler, donemler, duzenliler, ayarlar, atlanan };
}

// ---------------- Cihazdaki misafirler ----------------

export interface MisafirOzeti {
  guestId: string;
  islem: number;
  donem: number;
  duzenli: number;
  ayarVar: boolean;
}

function aktarimKararlari(depo: AnahtarDeger): Record<string, string> {
  const v = jsonOku(depo, AKTARIM_ANAHTARI);
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {};
}

export function aktarimKarariYaz(depo: AnahtarDeger, guestId: string, karar: string): void {
  try {
    depo.setItem(AKTARIM_ANAHTARI, JSON.stringify({ ...aktarimKararlari(depo), [guestId]: karar }));
  } catch {
    // depo dolu: bir dahaki açılışta yeniden sorulur
  }
}

/** Cihazdaki misafir kimlikleri (eski setler birikmiş olabilir). */
export function cihazdakiMisafirler(depo: AnahtarDeger): string[] {
  const set = new Set<string>();
  for (const k of depo.keys()) {
    const m = /^(?:tx|settings|periods|recurring)_(guest_[A-Za-z0-9]+)$/.exec(k);
    if (m?.[1]) set.add(m[1]);
  }
  const aktif = kayitliMisafir(depo);
  if (aktif) set.add(aktif);
  return [...set];
}

export function misafirPaketi(depo: AnahtarDeger, guestId: string): VeriPaketi {
  return new LocalRepo(guestId, depo).oku();
}

/**
 * Hesaplı kullanıcıya önerilecek misafir: kendi eklediği kaydı olan, daha önce aktarılmamış ya da
 * reddedilmemiş. Önce en son açılan (active_guest), sonra en çok kaydı olan.
 */
export function aktarilabilirMisafirBul(depo: AnahtarDeger, oncelikli: string | null = null): MisafirOzeti | null {
  const kararlar = aktarimKararlari(depo);
  const adaylar: MisafirOzeti[] = [];
  for (const guestId of cihazdakiMisafirler(depo)) {
    if (kararlar[guestId]) continue;
    const k = kullaniciKayitlari(misafirPaketi(depo, guestId));
    const ozet: MisafirOzeti = {
      guestId,
      islem: k.islemler.length,
      donem: k.donemler.length,
      duzenli: k.duzenliler.length,
      ayarVar: k.ayarlar !== null,
    };
    if (ozet.islem + ozet.donem + ozet.duzenli > 0 || ozet.ayarVar) adaylar.push(ozet);
  }
  if (adaylar.length === 0) return null;
  const once = adaylar.find((a) => a.guestId === oncelikli);
  if (once) return once;
  adaylar.sort((a, b) => b.islem + b.donem + b.duzenli - (a.islem + a.donem + a.duzenli));
  return adaylar[0] ?? null;
}
