// Dönem: başlangıç ve bitiş günleri dahil.

import {
  addDays,
  addMonthsAnchored,
  dateParts,
  daysInclusive,
  daysInMonth,
  diffDays,
  formatDateTr,
  localDate,
  maxDate,
  type LocalDate,
} from "./date";
import type { ActivePeriodCopy, Period, PeriodBudget, PeriodRange, Transaction } from "./model";
import type { Kurus } from "./money";

export type PeriodPhase = "before" | "active" | "ended";

export function isInPeriod(p: PeriodRange, d: LocalDate): boolean {
  return d >= p.start && d <= p.end;
}

/** Dahil gün sayısı. Bitiş başlangıçtan önceyse 0. */
export function periodDays(p: PeriodRange): number {
  return daysInclusive(p.start, p.end);
}

/** max(day, start)..end arası dahil gün sayısı. day > end ise 0. */
export function remainingDays(p: PeriodRange, day: LocalDate): number {
  return daysInclusive(maxDate(day, p.start), p.end);
}

export function periodPhase(p: PeriodRange, today: LocalDate): PeriodPhase {
  if (today > p.end || p.end < p.start) return "ended";
  return today < p.start ? "before" : "active";
}

/** Başlamamış dönemde kalan gün. Başladıysa 0. */
export function daysUntilStart(p: PeriodRange, today: LocalDate): number {
  return today < p.start ? diffDays(today, p.start) : 0;
}

export function periodsOverlap(a: PeriodRange, b: PeriodRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function findOverlaps<T extends PeriodRange & { id: string }>(
  candidate: PeriodRange,
  periods: readonly T[],
  ignoreId?: string,
): T[] {
  return periods.filter((p) => p.id !== ignoreId && periodsOverlap(candidate, p));
}

export type PeriodError = "end_before_start" | "overlap" | "negative_income" | "negative_fixed";

/** Dönem formu denetimi. Boş dizi: kaydedilebilir. */
export function validatePeriod(
  candidate: PeriodBudget,
  periods: readonly Period[],
  ignoreId?: string,
): PeriodError[] {
  const errors: PeriodError[] = [];
  if (candidate.end < candidate.start) errors.push("end_before_start");
  else if (findOverlaps(candidate, periods, ignoreId).length > 0) errors.push("overlap");
  if (!Number.isFinite(candidate.plannedIncome) || candidate.plannedIncome < 0) errors.push("negative_income");
  if (!Number.isFinite(candidate.fixedExpenses) || candidate.fixedExpenses < 0) errors.push("negative_fixed");
  return errors;
}

/**
 * Tarihin ait olduğu dönem. Eski veride dönemler çakışabilir:
 * en yeni başlangıç kazanır, eşitlikte daha geç biten, o da eşitse küçük kimlik.
 */
export function assignPeriod<T extends PeriodRange & { id: string }>(
  date: LocalDate,
  periods: readonly T[],
): T | null {
  let best: T | null = null;
  for (const p of periods) {
    if (!isInPeriod(p, date)) continue;
    if (
      best === null ||
      p.start > best.start ||
      (p.start === best.start && (p.end > best.end || (p.end === best.end && p.id < best.id)))
    ) {
      best = p;
    }
  }
  return best;
}

/** İşlemleri dönemlere dağıtır. Her işlem tek dönemde. Dönemsiz işlemler "" anahtarında. */
export function groupByPeriod(
  transactions: readonly Transaction[],
  periods: readonly Period[],
): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const p of periods) map.set(p.id, []);
  for (const t of transactions) {
    const key = assignPeriod(t.date, periods)?.id ?? "";
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return map;
}

/** Dönemin orta gününün ayı: "Kasım 2026". */
export function defaultPeriodName(start: LocalDate, end: LocalDate): string {
  const span = Math.max(0, diffDays(start, end));
  return formatDateTr(addDays(start, Math.floor(span / 2)), "monthYear");
}

function paydayIn(year: number, month: number, payday: number): LocalDate {
  return localDate(year, month, Math.min(Math.max(1, Math.trunc(payday)), daysInMonth(year, month)));
}

/** day'e eşit ya da ondan önceki en yakın maaş günü. */
function paydayOnOrBefore(day: LocalDate, payday: number): LocalDate {
  const p = dateParts(day);
  const thisMonth = paydayIn(p.year, p.month, payday);
  if (thisMonth <= day) return thisMonth;
  return p.month === 1 ? paydayIn(p.year - 1, 12, payday) : paydayIn(p.year, p.month - 1, payday);
}

/** day'den sonraki ilk maaş günü. */
function paydayAfter(day: LocalDate, payday: number): LocalDate {
  const p = dateParts(day);
  const thisMonth = paydayIn(p.year, p.month, payday);
  if (thisMonth > day) return thisMonth;
  return p.month === 12 ? paydayIn(p.year + 1, 1, payday) : paydayIn(p.year, p.month + 1, payday);
}

export interface PeriodSuggestion extends ActivePeriodCopy {
  plannedIncome: Kurus;
  fixedExpenses: Kurus;
}

/**
 * "Yeni dönemi başlat" önerisi. Otomatik açılmaz, kullanıcı onaylar.
 * Maaş günü varsa: maaş gününden bir sonraki maaş gününün önceki gününe.
 * Önceki dönemle çakışmaz. Gelir ve sabit gider önceki dönemden kopyalanır.
 */
export function suggestNextPeriod(args: {
  today: LocalDate;
  payday?: number;
  previous?: PeriodBudget | null;
}): PeriodSuggestion {
  const { today, previous } = args;
  const payday = args.payday !== undefined && args.payday >= 1 && args.payday <= 31 ? args.payday : undefined;
  let start: LocalDate;
  let end: LocalDate;
  if (payday !== undefined) {
    start = paydayOnOrBefore(today, payday);
    if (previous && previous.end >= start) start = addDays(previous.end, 1);
    end = addDays(paydayAfter(start, payday), -1);
  } else {
    start = previous ? addDays(previous.end, 1) : today;
    end = addDays(addMonthsAnchored(start, 1), -1);
    // Önceki dönem çoktan bittiyse eskimiş bir dönem önerme: bugünden başlat.
    if (end < today) {
      start = today;
      end = addDays(addMonthsAnchored(start, 1), -1);
    }
  }
  return {
    name: defaultPeriodName(start, end),
    start,
    end,
    plannedIncome: previous ? previous.plannedIncome : 0,
    fixedExpenses: previous ? previous.fixedExpenses : 0,
  };
}
