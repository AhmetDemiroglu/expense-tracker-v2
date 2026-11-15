// Yalnız testler için: bellek içi FirestorePort. merge ve deleteField anlamı SDK ile aynı.

import type { DokumanAnligi, FirestorePort, KoleksiyonAnligi, YazimIslemi } from "./firestoreRepo";

type Koleksiyonlar = Map<string, Map<string, Record<string, unknown>>>;

export interface SahteFirestore extends FirestorePort {
  veri: Koleksiyonlar;
  /** Her toplu yazımın işlem sayısı (sıra korunur) */
  topluBoyutlari: number[];
  yazimlar: YazimIslemi[];
  /** true: önbellekten yanıt ver (çevrimdışı) */
  cevrimdisi: boolean;
  /** Sonraki toplu yazımı bu hatayla reddet */
  reddet: unknown;
  /** Doluysa HER toplu yazımı reddet (kalıcı ret) */
  reddetKalici: unknown;
  /** toplu() çağrı sayısı (reddedilenler dahil) */
  cagri: number;
  koy(koleksiyon: string, id: string, veri: Record<string, unknown>): void;
  yay(): void;
}

export function sahteFirestore(): SahteFirestore {
  const veri: Koleksiyonlar = new Map();
  const dinleyiciler = new Set<() => void>();
  const kol = (k: string): Map<string, Record<string, unknown>> => {
    let m = veri.get(k);
    if (!m) {
      m = new Map();
      veri.set(k, m);
    }
    return m;
  };
  const s: SahteFirestore = {
    veri,
    topluBoyutlari: [],
    yazimlar: [],
    cevrimdisi: false,
    reddet: null,
    reddetKalici: null,
    cagri: 0,
    koy(k, id, v) {
      kol(k).set(id, v);
    },
    yay() {
      for (const d of dinleyiciler) d();
    },
    koleksiyonuDinle(k, userId, cb) {
      const f = (): void => {
        const a: KoleksiyonAnligi = {
          docs: [...kol(k).entries()].filter(([, v]) => v.userId === userId).map(([id, v]) => ({ id, veri: { ...v } })),
          fromCache: s.cevrimdisi,
          hasPendingWrites: false,
        };
        cb(a);
      };
      dinleyiciler.add(f);
      queueMicrotask(f);
      return () => dinleyiciler.delete(f);
    },
    dokumaniDinle(k, id, cb) {
      const f = (): void => {
        const v = kol(k).get(id);
        const a: DokumanAnligi = { exists: !!v, veri: v ? { ...v } : undefined, fromCache: s.cevrimdisi, hasPendingWrites: false };
        cb(a);
      };
      dinleyiciler.add(f);
      queueMicrotask(f);
      return () => dinleyiciler.delete(f);
    },
    async toplu(islemler) {
      s.cagri += 1;
      if (s.reddetKalici) {
        await new Promise((r) => setTimeout(r, 0));
        throw s.reddetKalici;
      }
      if (s.reddet) {
        const e = s.reddet;
        s.reddet = null;
        await new Promise((r) => setTimeout(r, 0)); // sunucu yanıtı gibi: sonraki görevde
        throw e;
      }
      if (islemler.length > 500) throw new Error("toplu yazım 500'ü aştı");
      s.topluBoyutlari.push(islemler.length);
      for (const i of islemler) {
        s.yazimlar.push(i);
        const m = kol(i.koleksiyon);
        if (i.tur === "sil") {
          m.delete(i.id);
          continue;
        }
        if (i.birlestir) {
          const eski = { ...(m.get(i.id) ?? {}) };
          for (const alan of i.silinecek ?? []) delete eski[alan];
          m.set(i.id, { ...eski, ...i.veri });
        } else {
          m.set(i.id, { ...i.veri });
        }
      }
      s.yay();
    },
  };
  return s;
}
