// Yerel takvim günü. "yyyy-MM-dd" metni olarak tutulur, hiçbir yerde UTC'ye çevrilmez.
// Gün aritmetiği tamsayı gün numarasıyla yapılır: saat dilimi ve yaz saati etkisi yoktur.

export type LocalDate = string & { readonly __brand: "LocalDate" };

export interface DateParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** month: 1-12 */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function pad(n: number, width: number): string {
  let s = String(n);
  while (s.length < width) s = "0" + s;
  return s;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function make(year: number, month: number, day: number): LocalDate {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as LocalDate;
}

/** Geçersiz günde hata fırlatır (programcı hatası). Kullanıcı girdisi için parseLocalDate. */
export function localDate(year: number, month: number, day: number): LocalDate {
  if (!isValidYmd(year, month, day)) {
    throw new RangeError(`Gecersiz tarih: ${year}-${month}-${day}`);
  }
  return make(year, month, day);
}

/** Biçim ve gerçek takvim günü denetimi. "2026-02-30" null döner. */
export function parseLocalDate(text: unknown): LocalDate | null {
  if (typeof text !== "string") return null;
  const m = DATE_RE.exec(text);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return isValidYmd(year, month, day) ? (text as LocalDate) : null;
}

export function isLocalDate(text: unknown): text is LocalDate {
  return parseLocalDate(text) !== null;
}

export function dateParts(d: LocalDate): DateParts {
  return {
    year: Number(d.slice(0, 4)),
    month: Number(d.slice(5, 7)),
    day: Number(d.slice(8, 10)),
  };
}

// 1970-01-01 = 0 olan gün numarası (proleptik Gregoryen, tamsayı aritmetik).
function toDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function fromDayNumber(n: number): LocalDate {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return make(year, month, day);
}

export function dayNumber(d: LocalDate): number {
  const p = dateParts(d);
  return toDayNumber(p.year, p.month, p.day);
}

/**
 * Bugünün yerel takvim günü.
 * timeZone verilmezse cihazın saat dilimi kullanılır. `toISOString` (UTC günü) kullanılmaz.
 */
export function today(timeZone?: string, now: Date = new Date()): LocalDate {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(now);
      let year = 0;
      let month = 0;
      let day = 0;
      for (const part of parts) {
        if (part.type === "year") year = Number(part.value);
        else if (part.type === "month") month = Number(part.value);
        else if (part.type === "day") day = Number(part.value);
      }
      if (isValidYmd(year, month, day)) return make(year, month, day);
    } catch {
      // Bilinmeyen saat dilimi: cihazın yerel gününe düş.
    }
  }
  return make(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(d: LocalDate, n: number): LocalDate {
  return fromDayNumber(dayNumber(d) + Math.trunc(n));
}

/** to - from, gün olarak. */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return dayNumber(to) - dayNumber(from);
}

/** İki uç dahil gün sayısı. to < from ise 0. */
export function daysInclusive(from: LocalDate, to: LocalDate): number {
  const n = diffDays(from, to) + 1;
  return n > 0 ? n : 0;
}

export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const a = dayNumber(from);
  const b = dayNumber(to);
  for (let n = a; n <= b; n++) out.push(fromDayNumber(n));
  return out;
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a <= b ? a : b;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}

/** 0 = Pazartesi ... 6 = Pazar */
export function weekdayIndex(d: LocalDate): number {
  // 1970-01-01 Perşembe (dizin 3).
  return (((dayNumber(d) + 3) % 7) + 7) % 7;
}

export function startOfWeek(d: LocalDate): LocalDate {
  return addDays(d, -weekdayIndex(d));
}

/** d'nin haftası: Pazartesi'den Pazar'a 7 gün. */
export function weekDays(d: LocalDate): LocalDate[] {
  const start = dayNumber(d) - weekdayIndex(d);
  const out: LocalDate[] = [];
  for (let i = 0; i < 7; i++) out.push(fromDayNumber(start + i));
  return out;
}

export function startOfMonth(d: LocalDate): LocalDate {
  const p = dateParts(d);
  return make(p.year, p.month, 1);
}

export function endOfMonth(d: LocalDate): LocalDate {
  const p = dateParts(d);
  return make(p.year, p.month, daysInMonth(p.year, p.month));
}

/**
 * Ay ekler, gün anchor'ın gününe sabitlenir, ay kısaysa ayın son günü.
 * Zincirleme değil: her zaman anchor'dan hesaplanır. 31 Oca +1 = 28 Şub, +2 = 31 Mar.
 */
export function addMonthsAnchored(anchor: LocalDate, n: number): LocalDate {
  const p = dateParts(anchor);
  const total = p.year * 12 + (p.month - 1) + Math.trunc(n);
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return make(year, month, Math.min(p.day, daysInMonth(year, month)));
}

/** 29 Şub +1 yıl = 28 Şub, +4 yıl = 29 Şub. */
export function addYearsAnchored(anchor: LocalDate, n: number): LocalDate {
  return addMonthsAnchored(anchor, Math.trunc(n) * 12);
}

export interface MonthGridCell {
  date: LocalDate;
  inMonth: boolean;
}

/** Pazartesi başlangıçlı ay ızgarası. Satır sayısı aya göre 4-6. month: 1-12 */
export function monthGrid(year: number, month: number): MonthGridCell[][] {
  const first = localDate(year, month, 1);
  const last = make(year, month, daysInMonth(year, month));
  const startN = dayNumber(first) - weekdayIndex(first);
  const endN = dayNumber(last) + (6 - weekdayIndex(last));
  const rows: MonthGridCell[][] = [];
  for (let n = startN; n <= endN; n += 7) {
    const row: MonthGridCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = fromDayNumber(n + i);
      row.push({ date, inMonth: date >= first && date <= last });
    }
    rows.push(row);
  }
  return rows;
}

export const MONTH_NAMES_TR: readonly string[] = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const MONTH_SHORT_TR: readonly string[] = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/** Dizin 0 = Pazartesi */
export const WEEKDAY_NAMES_TR: readonly string[] = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export const WEEKDAY_SHORT_TR: readonly string[] = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export type DateStyle = "long" | "short" | "numeric" | "dayMonth" | "monthYear";

/**
 * long "15 Kasım 2026", short "15 Kas", numeric "15.11.2026", dayMonth "15 Kasım", monthYear "Kasım 2026".
 * Intl kullanılmaz: çıktı her cihazda aynıdır.
 */
export function formatDateTr(d: LocalDate, style: DateStyle = "long"): string {
  const p = dateParts(d);
  const name = MONTH_NAMES_TR[p.month - 1] ?? "";
  switch (style) {
    case "short":
      return `${p.day} ${MONTH_SHORT_TR[p.month - 1] ?? ""}`;
    case "numeric":
      return `${pad(p.day, 2)}.${pad(p.month, 2)}.${p.year}`;
    case "dayMonth":
      return `${p.day} ${name}`;
    case "monthYear":
      return `${name} ${p.year}`;
    default:
      return `${p.day} ${name} ${p.year}`;
  }
}
