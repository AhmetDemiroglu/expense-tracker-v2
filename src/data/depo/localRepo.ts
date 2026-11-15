// Misafir deposu: localStorage, eski anahtarlar AYNEN (tx_<id>, settings_<id>, periods_<id>, recurring_<id>).
// Ham dizi kimlikle düzenlenir: okunamayan eski kayıtlar ve bilinmeyen alanlar ilk kayıtta kaybolmaz.

import { guestStorageKeys, type Period, type Recurring, type Transaction } from "@/core";
import { UygulamaHatasi, veriHatasinaCevir } from "../hatalar";
import type { AnahtarDeger } from "./depolama";
import { donemVerisi, duzenliVerisi, hamBirlestir, islemVerisi, paketKur, type HamDokuman, type YazimVerisi } from "./esleme";
import type { BozukKayit, ImlecGuncellemesi, PaketMeta, Repository, VeriPaketi } from "./tipler";

type Dinleyici = { paket: (p: VeriPaketi, m: PaketMeta) => void; hata: (e: UygulamaHatasi) => void };

const META: PaketMeta = { onbellektenMi: false, bekleyenYazim: false };

interface HamDizi {
  liste: unknown[];
  /** JSON bozuksa ham metin (yazmadan önce yedeklenir) */
  bozukMetin: string | null;
}

export class LocalRepo implements Repository {
  readonly tur = "yerel" as const;
  readonly userId: string;
  private readonly depo: AnahtarDeger;
  private readonly anahtar: ReturnType<typeof guestStorageKeys>;
  private readonly dinleyiciler = new Set<Dinleyici>();

  constructor(guestId: string, depo: AnahtarDeger) {
    this.userId = guestId;
    this.depo = depo;
    this.anahtar = guestStorageKeys(guestId);
  }

  private diziOku(key: string): HamDizi {
    const raw = this.depo.getItem(key);
    if (raw === null) return { liste: [], bozukMetin: null };
    try {
      const v = JSON.parse(raw) as unknown;
      return Array.isArray(v) ? { liste: v as unknown[], bozukMetin: null } : { liste: [], bozukMetin: raw };
    } catch {
      return { liste: [], bozukMetin: raw };
    }
  }

  private yaz(key: string, deger: unknown, bozukMetin: string | null = null): void {
    try {
      // Bozuk JSON'un üzerine yazmadan önce yedeğini al (veri kaybı yok).
      if (bozukMetin !== null && this.depo.getItem(`${key}__yedek`) === null) {
        this.depo.setItem(`${key}__yedek`, bozukMetin);
      }
      this.depo.setItem(key, JSON.stringify(deger));
    } catch (e) {
      throw veriHatasinaCevir(e);
    }
  }

  private hamDokumanlar(key: string, bozuk: BozukKayit[], koleksiyon: BozukKayit["koleksiyon"]): HamDokuman[] {
    const { liste, bozukMetin } = this.diziOku(key);
    if (bozukMetin !== null) bozuk.push({ koleksiyon, id: key, neden: "JSON bozuk" });
    const out: HamDokuman[] = [];
    liste.forEach((item, index) => {
      const id =
        typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string"
          ? (item as { id: string }).id
          : "";
      if (!id) bozuk.push({ koleksiyon, id: `#${index}`, neden: "kimlik yok" });
      else out.push({ id, veri: item });
    });
    return out;
  }

  oku(): VeriPaketi {
    const bozuk: BozukKayit[] = [];
    const islemler = this.hamDokumanlar(this.anahtar.transactions, bozuk, "islem");
    const donemler = this.hamDokumanlar(this.anahtar.periods, bozuk, "donem");
    const duzenliler = this.hamDokumanlar(this.anahtar.recurring, bozuk, "duzenli");
    const ayarRaw = this.depo.getItem(this.anahtar.settings);
    let ayarHam: unknown = undefined;
    if (ayarRaw !== null) {
      try {
        ayarHam = JSON.parse(ayarRaw) as unknown;
      } catch {
        bozuk.push({ koleksiyon: "ayar", id: this.anahtar.settings, neden: "JSON bozuk" });
      }
    }
    return paketKur({ userId: this.userId, islemler, donemler, duzenliler, ayarHam, ayarKesin: true, ekBozuk: bozuk });
  }

  private yay(): void {
    if (this.dinleyiciler.size === 0) return;
    let p: VeriPaketi;
    try {
      p = this.oku();
    } catch (e) {
      const h = veriHatasinaCevir(e);
      for (const d of this.dinleyiciler) d.hata(h);
      return;
    }
    for (const d of this.dinleyiciler) d.paket(p, META);
  }

  dinle(paket: Dinleyici["paket"], hata: Dinleyici["hata"]): () => void {
    const d: Dinleyici = { paket, hata };
    this.dinleyiciler.add(d);
    queueMicrotask(() => {
      if (!this.dinleyiciler.has(d)) return;
      try {
        paket(this.oku(), META);
      } catch (e) {
        hata(veriHatasinaCevir(e));
      }
    });
    return () => {
      this.dinleyiciler.delete(d);
    };
  }

  /** Eski davranış: yeni işlem ve dönem dizinin başına, düzenli ödeme sonuna eklenir. */
  private upsert(key: string, kayitlar: readonly { id: string; y: YazimVerisi }[], basaEkle: boolean): void {
    const { liste, bozukMetin } = this.diziOku(key);
    const yeni = [...liste];
    const eklenecek: unknown[] = [];
    for (const { id, y } of kayitlar) {
      const i = yeni.findIndex((o) => typeof o === "object" && o !== null && (o as { id?: unknown }).id === id);
      if (i >= 0) yeni[i] = hamBirlestir(yeni[i], y, id);
      else eklenecek.push(hamBirlestir(undefined, y, id));
    }
    this.yaz(key, basaEkle ? [...eklenecek, ...yeni] : [...yeni, ...eklenecek], bozukMetin);
  }

  private sil(key: string, ids: readonly string[]): void {
    const { liste, bozukMetin } = this.diziOku(key);
    if (bozukMetin !== null) return;
    const set = new Set(ids);
    const kalan = liste.filter(
      (o) => !(typeof o === "object" && o !== null && set.has((o as { id?: unknown }).id as string)),
    );
    if (kalan.length !== liste.length) this.yaz(key, kalan);
  }

  private async calistir(is: () => void): Promise<void> {
    is();
    this.yay();
  }

  islemYaz(tx: Transaction): Promise<void> {
    return this.islemleriYaz([tx]);
  }

  islemleriYaz(txs: readonly Transaction[]): Promise<void> {
    return this.calistir(() =>
      this.upsert(
        this.anahtar.transactions,
        txs.map((t) => ({ id: t.id, y: islemVerisi({ ...t, userId: this.userId }) })),
        true,
      ),
    );
  }

  islemleriSil(ids: readonly string[]): Promise<void> {
    return this.calistir(() => this.sil(this.anahtar.transactions, ids));
  }

  donemYaz(p: Period): Promise<void> {
    return this.calistir(() =>
      this.upsert(this.anahtar.periods, [{ id: p.id, y: donemVerisi({ ...p, userId: this.userId }) }], true),
    );
  }

  donemSil(id: string): Promise<void> {
    return this.calistir(() => this.sil(this.anahtar.periods, [id]));
  }

  duzenliYaz(r: Recurring): Promise<void> {
    return this.calistir(() =>
      this.upsert(this.anahtar.recurring, [{ id: r.id, y: duzenliVerisi({ ...r, userId: this.userId }) }], false),
    );
  }

  duzenliSil(id: string): Promise<void> {
    return this.calistir(() => this.sil(this.anahtar.recurring, [id]));
  }

  duzenliUret(create: readonly Transaction[], update: readonly ImlecGuncellemesi[]): Promise<void> {
    return this.calistir(() => {
      if (create.length > 0) {
        this.upsert(
          this.anahtar.transactions,
          create.map((t) => ({ id: t.id, y: islemVerisi({ ...t, userId: this.userId }) })),
          true,
        );
      }
      if (update.length > 0) {
        const { liste, bozukMetin } = this.diziOku(this.anahtar.recurring);
        const byId = new Map(update.map((u) => [u.id, u]));
        const yeni = liste.map((o) => {
          const id = typeof o === "object" && o !== null ? (o as { id?: unknown }).id : undefined;
          const u = typeof id === "string" ? byId.get(id) : undefined;
          return u ? { ...(o as object), nextDueDate: u.nextDueDate, lastProcessedDate: u.lastProcessedDate } : o;
        });
        this.yaz(this.anahtar.recurring, yeni, bozukMetin);
      }
    });
  }

  ayarlarYaz(yama: Record<string, unknown>): Promise<void> {
    return this.calistir(() => {
      const raw = this.depo.getItem(this.anahtar.settings);
      let kayitli: Record<string, unknown> = {};
      let bozukMetin: string | null = null;
      if (raw !== null) {
        try {
          const v = JSON.parse(raw) as unknown;
          if (typeof v === "object" && v !== null && !Array.isArray(v)) kayitli = v as Record<string, unknown>;
          else bozukMetin = raw;
        } catch {
          bozukMetin = raw;
        }
      }
      // Birleştirerek: Nova profili ve bilinmeyen alanlar silinmez.
      this.yaz(this.anahtar.settings, { ...kayitli, ...yama, userId: this.userId }, bozukMetin);
    });
  }

  /** Misafirin tüm verisini siler (hesap silme / misafir verisini temizle). */
  tumunuSil(): void {
    for (const k of Object.values(this.anahtar)) this.depo.removeItem(k);
    this.yay();
  }
}
