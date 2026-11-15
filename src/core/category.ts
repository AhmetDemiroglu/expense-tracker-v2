// Kategoriler sabit anahtarla tutulur. Firestore'a eski sürümün görünen adı (legacyName) yazılır.

import { trFold } from "./text";

export type TxType = "income" | "expense";

export type IncomeCategoryKey = "maas" | "ek_is" | "yatirim_geliri" | "kira_geliri" | "diger_gelir";

export type ExpenseCategoryKey =
  | "market"
  | "yeme_icme"
  | "toplu_tasima"
  | "arac_yakit"
  | "kira"
  | "fatura"
  | "giyim"
  | "kozmetik"
  | "saglik"
  | "spor"
  | "kuafor"
  | "ev_esyasi"
  | "tamirat"
  | "egitim"
  | "cocuk"
  | "teknoloji"
  | "abonelik"
  | "eglence"
  | "tatil"
  | "kredi_karti"
  | "borc"
  | "vergi"
  | "diger";

export type CategoryKey = IncomeCategoryKey | ExpenseCategoryKey;

export type CategoryGroup = "gelir" | "temel" | "yasam" | "ev" | "keyif" | "finans";

export interface CategoryDef {
  key: CategoryKey;
  type: TxType;
  /** Yeni arayüzde görünen ad */
  label: string;
  /** Eski sürümün enum değeri: Firestore'a bu yazılır */
  legacyName: string;
  group: CategoryGroup;
}

const def = (
  key: CategoryKey,
  type: TxType,
  group: CategoryGroup,
  label: string,
  legacyName: string,
): CategoryDef => ({ key, type, group, label, legacyName });

export const CATEGORIES: readonly CategoryDef[] = [
  def("maas", "income", "gelir", "Maaş", "Maaş"),
  def("ek_is", "income", "gelir", "Ek İş", "Freelance / Ek İş"),
  def("yatirim_geliri", "income", "gelir", "Yatırım Geliri", "Yatırım Geliri"),
  def("kira_geliri", "income", "gelir", "Kira Geliri", "Kira Geliri"),
  def("diger_gelir", "income", "gelir", "Diğer Gelir", "Diğer Gelir"),

  def("market", "expense", "temel", "Market", "Market & Pazar"),
  def("yeme_icme", "expense", "temel", "Yeme İçme", "Yeme & İçme (Restoran vb.)"),
  def("toplu_tasima", "expense", "temel", "Toplu Taşıma", "Toplu Taşıma"),
  def("arac_yakit", "expense", "temel", "Araç ve Yakıt", "Araç & Yakıt"),
  def("kira", "expense", "temel", "Kira ve Aidat", "Kira & Aidat"),
  def("fatura", "expense", "temel", "Faturalar", "Faturalar"),

  def("giyim", "expense", "yasam", "Giyim", "Giyim & Aksesuar"),
  def("kozmetik", "expense", "yasam", "Kişisel Bakım", "Kozmetik & Bakım"),
  def("saglik", "expense", "yasam", "Sağlık", "Sağlık & İlaç"),
  def("spor", "expense", "yasam", "Spor", "Spor & Üyelik"),
  def("kuafor", "expense", "yasam", "Kuaför", "Kuaför & Berber"),

  def("ev_esyasi", "expense", "ev", "Ev Eşyası", "Ev Eşyası & Dekorasyon"),
  def("tamirat", "expense", "ev", "Tamirat", "Tamirat & Tadilat"),
  def("egitim", "expense", "ev", "Eğitim", "Eğitim & Kitap"),
  def("cocuk", "expense", "ev", "Çocuk", "Çocuk & Bebek"),

  def("teknoloji", "expense", "keyif", "Teknoloji", "Teknoloji & Elektronik"),
  def("abonelik", "expense", "keyif", "Abonelikler", "Abonelikler"),
  def("eglence", "expense", "keyif", "Eğlence", "Eğlence & Hobi"),
  def("tatil", "expense", "keyif", "Tatil", "Tatil & Seyahat"),

  def("kredi_karti", "expense", "finans", "Kredi Kartı", "Kredi Kartı Ödemesi"),
  def("borc", "expense", "finans", "Borç ve Kredi", "Borç / Kredi Ödemesi"),
  def("vergi", "expense", "finans", "Vergi", "Vergi & Harçlar"),
  def("diger", "expense", "finans", "Diğer", "Diğer Gider"),
];

export const INCOME_CATEGORIES: readonly CategoryDef[] = CATEGORIES.filter((c) => c.type === "income");
export const EXPENSE_CATEGORIES: readonly CategoryDef[] = CATEGORIES.filter((c) => c.type === "expense");

const BY_KEY = new Map<string, CategoryDef>(CATEGORIES.map((c) => [c.key, c]));

export function isCategoryKey(x: unknown): x is CategoryKey {
  return typeof x === "string" && BY_KEY.has(x);
}

export function categoryDef(key: CategoryKey): CategoryDef {
  const found = BY_KEY.get(key);
  if (!found) throw new RangeError(`Bilinmeyen kategori: ${String(key)}`);
  return found;
}

export function categoryLabel(key: CategoryKey): string {
  return categoryDef(key).label;
}

/** Firestore'a yazılacak eski görünen ad. */
export function categoryLegacyName(key: CategoryKey): string {
  return categoryDef(key).legacyName;
}

export function categoryType(key: CategoryKey): TxType {
  return categoryDef(key).type;
}

// Eski metin -> anahtar. Anahtarlar trFold ile katlanmış haldedir.
// Kaynaklar: asıl enum (eski types.ts), demo verisi (demoService), eski Gemini fiş okuma, Groq fiş okuma.
const ALIASES: ReadonlyArray<readonly [string, CategoryKey]> = [
  // demo verisi
  ["Konut & Kira", "kira"],
  ["Gıda & Market", "market"],
  ["Ulaşım", "toplu_tasima"],
  ["Eğlence", "eglence"],
  ["Giyim", "giyim"],
  // eski Gemini fiş okuma listesi ve şema açıklaması
  ["Yeme & İçme", "yeme_icme"],
  ["Ev & Yaşam", "ev_esyasi"],
  ["Teknoloji", "teknoloji"],
  ["Sağlık", "saglik"],
  ["Eğitim", "egitim"],
  ["Gıda", "market"],
  ["Fatura", "fatura"],
  // yaygın kısaltmalar
  ["Market", "market"],
  ["Kira", "kira"],
  ["Aidat", "kira"],
  ["Restoran", "yeme_icme"],
  ["Yemek", "yeme_icme"],
  ["Yakıt", "arac_yakit"],
  ["Akaryakıt", "arac_yakit"],
  ["Abonelik", "abonelik"],
  ["Kozmetik", "kozmetik"],
  ["Spor", "spor"],
  ["Tatil", "tatil"],
  ["Seyahat", "tatil"],
  ["Vergi", "vergi"],
  ["Kredi Kartı", "kredi_karti"],
  ["Freelance", "ek_is"],
  ["Ek Gelir", "ek_is"],
];

const LEGACY_MAP: Map<string, CategoryKey> = (() => {
  const map = new Map<string, CategoryKey>();
  for (const [text, key] of ALIASES) map.set(trFold(text), key);
  // Asıl liste en son: çakışmada enum değeri kazanır.
  for (const c of CATEGORIES) {
    map.set(trFold(c.label), c.key);
    map.set(trFold(c.key), c.key);
    map.set(trFold(c.legacyName), c.key);
  }
  return map;
})();

/**
 * Eski kayıttaki kategori metnini anahtara çevirir.
 * "Diğer" ve bilinmeyen metin türe göre `diger` ya da `diger_gelir` olur.
 */
export function categoryFromLegacy(text: unknown, type: TxType): CategoryKey {
  const fallback: CategoryKey = type === "income" ? "diger_gelir" : "diger";
  if (typeof text !== "string") return fallback;
  if (BY_KEY.has(text)) return text as CategoryKey;
  const folded = trFold(text);
  if (folded === "" || folded === "diger") return fallback;
  return LEGACY_MAP.get(folded) ?? fallback;
}
