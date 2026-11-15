// Misafir için demo verisi. Saf: bugün, şimdi ve kimlik üreteci dışarıdan gelir.
// Maaş ve kira İŞLEM olarak yazılmaz: sabit gelir ve sabit gider dönemde durur (çift sayım yok).

import type { CategoryKey } from "./category";
import { addDays, endOfMonth, type LocalDate } from "./date";
import type { Period, Recurring, Settings, Transaction } from "./model";
import type { Kurus } from "./money";
import { autoTransactionId, nextOccurrenceAfter } from "./recurrence";

export interface DemoData {
  settings: Settings;
  periods: Period[];
  transactions: Transaction[];
  recurrences: Recurring[];
}

export const DEMO_PLANNED_INCOME: Kurus = 4_500_000;
export const DEMO_FIXED_EXPENSES: Kurus = 1_285_000;
export const DEMO_PERIOD_NAME = "Demo Dönemi";

const DEMO_EXPENSES: ReadonlyArray<readonly [daysAgo: number, amount: Kurus, category: CategoryKey, description: string]> = [
  [12, 85_000, "fatura", "Elektrik faturası"],
  [10, 125_000, "market", "Haftalık alışveriş"],
  [8, 120_000, "arac_yakit", "Benzin"],
  [6, 78_000, "yeme_icme", "Akşam yemeği"],
  [5, 40_000, "eglence", "Sinema"],
  [3, 30_000, "toplu_tasima", "Ulaşım kartı"],
  [2, 45_000, "giyim", "Tişört"],
  [1, 22_000, "market", "Eksikler"],
  [0, 9_500, "yeme_icme", "Kahve"],
];

/**
 * Dönem: bugün − 15 gün .. bugünün ayının son günü (son gün dahil).
 * idFor(n): n = 1, 2, 3... için benzersiz kimlik.
 */
export function buildDemoData(args: {
  guestId: string;
  today: LocalDate;
  now: number;
  idFor: (n: number) => string;
}): DemoData {
  const { guestId, today, now } = args;
  let n = 0;
  const nextId = (): string => {
    n += 1;
    return args.idFor(n);
  };

  const start = addDays(today, -15);
  const end = endOfMonth(today);
  const period: Period = {
    id: nextId(),
    userId: guestId,
    name: DEMO_PERIOD_NAME,
    start,
    end,
    plannedIncome: DEMO_PLANNED_INCOME,
    fixedExpenses: DEMO_FIXED_EXPENSES,
  };

  const settings: Settings = {
    userId: guestId,
    period: {
      name: period.name,
      start,
      end,
      plannedIncome: period.plannedIncome,
      fixedExpenses: period.fixedExpenses,
    },
    activePeriodId: period.id,
    currency: "TRY",
    financialGoal: "savings",
    savingsStyle: "balanced",
    riskTolerance: "medium",
  };

  const transactions: Transaction[] = DEMO_EXPENSES.map(([daysAgo, amount, category, description], i) => ({
    id: nextId(),
    userId: guestId,
    description,
    amount,
    type: "expense",
    category,
    date: addDays(today, -daysAgo),
    createdAt: now + i,
  }));

  transactions.push({
    id: nextId(),
    userId: guestId,
    description: "Ek iş ödemesi",
    amount: 250_000,
    type: "income",
    category: "ek_is",
    date: addDays(today, -7),
    createdAt: now + 20,
  });

  // Bir düzenli ödeme: ilk vadesi dönem içinde ve işlemi üretilmiş.
  const recurringStart = addDays(today, -9);
  const recurring: Recurring = {
    id: nextId(),
    userId: guestId,
    type: "expense",
    category: "abonelik",
    amount: 22_999,
    description: "Dijital üyelik",
    frequency: "monthly",
    startDate: recurringStart,
    nextDueDate: nextOccurrenceAfter({ frequency: "monthly", startDate: recurringStart }, today),
    isActive: true,
    lastProcessedDate: today,
  };
  transactions.push({
    id: autoTransactionId(recurring.id, recurringStart),
    userId: guestId,
    description: recurring.description,
    amount: recurring.amount,
    type: "expense",
    category: "abonelik",
    date: recurringStart,
    createdAt: now + 21,
    recurringId: recurring.id,
    dueDate: recurringStart,
  });

  return { settings, periods: [period], transactions, recurrences: [recurring] };
}
