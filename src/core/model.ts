// Çekirdek tipleri ve eski Firestore / localStorage biçimiyle iki yönlü dönüşüm.
// Eski sürümler aynı veriyi okumaya devam eder: alan adları ve anlamları korunur, yalnız yeni alan eklenir.

import { categoryFromLegacy, categoryLegacyName, type CategoryKey, type TxType } from "./category";
import { parseLocalDate, type LocalDate } from "./date";
import { kurusFromTl, tlFromKurus, type Kurus } from "./money";

export type Frequency = "weekly" | "monthly" | "yearly";
export type FinancialGoal = "debt_reduction" | "savings" | "investment" | "stability";
export type SavingsStyle = "strict" | "balanced" | "relaxed";
export type RiskTolerance = "low" | "medium" | "high";

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: Kurus;
  type: TxType;
  category: CategoryKey;
  date: LocalDate;
  /** ms */
  createdAt: number;
  /** Düzenli ödemeden üretildiyse kaynağı ve vade günü */
  recurringId?: string;
  dueDate?: LocalDate;
  installmentGroupId?: string;
  /** 1'den başlar */
  installmentIndex?: number;
  installmentCount?: number;
}

export interface PeriodRange {
  start: LocalDate;
  end: LocalDate;
}

export interface PeriodBudget extends PeriodRange {
  plannedIncome: Kurus;
  fixedExpenses: Kurus;
}

export interface ActivePeriodCopy extends PeriodBudget {
  name: string;
}

export interface Period extends ActivePeriodCopy {
  id: string;
  userId: string;
}

export interface Recurring {
  id: string;
  userId: string;
  type: TxType;
  category: CategoryKey;
  amount: Kurus;
  description: string;
  frequency: Frequency;
  startDate: LocalDate;
  /** Eski sürümün imleci: bundan önceki vadeler işlenmiş sayılır */
  nextDueDate: LocalDate;
  isActive: boolean;
  /** Eski anlam: vade günü değil, işlemin yapıldığı gün */
  lastProcessedDate?: LocalDate;
}

export interface Settings {
  userId: string;
  /** Aktif dönemin kopyası (eski sürümle aynı yer). Henüz dönem yoksa null. */
  period: ActivePeriodCopy | null;
  activePeriodId?: string;
  /** Maaş günü, 1-31 */
  payday?: number;
  currency: string;
  financialGoal: FinancialGoal;
  savingsStyle: SavingsStyle;
  riskTolerance: RiskTolerance;
}

export type ReadResult<T> = { ok: true; value: T; warnings: string[] } | { ok: false; reason: string };

export const GUEST_PREFIX = "guest_";
/** Misafir kimliğini tutan localStorage anahtarı */
export const ACTIVE_GUEST_KEY = "active_guest";

export function isGuestId(userId: string): boolean {
  return userId.startsWith(GUEST_PREFIX);
}

/** Misafir verisinin localStorage anahtarları (eski sürümle aynı). */
export function guestStorageKeys(guestId: string): {
  transactions: string;
  settings: string;
  periods: string;
  recurring: string;
} {
  return {
    transactions: `tx_${guestId}`,
    settings: `settings_${guestId}`,
    periods: `periods_${guestId}`,
    recurring: `recurring_${guestId}`,
  };
}

type Raw = Record<string, unknown>;

function asObject(raw: unknown): Raw | null {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Raw) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function nonEmpty(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function readType(v: unknown): TxType | null {
  return v === "income" || v === "expense" ? v : null;
}

/** "yyyy-MM-dd" ya da onunla başlayan (saat ekli) metin. */
function readDate(v: unknown): LocalDate | null {
  if (typeof v !== "string") return null;
  return parseLocalDate(v) ?? (v.length > 10 ? parseLocalDate(v.slice(0, 10)) : null);
}

function readAmount(v: unknown): Kurus | null {
  const k = kurusFromTl(v);
  return k !== null && k >= 0 ? k : null;
}

function positiveInt(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Firestore: id = doc.id. Doküman içindeki `id` alanı yok sayılır. */
export function readTransaction(id: string, raw: unknown): ReadResult<Transaction> {
  const o = asObject(raw);
  if (!o) return { ok: false, reason: "kayit nesne degil" };
  const type = readType(o.type);
  if (!type) return { ok: false, reason: "tur gecersiz" };
  const amount = readAmount(o.amount);
  if (amount === null) return { ok: false, reason: "tutar gecersiz" };
  const date = readDate(o.date);
  if (!date) return { ok: false, reason: "tarih gecersiz" };
  const warnings: string[] = [];
  if (amount === 0) warnings.push("tutar 0");
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : 0;
  const value: Transaction = {
    id,
    userId: str(o.userId),
    description: str(o.description),
    amount,
    type,
    category: categoryFromLegacy(o.category, type),
    date,
    createdAt,
  };
  const recurringId = nonEmpty(o.recurringId);
  if (recurringId) {
    value.recurringId = recurringId;
    value.dueDate = readDate(o.dueDate) ?? date;
  }
  const groupId = nonEmpty(o.installmentGroupId);
  const index = positiveInt(o.installmentIndex);
  const count = positiveInt(o.installmentCount);
  if (groupId && index && count) {
    value.installmentGroupId = groupId;
    value.installmentIndex = index;
    value.installmentCount = count;
  }
  return { ok: true, value, warnings };
}

/** Eski alan adlarıyla düz nesne. `id` içermez. Tutar TL ondalık, kategori eski görünen ad. */
export function writeTransaction(tx: Transaction): Record<string, unknown> {
  const out: Raw = {
    userId: tx.userId,
    description: tx.description,
    amount: tlFromKurus(tx.amount),
    type: tx.type,
    category: categoryLegacyName(tx.category),
    date: tx.date,
    createdAt: tx.createdAt,
  };
  if (tx.recurringId) {
    out.recurringId = tx.recurringId;
    out.dueDate = tx.dueDate ?? tx.date;
  }
  if (tx.installmentGroupId && tx.installmentIndex && tx.installmentCount) {
    out.installmentGroupId = tx.installmentGroupId;
    out.installmentIndex = tx.installmentIndex;
    out.installmentCount = tx.installmentCount;
  }
  return out;
}

function readBudgetAmount(v: unknown, label: string, warnings: string[]): Kurus {
  if (v === undefined || v === null) return 0;
  const k = kurusFromTl(v);
  if (k === null || k < 0) {
    warnings.push(`${label} gecersiz, 0 sayildi`);
    return 0;
  }
  return k;
}

export function readPeriod(id: string, raw: unknown): ReadResult<Period> {
  const o = asObject(raw);
  if (!o) return { ok: false, reason: "kayit nesne degil" };
  const start = readDate(o.startDate);
  const end = readDate(o.endDate);
  if (!start || !end) return { ok: false, reason: "tarih gecersiz" };
  const warnings: string[] = [];
  if (end < start) warnings.push("bitis baslangictan once");
  return {
    ok: true,
    warnings,
    value: {
      id,
      userId: str(o.userId),
      name: str(o.name),
      start,
      end,
      plannedIncome: readBudgetAmount(o.monthlyIncome, "gelir", warnings),
      fixedExpenses: readBudgetAmount(o.fixedExpenses, "sabit gider", warnings),
    },
  };
}

export function writePeriod(p: Period): Record<string, unknown> {
  return {
    userId: p.userId,
    name: p.name,
    startDate: p.start,
    endDate: p.end,
    monthlyIncome: tlFromKurus(p.plannedIncome),
    fixedExpenses: tlFromKurus(p.fixedExpenses),
  };
}

export function readRecurring(id: string, raw: unknown): ReadResult<Recurring> {
  const o = asObject(raw);
  if (!o) return { ok: false, reason: "kayit nesne degil" };
  const type = readType(o.type);
  if (!type) return { ok: false, reason: "tur gecersiz" };
  const amount = readAmount(o.amount);
  if (amount === null) return { ok: false, reason: "tutar gecersiz" };
  const startDate = readDate(o.startDate);
  if (!startDate) return { ok: false, reason: "tarih gecersiz" };
  const warnings: string[] = [];
  let nextDueDate = readDate(o.nextDueDate);
  if (!nextDueDate) {
    nextDueDate = startDate;
    warnings.push("sonraki vade gecersiz, baslangic kullanildi");
  }
  const frequency = oneOf<Frequency>(o.frequency, ["weekly", "monthly", "yearly"], "monthly");
  if (frequency !== o.frequency) warnings.push("siklik gecersiz, aylik sayildi");
  const value: Recurring = {
    id,
    userId: str(o.userId),
    type,
    category: categoryFromLegacy(o.category, type),
    amount,
    description: str(o.description),
    frequency,
    startDate,
    nextDueDate,
    isActive: o.isActive !== false,
  };
  const last = readDate(o.lastProcessedDate);
  if (last) value.lastProcessedDate = last;
  return { ok: true, value, warnings };
}

export function writeRecurring(r: Recurring): Record<string, unknown> {
  const out: Raw = {
    userId: r.userId,
    type: r.type,
    category: categoryLegacyName(r.category),
    amount: tlFromKurus(r.amount),
    description: r.description,
    frequency: r.frequency,
    startDate: r.startDate,
    nextDueDate: r.nextDueDate,
    isActive: r.isActive,
  };
  if (r.lastProcessedDate) out.lastProcessedDate = r.lastProcessedDate;
  return out;
}

const GOALS: readonly FinancialGoal[] = ["debt_reduction", "savings", "investment", "stability"];
const STYLES: readonly SavingsStyle[] = ["strict", "balanced", "relaxed"];
const RISKS: readonly RiskTolerance[] = ["low", "medium", "high"];

/** `settings/{uid}` dokümanı. Eksik Nova alanları varsayılanla dolar. Dönem tarihleri yoksa period null. */
export function readSettings(userId: string, raw: unknown): ReadResult<Settings> {
  const o = asObject(raw);
  if (!o) return { ok: false, reason: "kayit nesne degil" };
  const warnings: string[] = [];
  const start = readDate(o.periodStartDate);
  const end = readDate(o.periodEndDate);
  let period: ActivePeriodCopy | null = null;
  if (start && end) {
    if (end < start) warnings.push("bitis baslangictan once");
    period = {
      name: str(o.periodName),
      start,
      end,
      plannedIncome: readBudgetAmount(o.monthlyIncome, "gelir", warnings),
      fixedExpenses: readBudgetAmount(o.fixedExpenses, "sabit gider", warnings),
    };
  }
  const value: Settings = {
    userId,
    period,
    currency: nonEmpty(o.currency) ?? "TRY",
    financialGoal: oneOf(o.financialGoal, GOALS, "stability"),
    savingsStyle: oneOf(o.savingsStyle, STYLES, "balanced"),
    riskTolerance: oneOf(o.riskTolerance, RISKS, "medium"),
  };
  const activePeriodId = nonEmpty(o.activePeriodId);
  if (activePeriodId) value.activePeriodId = activePeriodId;
  if (typeof o.payday === "number" && Number.isInteger(o.payday) && o.payday >= 1 && o.payday <= 31) {
    value.payday = o.payday;
  }
  return { ok: true, value, warnings };
}

function periodFields(p: ActivePeriodCopy): Raw {
  return {
    periodName: p.name,
    periodStartDate: p.start,
    periodEndDate: p.end,
    monthlyIncome: tlFromKurus(p.plannedIncome),
    fixedExpenses: tlFromKurus(p.fixedExpenses),
  };
}

/**
 * KISMİ nesne döner: Firestore'a `{ merge: true }` ile yazılır.
 * Dönem yoksa dönem alanları hiç yazılmaz (var olan silinmez).
 */
export function writeSettings(s: Settings): Record<string, unknown> {
  const out: Raw = {
    userId: s.userId,
    currency: s.currency,
    financialGoal: s.financialGoal,
    savingsStyle: s.savingsStyle,
    riskTolerance: s.riskTolerance,
  };
  if (s.period) Object.assign(out, periodFields(s.period));
  if (s.activePeriodId) out.activePeriodId = s.activePeriodId;
  if (s.payday !== undefined) out.payday = s.payday;
  return out;
}

/** Dönemi aktif etmek için settings'e MERGE edilecek alanlar. Nova alanlarına dokunmaz. */
export function activationPatch(period: Period): Record<string, unknown> {
  return {
    userId: period.userId,
    currency: "TRY",
    ...periodFields(period),
    activePeriodId: period.id,
  };
}

/** Misafir dizisine yazarken kimliği nesnenin içine koyar. */
export function withId(doc: Record<string, unknown>, id: string): Record<string, unknown> {
  return { ...doc, id };
}

export interface GuestListResult<T> {
  items: T[];
  skipped: { index: number; reason: string }[];
}

/**
 * Misafir (localStorage) dizisi. Kimlik nesnenin İÇİNDEKİ `id` alanıdır.
 * raw: ayrıştırılmış dizi ya da JSON metni. Bozuk veri boş liste döner, hata fırlatmaz.
 */
export function readGuestList<T>(
  raw: unknown,
  reader: (id: string, raw: unknown) => ReadResult<T>,
): GuestListResult<T> {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return { items: [], skipped: [{ index: -1, reason: "JSON bozuk" }] };
    }
  }
  const result: GuestListResult<T> = { items: [], skipped: [] };
  if (!Array.isArray(list)) return result;
  list.forEach((item: unknown, index: number) => {
    const o = asObject(item);
    const id = o ? nonEmpty(o.id) : undefined;
    if (!id) {
      result.skipped.push({ index, reason: "kimlik yok" });
      return;
    }
    const r = reader(id, item);
    if (r.ok) result.items.push(r.value);
    else result.skipped.push({ index, reason: r.reason });
  });
  return result;
}

export const SYNTHETIC_ACTIVE_PERIOD_ID = "active";

/**
 * Aktif dönem. Değerler settings'teki kopyadan gelir (tek kaynak).
 * Kayıtlı dönemle eşleşme: activePeriodId, yoksa ad + başlangıç, o da yoksa kimlik "active".
 */
export function activePeriod(settings: Settings | null, periods: readonly Period[]): Period | null {
  if (!settings || !settings.period) return null;
  const copy = settings.period;
  let match: Period | undefined;
  if (settings.activePeriodId) match = periods.find((p) => p.id === settings.activePeriodId);
  if (!match) match = periods.find((p) => p.name === copy.name && p.start === copy.start);
  return {
    id: match ? match.id : SYNTHETIC_ACTIVE_PERIOD_ID,
    userId: settings.userId,
    name: copy.name,
    start: copy.start,
    end: copy.end,
    plannedIncome: copy.plannedIncome,
    fixedExpenses: copy.fixedExpenses,
  };
}
