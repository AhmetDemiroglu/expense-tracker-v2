// Tek satır hızlı kayıt: "market 640", "640 market", "dün taksi 120,50". Saf kural, model çağrısı yok.

import { categoryType, type CategoryKey, type TxType } from "./category";
import { addDays, type LocalDate } from "./date";
import { parseAmount, type Kurus } from "./money";
import { trFold } from "./text";

export type DateHint = "today" | "yesterday" | "tomorrow";

export interface QuickEntry {
  /** Tutar bulunamadıysa null */
  amount: Kurus | null;
  type: TxType;
  /** Tahmin yoksa null (form "Diğer" önerir) */
  category: CategoryKey | null;
  description: string;
  date: LocalDate;
  dateHint: DateHint | null;
}

// Katlanmış (trFold) anahtar kelimeler. 3 harf ve altı yalnız tam eşleşir, uzunlar kelime başıyla eşleşir.
const KEYWORDS: ReadonlyArray<readonly [CategoryKey, readonly string[]]> = [
  ["maas", ["maas"]],
  ["ek_is", ["freelance", "ekis", "prim", "bonus", "ikramiye"]],
  ["yatirim_geliri", ["temettu", "faiz", "yatirim"]],
  ["diger_gelir", ["iade", "harclik", "burs"]],
  ["market", ["market", "migros", "bim", "a101", "sok", "carrefour", "bakkal", "manav", "kasap", "pazar", "firin", "ekmek", "sut", "gida", "alisveris"]],
  ["yeme_icme", ["yemek", "restoran", "lokanta", "kafe", "cafe", "kahve", "doner", "kebap", "pizza", "burger", "lahmacun", "corba", "tatli", "simit", "cay", "pide", "kahvalti", "yemeksepeti"]],
  ["toplu_tasima", ["otobus", "metro", "dolmus", "minibus", "vapur", "marmaray", "akbil", "istanbulkart", "kentkart", "tramvay", "taksi", "uber"]],
  ["arac_yakit", ["benzin", "mazot", "yakit", "akaryakit", "otopark", "lpg", "lastik", "hgs", "otoyol", "araba", "arac", "oto"]],
  ["kira", ["kira", "aidat"]],
  ["fatura", ["fatura", "elektrik", "dogalgaz", "su", "internet", "turkcell", "vodafone", "telekom"]],
  ["giyim", ["giyim", "kiyafet", "ayakkabi", "pantolon", "gomlek", "tisort", "mont", "elbise", "ceket", "corap", "canta"]],
  ["kozmetik", ["kozmetik", "parfum", "sampuan", "krem", "makyaj", "gratis", "watsons"]],
  ["saglik", ["eczane", "ilac", "doktor", "hastane", "muayene", "dis", "disci", "tahlil", "gozluk"]],
  ["spor", ["spor", "fitness", "pilates", "yoga", "halisaha"]],
  ["kuafor", ["kuafor", "berber", "sac", "tiras"]],
  ["ev_esyasi", ["mobilya", "ikea", "hali", "perde", "dekorasyon", "tencere", "nevresim"]],
  ["tamirat", ["tamir", "tadilat", "usta", "tesisat", "nalbur"]],
  ["egitim", ["kitap", "kurs", "okul", "kirtasiye", "egitim", "dershane", "defter"]],
  ["cocuk", ["bebek", "cocuk", "bez", "mama", "oyuncak", "kres"]],
  ["teknoloji", ["telefon", "bilgisayar", "laptop", "tablet", "kulaklik", "sarj", "kablo", "elektronik", "televizyon", "tv"]],
  ["abonelik", ["netflix", "spotify", "youtube", "abonelik", "uyelik", "disney", "exxen", "icloud"]],
  ["eglence", ["sinema", "konser", "tiyatro", "oyun", "eglence", "bowling", "hobi", "bar", "mac"]],
  ["tatil", ["tatil", "otel", "ucak", "seyahat", "bavul", "pansiyon"]],
  ["kredi_karti", ["ekstre", "kredikarti"]],
  ["borc", ["borc", "kredi"]],
  ["vergi", ["vergi", "harc", "mtv", "ceza", "pasaport"]],
];

// Çok kelimeli kalıplar tek kelimelerden önce denenir.
const PHRASES: ReadonlyArray<readonly [string, CategoryKey]> = [
  ["kredi karti", "kredi_karti"],
  ["kira geliri", "kira_geliri"],
  ["ek is", "ek_is"],
  ["ek gelir", "ek_is"],
  ["toplu tasima", "toplu_tasima"],
  ["ev esyasi", "ev_esyasi"],
  ["cep telefonu faturasi", "fatura"],
  ["telefon faturasi", "fatura"],
];

const DATE_WORDS: Record<string, { hint: DateHint; offset: number }> = {
  bugun: { hint: "today", offset: 0 },
  dun: { hint: "yesterday", offset: -1 },
  yarin: { hint: "tomorrow", offset: 1 },
};

const CURRENCY_WORDS = new Set(["tl", "lira", "try", "₺"]);

/** Açıklamadan kategori tahmini. Eşleşme yoksa null. */
export function guessCategory(text: string): CategoryKey | null {
  const folded = trFold(text);
  if (folded === "") return null;
  const padded = ` ${folded} `;
  for (const [phrase, key] of PHRASES) {
    if (padded.includes(` ${phrase} `)) return key;
  }
  let best: { key: CategoryKey; score: number } | null = null;
  for (const token of folded.split(" ")) {
    for (const [key, stems] of KEYWORDS) {
      for (const stem of stems) {
        let score = 0;
        if (token === stem) score = 100 + stem.length;
        else if (stem.length > 3 && token.startsWith(stem)) score = stem.length;
        if (score > 0 && (best === null || score > best.score)) best = { key, score };
      }
    }
  }
  return best ? best.key : null;
}

function capitalizeTr(text: string): string {
  if (text === "") return text;
  const first = text.charAt(0);
  const upper = first === "i" ? "İ" : first === "ı" ? "I" : first.toUpperCase();
  return upper + text.slice(1);
}

/**
 * Tek satırdan tutar, kategori tahmini ve tarih ipucu çıkarır.
 * Birden çok sayı varsa para birimi ekli olan, yoksa sondaki tutardır ("2 ekmek 30" -> 30).
 */
export function parseQuickEntry(text: string, today: LocalDate): QuickEntry {
  const tokens = text.trim().split(/\s+/).filter((t) => t !== "");
  let dateHint: DateHint | null = null;
  let date = today;
  const used = new Set<number>();

  tokens.forEach((token, i) => {
    const word = DATE_WORDS[trFold(token)];
    if (word && dateHint === null) {
      dateHint = word.hint;
      date = addDays(today, word.offset);
      used.add(i);
    }
  });

  let amount: Kurus | null = null;
  let amountIndex = -1;
  let marked = false;
  let plus = false;
  tokens.forEach((token, i) => {
    if (used.has(i) || !/\d/.test(token)) return;
    const r = parseAmount(token);
    if (!r.ok) return;
    const next = tokens[i + 1];
    const hasMark = /[₺]|tl$|lira$/i.test(token) || (next !== undefined && CURRENCY_WORDS.has(trFold(next) || next));
    if (hasMark && !marked) {
      marked = true;
      amount = r.kurus;
      amountIndex = i;
      plus = token.startsWith("+");
    } else if (!marked) {
      amount = r.kurus;
      amountIndex = i;
      plus = token.startsWith("+");
    }
  });
  if (amountIndex >= 0) {
    used.add(amountIndex);
    const next = tokens[amountIndex + 1];
    if (next !== undefined && CURRENCY_WORDS.has(trFold(next) || next)) used.add(amountIndex + 1);
  }

  const rest = tokens.filter((_, i) => !used.has(i)).join(" ");
  const category = guessCategory(rest);
  const type: TxType = category ? categoryType(category) : plus ? "income" : "expense";

  return {
    amount,
    type,
    category: category ?? (plus ? "diger_gelir" : null),
    description: capitalizeTr(rest),
    date,
    dateHint,
  };
}
