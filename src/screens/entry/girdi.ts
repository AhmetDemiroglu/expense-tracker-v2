/* Kayıt formunun saf mantığı (DOM yok, testli). Hesap çekirdekten gelir: burada yalnız form -> kayıt eşlemesi var. */
import {
  CATEGORIES,
  MONTH_NAMES_TR,
  addDays,
  buildInstallmentPlan,
  categoryLabel,
  categoryType,
  dateParts,
  isPlannedAtEntry,
  parseAmount,
  type CategoryKey,
  type Kurus,
  type LocalDate,
  type Transaction,
  type TxType,
} from "@/core";
import type { FisSonucu } from "@/services/ai";

export interface FormDurumu {
  tur: TxType;
  /** Tuş takımı biçimi: "1234,5" */
  tutarMetni: string;
  kategori: CategoryKey | null;
  tarih: LocalDate;
  not: string;
  /** 1-36 (yalnız yeni gider) */
  taksit: number;
}

export type KaydetHatasi = "tutar" | "kategori" | "taksitTutar";

export type KaydetSonucu =
  | { ok: false; hata: KaydetHatasi; neden?: "empty" | "invalid" | "zero" | "negative" | "too_large" }
  | { ok: true; tur: "yeni"; islem: Omit<Transaction, "id" | "userId" | "createdAt"> }
  | { ok: true; tur: "taksit"; liste: Transaction[] }
  | { ok: true; tur: "guncelle"; islem: Transaction };

export interface KaydetBaglami {
  bugun: LocalDate;
  userId: string;
  now: number;
  idUret: () => string;
  /** Düzenlenen kayıt (yoksa yeni). */
  onceki?: Transaction | undefined;
}

export const ACIKLAMA_SINIRI = 200;

/** Planlı gider kuralı (çekirdek sözleşme sürüm 3). Gelirde asla. */
function planliAlani(tur: TxType, tarih: LocalDate, bugun: LocalDate): { planned?: true } {
  return tur === "expense" && isPlannedAtEntry(tarih, bugun) ? { planned: true } : {};
}

export function formuKaydaCevir(f: FormDurumu, c: KaydetBaglami): KaydetSonucu {
  const tutar = parseAmount(f.tutarMetni);
  if (!tutar.ok) return { ok: false, hata: "tutar", neden: tutar.reason };
  if (!f.kategori) return { ok: false, hata: "kategori" };
  const aciklama = f.not.trim().slice(0, ACIKLAMA_SINIRI);

  if (c.onceki) {
    const o = c.onceki;
    const sonraki: Transaction = { ...o, amount: tutar.kurus, type: f.tur, category: f.kategori, date: f.tarih, description: aciklama };
    delete sonraki.planned;
    if (f.tur === "expense") {
      if (f.tarih !== o.date) Object.assign(sonraki, planliAlani("expense", f.tarih, c.bugun));
      else if (o.planned) sonraki.planned = true;
    }
    return { ok: true, tur: "guncelle", islem: sonraki };
  }

  if (f.tur === "expense" && f.taksit > 1) {
    if (tutar.kurus < f.taksit) return { ok: false, hata: "taksitTutar" };
    const grup = c.idUret();
    const liste = buildInstallmentPlan({
      userId: c.userId,
      description: aciklama || categoryLabel(f.kategori),
      category: f.kategori,
      total: tutar.kurus,
      count: f.taksit,
      firstDate: f.tarih,
      groupId: grup,
      idFor: () => c.idUret(),
      now: c.now,
      today: c.bugun,
    });
    return { ok: true, tur: "taksit", liste };
  }

  return {
    ok: true,
    tur: "yeni",
    islem: { amount: tutar.kurus, type: f.tur, category: f.kategori, date: f.tarih, description: aciklama, ...planliAlani(f.tur, f.tarih, c.bugun) },
  };
}

export interface TaksitOnizleme {
  adet: number;
  ilkTutar: Kurus;
  /** Tüm taksitler eşitse true ("6 x 500"), değilse ilk taksit biraz büyüktür */
  esit: boolean;
  sonAy: string;
  sonYil: number;
}

/** Taksit planı önizlemesi: çekirdeğin planından okunur (ekranda bölme yok). Geçersizse null. */
export function taksitOnizle(kurus: Kurus | null, adet: number, ilkTarih: LocalDate): TaksitOnizleme | null {
  if (kurus === null || adet < 2 || kurus < adet) return null;
  const plan = buildInstallmentPlan({
    userId: "", description: "x", category: "diger", total: kurus, count: adet, firstDate: ilkTarih, groupId: "g", idFor: (i) => String(i), now: 0,
  });
  const ilk = plan[0];
  const son = plan[plan.length - 1];
  if (!ilk || !son) return null;
  const p = dateParts(son.date);
  return { adet, ilkTutar: ilk.amount, esit: plan.every((t) => t.amount === ilk.amount), sonAy: MONTH_NAMES_TR[p.month - 1] ?? "", sonYil: p.year };
}

/** Son kullanılan kategoriler önde, kalan boşluk kategori sırasıyla dolar. `islemler` tarihe göre yeniden eskiye gelir. */
export function onerilenKategoriler(islemler: readonly Transaction[], tur: TxType, adet = 6): CategoryKey[] {
  const sonuc: CategoryKey[] = [];
  for (const t of islemler) {
    if (t.type !== tur || sonuc.includes(t.category)) continue;
    sonuc.push(t.category);
    if (sonuc.length >= adet) return sonuc;
  }
  for (const k of CATEGORIES) {
    if (k.type !== tur || sonuc.includes(k.key)) continue;
    sonuc.push(k.key);
    if (sonuc.length >= adet) break;
  }
  return sonuc;
}

export interface FisFormu {
  fisMi: boolean;
  tutarMetni: string;
  not: string;
  tarih: LocalDate;
  kategori: CategoryKey | null;
  tarihOkunamadi: boolean;
  tutarOkunamadi: boolean;
  dusukGuven: boolean;
}

export const DUSUK_GUVEN = 0.6;

/** Fiş okuma sonucu -> form alanları. Fiş gider sayılır. Tarih okunamadıysa bugün seçili kalır ve belirtilir. */
export function fisiFormaCevir(f: FisSonucu, bugun: LocalDate, formatTutar: (k: Kurus) => string): FisFormu {
  return {
    fisMi: f.fisMi,
    tutarMetni: f.toplam !== null ? formatTutar(f.toplam) : "",
    not: f.isletme ?? "",
    tarih: f.tarih ?? bugun,
    kategori: f.fisMi ? f.kategori : null,
    tarihOkunamadi: f.fisMi && f.tarih === null,
    tutarOkunamadi: f.fisMi && f.toplam === null,
    dusukGuven: f.fisMi && f.guven < DUSUK_GUVEN,
  };
}

/** Kısayol tarihleri (bugün, dün). */
export function hizliTarihler(bugun: LocalDate): { bugun: LocalDate; dun: LocalDate } {
  return { bugun, dun: addDays(bugun, -1) };
}

export function turunKategorisi(kategori: CategoryKey | null, tur: TxType): CategoryKey | null {
  return kategori && categoryType(kategori) === tur ? kategori : null;
}
