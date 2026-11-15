// Hesaplı kullanıcı deposu. Firestore'a ince bir "port" üzerinden erişir: testte sahte port, uygulamada SDK.
// Koleksiyonlar ve alan adları eski sürümle aynı. Sorgu yalnız `where userId ==`: orderBy alanı olmayan
// eski dokümanı sessizce düşürürdü, sıralama bellekte yapılır.

import type { Period, Recurring, Transaction } from "@/core";
import { veriHatasinaCevir, type UygulamaHatasi } from "../hatalar";
import { donemVerisi, duzenliVerisi, islemVerisi, paketKur, type HamDokuman, type YazimVerisi } from "./esleme";
import type { ImlecGuncellemesi, PaketMeta, Repository, VeriPaketi } from "./tipler";

export const KOLEKSIYON = {
  islem: "transactions",
  donem: "budget_periods",
  duzenli: "recurring_transactions",
  ayar: "settings",
} as const;

export interface KoleksiyonAnligi {
  docs: HamDokuman[];
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface DokumanAnligi {
  exists: boolean;
  veri: unknown;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export type YazimIslemi =
  | {
      tur: "set";
      koleksiyon: string;
      id: string;
      veri: Record<string, unknown>;
      /** true: birleştir. silinecek alanlar deleteField() ile kaldırılır. */
      birlestir: boolean;
      silinecek?: readonly string[];
    }
  | { tur: "sil"; koleksiyon: string; id: string };

export interface FirestorePort {
  koleksiyonuDinle(
    koleksiyon: string,
    userId: string,
    cb: (a: KoleksiyonAnligi) => void,
    hata: (e: unknown) => void,
  ): () => void;
  dokumaniDinle(koleksiyon: string, id: string, cb: (a: DokumanAnligi) => void, hata: (e: unknown) => void): () => void;
  /** Tek toplu yazım (en fazla 500 işlem). Sunucu onayında çözülür. */
  toplu(islemler: readonly YazimIslemi[]): Promise<void>;
}

/** Firestore toplu yazım sınırı */
export const TOPLU_SINIR = 500;

export function parcala<T>(liste: readonly T[], boyut: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < liste.length; i += boyut) out.push(liste.slice(i, i + boyut));
  return out;
}

function setIslemi(koleksiyon: string, id: string, y: YazimVerisi): YazimIslemi {
  return { tur: "set", koleksiyon, id, veri: y.veri, birlestir: true, silinecek: y.silinecek };
}

export class FirestoreRepo implements Repository {
  readonly tur = "firestore" as const;
  readonly userId: string;
  private readonly port: FirestorePort;

  constructor(userId: string, port: FirestorePort) {
    this.userId = userId;
    this.port = port;
  }

  dinle(paket: (p: VeriPaketi, m: PaketMeta) => void, hata: (e: UygulamaHatasi) => void): () => void {
    let islemler: KoleksiyonAnligi | null = null;
    let donemler: KoleksiyonAnligi | null = null;
    let duzenliler: KoleksiyonAnligi | null = null;
    let ayar: DokumanAnligi | null = null;
    let bitti = false;

    const yay = (): void => {
      if (bitti || !islemler || !donemler || !duzenliler || !ayar) return;
      const p = paketKur({
        userId: this.userId,
        islemler: islemler.docs,
        donemler: donemler.docs,
        duzenliler: duzenliler.docs,
        ayarHam: ayar.exists ? ayar.veri : undefined,
        // "yok" kararı yalnız sunucu doğruladıysa: çevrimdışı boş önbellek kurulum ekranı açtırmaz.
        ayarKesin: !ayar.fromCache,
      });
      const hepsi = [islemler, donemler, duzenliler, ayar];
      paket(p, {
        onbellektenMi: hepsi.some((a) => a.fromCache),
        bekleyenYazim: hepsi.some((a) => a.hasPendingWrites),
      });
    };
    const hataVer = (e: unknown): void => {
      if (bitti) return;
      hata(veriHatasinaCevir(e));
    };

    const birak = [
      this.port.koleksiyonuDinle(KOLEKSIYON.islem, this.userId, (a) => ((islemler = a), yay()), hataVer),
      this.port.koleksiyonuDinle(KOLEKSIYON.donem, this.userId, (a) => ((donemler = a), yay()), hataVer),
      this.port.koleksiyonuDinle(KOLEKSIYON.duzenli, this.userId, (a) => ((duzenliler = a), yay()), hataVer),
      this.port.dokumaniDinle(KOLEKSIYON.ayar, this.userId, (a) => ((ayar = a), yay()), hataVer),
    ];
    return () => {
      bitti = true;
      for (const f of birak) f();
    };
  }

  private async yazParcali(islemler: readonly YazimIslemi[]): Promise<void> {
    try {
      for (const p of parcala(islemler, TOPLU_SINIR)) await this.port.toplu(p);
    } catch (e) {
      throw veriHatasinaCevir(e);
    }
  }

  private islemSet(t: Transaction): YazimIslemi {
    return setIslemi(KOLEKSIYON.islem, t.id, islemVerisi({ ...t, userId: this.userId }));
  }

  islemYaz(tx: Transaction): Promise<void> {
    return this.yazParcali([this.islemSet(tx)]);
  }

  islemleriYaz(txs: readonly Transaction[]): Promise<void> {
    return this.yazParcali(txs.map((t) => this.islemSet(t)));
  }

  islemleriSil(ids: readonly string[]): Promise<void> {
    return this.yazParcali(ids.map((id) => ({ tur: "sil", koleksiyon: KOLEKSIYON.islem, id })));
  }

  donemYaz(p: Period): Promise<void> {
    return this.yazParcali([setIslemi(KOLEKSIYON.donem, p.id, donemVerisi({ ...p, userId: this.userId }))]);
  }

  donemSil(id: string): Promise<void> {
    return this.yazParcali([{ tur: "sil", koleksiyon: KOLEKSIYON.donem, id }]);
  }

  duzenliYaz(r: Recurring): Promise<void> {
    return this.yazParcali([setIslemi(KOLEKSIYON.duzenli, r.id, duzenliVerisi({ ...r, userId: this.userId }))]);
  }

  duzenliSil(id: string): Promise<void> {
    return this.yazParcali([{ tur: "sil", koleksiyon: KOLEKSIYON.duzenli, id }]);
  }

  async duzenliUret(create: readonly Transaction[], update: readonly ImlecGuncellemesi[]): Promise<void> {
    // Önce işlemler (kimlik deterministik: yarıda kalırsa yeniden denenir, çift kayıt olmaz), sonra imleçler.
    await this.yazParcali(create.map((t) => this.islemSet(t)));
    await this.yazParcali(
      update.map((u) => ({
        tur: "set",
        koleksiyon: KOLEKSIYON.duzenli,
        id: u.id,
        veri: { userId: this.userId, nextDueDate: u.nextDueDate, lastProcessedDate: u.lastProcessedDate },
        birlestir: true,
      })),
    );
  }

  ayarlarYaz(yama: Record<string, unknown>): Promise<void> {
    // userId HER yazımda (kural). merge: Nova profili ve eski alanlar silinmez.
    return this.yazParcali([
      { tur: "set", koleksiyon: KOLEKSIYON.ayar, id: this.userId, veri: { ...yama, userId: this.userId }, birlestir: true },
    ]);
  }
}
