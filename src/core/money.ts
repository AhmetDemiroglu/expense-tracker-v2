// Para: tamsayı kuruş. Firestore'da tutar TL ondalık kalır, dönüşüm yalnız burada yapılır.

/** Tamsayı kuruş. 12.480,50 TL = 1248050 */
export type Kurus = number;

/** 999.999.999,99 TL */
export const MAX_AMOUNT_KURUS: Kurus = 99_999_999_999;

function clean(n: number): number {
  return n === 0 ? 0 : n; // -0 yok
}

/**
 * Firestore'daki TL ondalık sayıyı kuruşa çevirir (en yakın kuruş).
 * NaN, Infinity ve sayı olmayan değerler için null.
 */
export function kurusFromTl(tl: unknown): Kurus | null {
  let n: number;
  if (typeof tl === "number") {
    n = tl;
  } else if (typeof tl === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(tl)) {
    n = Number(tl);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs * 100 > Number.MAX_SAFE_INTEGER) return null;
  // toFixed ondalık gösterimden yuvarlar: 1.005 gibi ikili kesir hatalarında da kararlı.
  const k = Math.round(Number((abs * 100).toFixed(4)));
  return clean(n < 0 ? -k : k);
}

/** Kuruşu Firestore'a yazılacak TL ondalık sayıya çevirir. */
export function tlFromKurus(k: Kurus): number {
  return clean(Math.round(k) / 100);
}

export function isValidAmount(k: unknown): k is Kurus {
  return typeof k === "number" && Number.isInteger(k) && k > 0 && k <= MAX_AMOUNT_KURUS;
}

export function sumKurus(list: readonly Kurus[]): Kurus {
  let total = 0;
  for (const k of list) total += k;
  return total;
}

/** Toplamı eşit böler, artan kuruş ilk parçalara birer birer eklenir. Σ = total. */
export function splitEvenly(total: Kurus, parts: number): Kurus[] {
  const n = Math.max(1, Math.trunc(parts));
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(total));
  const base = Math.floor(abs / n);
  const extra = abs - base * n;
  const out: Kurus[] = [];
  for (let i = 0; i < n; i++) out.push(clean(sign * (base + (i < extra ? 1 : 0))));
  return out;
}

/** Tam sayı yüzde (en yakına). whole <= 0 ise null. */
export function percentOf(part: Kurus, whole: Kurus): number | null {
  if (!(whole > 0) || !Number.isFinite(part)) return null;
  const v = (Math.abs(part) * 100) / whole;
  const r = Math.floor(v + 0.5);
  return clean(part < 0 ? -r : r);
}

/**
 * Tutarın yüzdesi, tamsayı kuruş: percentage(80.000 kuruş, 15) = 12.000 kuruş.
 * En yakın kuruşa yuvarlar, yarım sıfırdan uzağa (percentOf ile aynı kural). Kesirli yüzde (12,5) kabul.
 * Sonlu olmayan girdi 0 döner. Sınırlama yapmaz: 100 üstü ve negatif yüzde olduğu gibi hesaplanır.
 */
export function percentage(whole: Kurus, percent: number): Kurus {
  if (!Number.isFinite(whole) || !Number.isFinite(percent)) return 0;
  const v = (Math.abs(whole) * Math.abs(percent)) / 100;
  if (!Number.isFinite(v)) return 0;
  const r = Math.floor(Number(v.toFixed(6)) + 0.5);
  return clean(whole < 0 !== percent < 0 ? -r : r);
}

export type ParseAmountFailure = "empty" | "invalid" | "zero" | "negative" | "too_large";
export type ParseAmountResult =
  | { ok: true; kurus: Kurus }
  | { ok: false; reason: ParseAmountFailure };

const fail = (reason: ParseAmountFailure): ParseAmountResult => ({ ok: false, reason });

/**
 * Türkçe tutar girişi. Kabul: "1.234,56", "1234,5", "640", "12,5 tl", "₺640", "1 234,56", "12.5", "1,234.56".
 * Virgül ondalıktır. Tek nokta: ardında tam 3 hane varsa binlik, 1-2 hane varsa ondalık.
 * 2'den fazla ondalık hane, harf, 0 ve negatif reddedilir.
 */
export function parseAmount(text: string): ParseAmountResult {
  if (typeof text !== "string") return fail("invalid");
  let s = text.toLowerCase().replace(/\s/g, "");
  if (s === "") return fail("empty");
  s = s.replace(/^(₺|tl|try)/, "").replace(/(₺|tl|try|lira)$/, "");
  let negative = false;
  if (s.startsWith("-") || s.startsWith("\u2212")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  s = s.replace(/^₺/, "");
  if (s === "") return fail("empty");
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return fail("invalid");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let fracPart = "";

  const grouped = (value: string, sep: string): string | null => {
    const re = sep === "." ? /^\d{1,3}(\.\d{3})+$/ : /^\d{1,3}(,\d{3})+$/;
    return re.test(value) ? value.split(sep).join("") : null;
  };

  if (lastComma >= 0 && lastDot >= 0) {
    // Sonda olan ondalık ayırıcıdır, öteki binlik.
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    const pos = Math.max(lastComma, lastDot);
    const head = s.slice(0, pos);
    fracPart = s.slice(pos + 1);
    if (head.includes(decSep) || fracPart.includes(thouSep)) return fail("invalid");
    const g = grouped(head, thouSep);
    if (g === null) return fail("invalid");
    intPart = g;
  } else if (lastComma >= 0) {
    if (s.indexOf(",") === lastComma) {
      intPart = s.slice(0, lastComma);
      fracPart = s.slice(lastComma + 1);
    } else {
      const g = grouped(s, ",");
      if (g === null) return fail("invalid");
      intPart = g;
    }
  } else if (lastDot >= 0) {
    if (s.indexOf(".") === lastDot) {
      const head = s.slice(0, lastDot);
      const tail = s.slice(lastDot + 1);
      if (tail.length === 3 && /^[1-9]\d{0,2}$/.test(head)) {
        intPart = head + tail; // "1.234" binlik
      } else {
        intPart = head; // "12.5" ondalık
        fracPart = tail;
      }
    } else {
      const g = grouped(s, ".");
      if (g === null) return fail("invalid");
      intPart = g;
    }
  } else {
    intPart = s;
  }

  if (fracPart.length > 2) return fail("invalid");
  if (intPart === "" && fracPart === "") return fail("invalid");
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || (fracPart !== "" && !/^\d+$/.test(fracPart))) return fail("invalid");
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart.length > 9) return fail("too_large");

  const kurus = Number(intPart) * 100 + Number((fracPart + "00").slice(0, 2));
  if (kurus === 0) return fail("zero");
  if (negative) return fail("negative");
  if (kurus > MAX_AMOUNT_KURUS) return fail("too_large");
  return { ok: true, kurus };
}

function groupThousands(digits: string): string {
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits.charAt(i);
  }
  return out;
}

export interface FormatMoneyOptions {
  /** Kuruş hanesi. Varsayılan true. false: en yakın liraya yuvarlar. */
  decimals?: boolean;
  /** auto: yalnız negatifte "-". always: pozitifte "+". never: işaret yok. */
  sign?: "auto" | "always" | "never";
}

/**
 * "₺12.480,50", "-₺500,00", "+₺640,00", kuruşsuz "₺12.481".
 * toLocaleString kullanılmaz: çıktı her cihazda aynıdır.
 */
export function formatMoney(k: Kurus, opts: FormatMoneyOptions = {}): string {
  const decimals = opts.decimals !== false;
  const signMode = opts.sign ?? "auto";
  const value = Number.isFinite(k) ? Math.round(k) : 0;
  const abs = Math.abs(value);
  let body: string;
  let shownZero: boolean;
  if (decimals) {
    const lira = Math.floor(abs / 100);
    const kr = abs - lira * 100;
    body = `${groupThousands(String(lira))},${kr < 10 ? "0" : ""}${kr}`;
    shownZero = abs === 0;
  } else {
    const lira = Math.floor((abs + 50) / 100);
    body = groupThousands(String(lira));
    shownZero = lira === 0;
  }
  let sign = "";
  if (!shownZero && signMode !== "never") {
    if (value < 0) sign = "-";
    else if (signMode === "always") sign = "+";
  }
  return `${sign}₺${body}`;
}

/** Düzenleme alanı için: "1234,56", "640", "12,50". Binlik ayırıcı ve simge yok. */
export function formatAmountInput(k: Kurus): string {
  const value = Number.isFinite(k) ? Math.abs(Math.round(k)) : 0;
  const lira = Math.floor(value / 100);
  const kr = value - lira * 100;
  return kr === 0 ? String(lira) : `${lira},${kr < 10 ? "0" : ""}${kr}`;
}
