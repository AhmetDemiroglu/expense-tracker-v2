// TEK bakiye ve TEK günlük limit. Uygulamadaki her ekran sayıları buradan alır.
//
// Tanımlar (kaynaklar/PLAN.md bölüm 4):
//   planned          = sabit gider + dönem içi otomatik işlemler + işlemi henüz olmayan vadeler
//   balance          = plannedIncome + Σ gelir − planned − Σ kendi harcamaları            (dönemin tamamı)
//   dayStartBudget(d)= plannedIncome + Σ gelir(≤ d) − planned − Σ harcama(< d) − Σ harcama(> max(d, today))
//   dailyLimit(d)    = dayStartBudget(d) / kalan gün (d dahil), kuruşa aşağı yuvarlanır
//   todayRemaining   = dailyLimit(today) − Σ harcama(= today)
// Limit gün içinde harcamayla değişmez. Gelecek tarihli gider bugünden ayrılır, gelecek tarihli gelir günü gelene kadar sayılmaz.

import type { CategoryKey, TxType } from "./category";
import { dateParts, daysInclusive, diffDays, monthGrid, weekDays, type LocalDate } from "./date";
import type { Period, PeriodBudget, Recurring, Transaction } from "./model";
import { percentOf, type Kurus } from "./money";
import { assignPeriod, type PeriodPhase } from "./period";
import {
  effectiveTransactions,
  indexGenerated,
  isAutoTransaction,
  unmatchedOccurrences,
} from "./recurrence";

export interface BudgetInput {
  period: PeriodBudget;
  transactions: readonly Transaction[];
  recurrences: readonly Recurring[];
  today: LocalDate;
}

/** iyi, uyarı (limitin 1,2 katına kadar), aşım, açık (limit negatif), limit yok */
export type DayStatus = "good" | "warning" | "over" | "deficit" | "none";

export interface BudgetSnapshot {
  phase: PeriodPhase;
  totalDays: number;
  /** Bugün dahil kalan gün. Başlamamış dönemde totalDays, biten dönemde 0. */
  remainingDays: number;
  /** Bugünden önce geçen gün sayısı */
  elapsedDays: number;
  daysUntilStart: number;

  plannedIncome: Kurus;
  /** Dönem içindeki gelir işlemleri (gelecek tarihliler dahil) */
  incomeTx: Kurus;
  totalIncome: Kurus;

  fixed: Kurus;
  /** Düzenli ödemelerden üretilmiş dönem içi giderler */
  autoPaid: Kurus;
  /** Düzenli ödemelerin dönem içinde işlemi henüz olmayan vadeleri */
  duePending: Kurus;
  /** fixed + autoPaid + duePending */
  planned: Kurus;
  /** Kullanıcının kendi harcamaları (dönem) */
  discretionary: Kurus;
  /** planned + discretionary */
  totalExpense: Kurus;
  /** totalIncome − totalExpense */
  balance: Kurus;

  /** Günlük limit. Biten dönemde null. Başlamamış dönemde dönemin ilk günü için. */
  dailyLimit: Kurus | null;
  /** Limitin ait olduğu gün */
  limitDay: LocalDate | null;
  todaySpent: Kurus;
  /** dailyLimit − todaySpent. Yalnız dönem sürerken. */
  todayRemaining: Kurus | null;
  todayStatus: DayStatus;
  /** Tam sayı yüzde. Toplam gelir 0 ise null. */
  savingsRate: number | null;
}

export interface DayInfo {
  date: LocalDate;
  inPeriod: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** Dönem dışındaki günde null */
  limit: Kurus | null;
  /** Kullanıcının o günkü kendi harcaması */
  spent: Kurus;
  /** O gün düşen otomatik (düzenli ödeme) giderleri */
  autoSpent: Kurus;
  /** O günün vadesi gelecek, işlemi henüz olmayan düzenli ödemeleri */
  plannedDue: Kurus;
  income: Kurus;
  /** limit − spent */
  remaining: Kurus | null;
  status: DayStatus;
}

interface DaySums {
  disc: Kurus;
  auto: Kurus;
  income: Kurus;
}

/** Bir kez hazırlanır, çok gün sorulur (takvim). `BudgetInput` yerine verilebilir. */
export interface BudgetContext {
  readonly __prepared: true;
  readonly period: PeriodBudget;
  readonly today: LocalDate;
  readonly totalDays: number;
  /** Dönem içi işlemler (çiftler ayıklanmış) */
  readonly transactions: readonly Transaction[];
  readonly byDay: ReadonlyMap<LocalDate, DaySums>;
  readonly dueByDay: ReadonlyMap<LocalDate, Kurus>;
  /** discPrefix[i] = dönemin ilk i gününün harcaması; uzunluk totalDays + 1 */
  readonly discPrefix: readonly Kurus[];
  readonly incomePrefix: readonly Kurus[];
  readonly autoPaid: Kurus;
  readonly duePending: Kurus;
}

export type BudgetSource = BudgetInput | BudgetContext;

function isContext(source: BudgetSource): source is BudgetContext {
  return (source as BudgetContext).__prepared === true;
}

function safe(k: Kurus): Kurus {
  return Number.isFinite(k) ? Math.round(k) : 0;
}

export function prepareBudget(source: BudgetSource): BudgetContext {
  if (isContext(source)) return source;
  const period: PeriodBudget = {
    start: source.period.start,
    end: source.period.end,
    plannedIncome: Math.max(0, safe(source.period.plannedIncome)),
    fixedExpenses: Math.max(0, safe(source.period.fixedExpenses)),
  };
  const today = source.today;
  const totalDays = daysInclusive(period.start, period.end);
  const all = effectiveTransactions(source.transactions).filter(
    (t) => Number.isFinite(t.amount) && t.amount >= 0,
  );

  const byDay = new Map<LocalDate, DaySums>();
  const discByIndex: Kurus[] = new Array<Kurus>(totalDays).fill(0);
  const incomeByIndex: Kurus[] = new Array<Kurus>(totalDays).fill(0);
  const inPeriod: Transaction[] = [];
  let autoPaid = 0;

  for (const t of all) {
    let sums = byDay.get(t.date);
    if (!sums) {
      sums = { disc: 0, auto: 0, income: 0 };
      byDay.set(t.date, sums);
    }
    const auto = isAutoTransaction(t);
    if (t.type === "income") sums.income += t.amount;
    else if (auto) sums.auto += t.amount;
    else sums.disc += t.amount;

    if (t.date < period.start || t.date > period.end) continue;
    inPeriod.push(t);
    const i = diffDays(period.start, t.date);
    if (t.type === "income") incomeByIndex[i] = (incomeByIndex[i] ?? 0) + t.amount;
    else if (auto) autoPaid += t.amount;
    else discByIndex[i] = (discByIndex[i] ?? 0) + t.amount;
  }

  const discPrefix: Kurus[] = [0];
  const incomePrefix: Kurus[] = [0];
  for (let i = 0; i < totalDays; i++) {
    discPrefix.push((discPrefix[i] ?? 0) + (discByIndex[i] ?? 0));
    incomePrefix.push((incomePrefix[i] ?? 0) + (incomeByIndex[i] ?? 0));
  }

  // Her vade tam bir kez: işlemi varsa autoPaid içinde, yoksa burada.
  const dueByDay = new Map<LocalDate, Kurus>();
  let duePending = 0;
  if (totalDays > 0) {
    const index = indexGenerated(all);
    for (const rec of source.recurrences) {
      if (!rec.isActive || rec.type !== "expense") continue;
      if (!Number.isFinite(rec.amount) || rec.amount <= 0) continue;
      for (const due of unmatchedOccurrences(rec, period.start, period.end, index)) {
        duePending += rec.amount;
        dueByDay.set(due, (dueByDay.get(due) ?? 0) + rec.amount);
      }
    }
  }

  return {
    __prepared: true,
    period,
    today,
    totalDays,
    transactions: inPeriod,
    byDay,
    dueByDay,
    discPrefix,
    incomePrefix,
    autoPaid,
    duePending,
  };
}

function at(prefix: readonly Kurus[], i: number): Kurus {
  const clamped = i < 0 ? 0 : i >= prefix.length ? prefix.length - 1 : i;
  return prefix[clamped] ?? 0;
}

function plannedOf(ctx: BudgetContext): Kurus {
  return ctx.period.fixedExpenses + ctx.autoPaid + ctx.duePending;
}

/** d gününün başındaki bütçe. d dönem içinde olmalı. */
function dayStartBudgetAt(ctx: BudgetContext, d: LocalDate): Kurus {
  const i = diffDays(ctx.period.start, d);
  const discTotal = at(ctx.discPrefix, ctx.totalDays);
  // Gelecek için ayrılan: max(d, today)'den sonraki harcamalar.
  const cut = d >= ctx.today ? d : ctx.today;
  const cutIndex = diffDays(ctx.period.start, cut);
  const discAfter = discTotal - at(ctx.discPrefix, cutIndex + 1);
  const discBefore = at(ctx.discPrefix, i);
  const incomeThrough = at(ctx.incomePrefix, i + 1);
  return ctx.period.plannedIncome + incomeThrough - plannedOf(ctx) - discBefore - discAfter;
}

/** d gününün başındaki bütçe (limitin payı). Dönem dışı gün: null. */
export function dayStartBudget(source: BudgetSource, day: LocalDate): Kurus | null {
  const ctx = prepareBudget(source);
  if (ctx.totalDays === 0 || day < ctx.period.start || day > ctx.period.end) return null;
  return dayStartBudgetAt(ctx, day);
}

/**
 * Günlük limit: uygulamadaki TEK tanım. Kuruşa aşağı yuvarlanır (negatifte de).
 * Dönem dışındaki gün için null.
 */
export function dailyLimitFor(source: BudgetSource, day: LocalDate): Kurus | null {
  const ctx = prepareBudget(source);
  if (ctx.totalDays === 0 || day < ctx.period.start || day > ctx.period.end) return null;
  const remaining = ctx.totalDays - diffDays(ctx.period.start, day);
  if (remaining < 1) return null;
  return Math.floor(dayStartBudgetAt(ctx, day) / remaining);
}

/** harcama ≤ limit iyi, ≤ limit x 1,2 uyarı, üstü aşım. Limit negatifse açık. */
export function dayStatus(limit: Kurus | null, spent: Kurus): DayStatus {
  if (limit === null || !Number.isFinite(limit)) return "none";
  if (limit < 0) return "deficit";
  if (spent <= limit) return "good";
  return spent * 5 <= limit * 6 ? "warning" : "over";
}

export function computeBudget(source: BudgetSource): BudgetSnapshot {
  const ctx = prepareBudget(source);
  const { period, today, totalDays } = ctx;
  const phase: PeriodPhase =
    totalDays === 0 || today > period.end ? "ended" : today < period.start ? "before" : "active";

  const incomeTx = at(ctx.incomePrefix, totalDays);
  const discretionary = at(ctx.discPrefix, totalDays);
  const planned = plannedOf(ctx);
  const totalIncome = period.plannedIncome + incomeTx;
  const totalExpense = planned + discretionary;
  const balance = totalIncome - totalExpense;

  const limitDay: LocalDate | null = phase === "active" ? today : phase === "before" ? period.start : null;
  const dailyLimit = limitDay ? dailyLimitFor(ctx, limitDay) : null;
  const todaySpent = phase === "active" ? (ctx.byDay.get(today)?.disc ?? 0) : 0;
  const remainingDays = phase === "active" ? totalDays - diffDays(period.start, today) : phase === "before" ? totalDays : 0;

  return {
    phase,
    totalDays,
    remainingDays,
    elapsedDays: totalDays - remainingDays,
    daysUntilStart: phase === "before" ? diffDays(today, period.start) : 0,
    plannedIncome: period.plannedIncome,
    incomeTx,
    totalIncome,
    fixed: period.fixedExpenses,
    autoPaid: ctx.autoPaid,
    duePending: ctx.duePending,
    planned,
    discretionary,
    totalExpense,
    balance,
    dailyLimit,
    limitDay,
    todaySpent,
    todayRemaining: phase === "active" && dailyLimit !== null ? dailyLimit - todaySpent : null,
    todayStatus: phase === "active" ? dayStatus(dailyLimit, todaySpent) : "none",
    savingsRate: percentOf(balance, totalIncome),
  };
}

export function dayInfo(source: BudgetSource, day: LocalDate): DayInfo {
  const ctx = prepareBudget(source);
  const sums = ctx.byDay.get(day);
  const spent = sums?.disc ?? 0;
  const limit = dailyLimitFor(ctx, day);
  const isFuture = day > ctx.today;
  // Harcaması olmayan gelecek gün renklendirilmez.
  const status: DayStatus = limit === null || (isFuture && spent === 0) ? "none" : dayStatus(limit, spent);
  return {
    date: day,
    inPeriod: limit !== null,
    isToday: day === ctx.today,
    isFuture,
    limit,
    spent,
    autoSpent: sums?.auto ?? 0,
    plannedDue: ctx.dueByDay.get(day) ?? 0,
    income: sums?.income ?? 0,
    remaining: limit === null ? null : limit - spent,
    status,
  };
}

/** Özet ekranındaki 7 çubuk: Pazartesi'den Pazar'a. Varsayılan hafta: bugünün haftası. */
export function weekSeries(source: BudgetSource, anyDayOfWeek?: LocalDate): DayInfo[] {
  const ctx = prepareBudget(source);
  return weekDays(anyDayOfWeek ?? ctx.today).map((d) => dayInfo(ctx, d));
}

export interface MonthDayCell {
  date: LocalDate;
  inMonth: boolean;
  info: DayInfo;
}

/** Takvim ızgarası: gün başına limit ve harcama. month: 1-12 */
export function monthDays(source: BudgetSource, year: number, month: number): MonthDayCell[][] {
  const ctx = prepareBudget(source);
  return monthGrid(year, month).map((row) =>
    row.map((cell) => ({ date: cell.date, inMonth: cell.inMonth, info: dayInfo(ctx, cell.date) })),
  );
}

/** Takvimin açılış ayı: bugün dönem içindeyse bugünün ayı, değilse dönemin ilk ayı. */
export function calendarAnchor(source: BudgetSource): { year: number; month: number } {
  const ctx = prepareBudget(source);
  const inside = ctx.today >= ctx.period.start && ctx.today <= ctx.period.end;
  const p = dateParts(inside ? ctx.today : ctx.period.start);
  return { year: p.year, month: p.month };
}

export interface CategoryTotal {
  category: CategoryKey;
  total: Kurus;
  count: number;
  /** Toplam içindeki pay, tam sayı yüzde (0-100) */
  share: number;
}

/** Dönem içi kategori dağılımı (otomatik işlemler dahil), büyükten küçüğe. */
export function categoryBreakdown(source: BudgetSource, type: TxType = "expense"): CategoryTotal[] {
  const ctx = prepareBudget(source);
  const totals = new Map<CategoryKey, { total: Kurus; count: number }>();
  let grand = 0;
  for (const t of ctx.transactions) {
    if (t.type !== type) continue;
    const cur = totals.get(t.category) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    totals.set(t.category, cur);
    grand += t.amount;
  }
  return [...totals.entries()]
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      share: percentOf(v.total, grand) ?? 0,
    }))
    .sort((a, b) => b.total - a.total || (a.category < b.category ? -1 : 1));
}

export interface PeriodSummary {
  periodId: string;
  name: string;
  start: LocalDate;
  end: LocalDate;
  totalIncome: Kurus;
  totalExpense: Kurus;
  balance: Kurus;
  /** Tam sayı yüzde. Toplam gelir 0 ise null. */
  savingsRate: number | null;
  txCount: number;
}

/** Dönem özeti: Özet ekranındaki bakiye ile AYNI tanım (eski sürümde farklıydı). */
export function periodSummary(
  period: Period,
  transactions: readonly Transaction[],
  recurrences: readonly Recurring[],
  today: LocalDate,
): PeriodSummary {
  const ctx = prepareBudget({ period, transactions, recurrences, today });
  const b = computeBudget(ctx);
  return {
    periodId: period.id,
    name: period.name,
    start: period.start,
    end: period.end,
    totalIncome: b.totalIncome,
    totalExpense: b.totalExpense,
    balance: b.balance,
    savingsRate: b.savingsRate,
    txCount: ctx.transactions.length,
  };
}

/**
 * Tüm dönemlerin özeti, en yeni önce. Çakışan dönemlerde işlem tek döneme yazılır
 * (en yeni başlangıç): hiçbir işlem iki kez sayılmaz.
 */
export function periodSummaries(
  periods: readonly Period[],
  transactions: readonly Transaction[],
  recurrences: readonly Recurring[],
  today: LocalDate,
): PeriodSummary[] {
  const effective = effectiveTransactions(transactions);
  const byPeriod = new Map<string, Transaction[]>();
  for (const t of effective) {
    const owner = assignPeriod(t.date, periods);
    if (!owner) continue;
    const list = byPeriod.get(owner.id);
    if (list) list.push(t);
    else byPeriod.set(owner.id, [t]);
  }
  return [...periods]
    .sort((a, b) => (a.start === b.start ? (a.id < b.id ? -1 : 1) : a.start > b.start ? -1 : 1))
    .map((p) => periodSummary(p, byPeriod.get(p.id) ?? [], recurrences, today));
}
