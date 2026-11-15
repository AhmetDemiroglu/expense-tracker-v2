// FinanceContext: sayılar çekirdekten (BudgetSnapshot, kategori dağılımı, dönem özetleri). Model sayı hesaplamaz.

import {
  categoryLabel,
  stripAutoSuffix,
  type BudgetSnapshot,
  type CategoryTotal,
  type LocalDate,
  type Period,
  type PeriodSummary,
  type Recurring,
  type Settings,
  type Transaction,
} from "@/core";
import type { FinanceContext, RaporStili } from "./sema";

const SATIR = 30;

export function finansBaglamiKur(args: {
  bugun: LocalDate;
  donem: Period;
  ozet: BudgetSnapshot;
  kategoriler: readonly CategoryTotal[];
  duzenliler: readonly Recurring[];
  /** effectiveTransactions çıktısı, yeniden eskiye */
  islemler: readonly Transaction[];
  donemOzetleri: readonly PeriodSummary[];
  ayarlar: Settings | null;
  ad?: string | null;
  stil?: RaporStili;
}): FinanceContext {
  const { ozet, donem, bugun } = args;
  const ctx: FinanceContext = {
    today: bugun,
    period: { name: donem.name || "Dönem", start: donem.start, end: donem.end, remainingDays: ozet.remainingDays },
    totals: {
      plannedIncome: ozet.plannedIncome,
      extraIncome: ozet.incomeTx,
      planned: ozet.planned,
      discretionary: ozet.discretionary,
      balance: ozet.balance,
      dailyLimit: ozet.dailyLimit,
      todayRemaining: ozet.todayRemaining,
      savingsRatePercent: ozet.savingsRate,
    },
    categories: args.kategoriler
      .filter((c) => c.total > 0)
      .slice(0, SATIR)
      .map((c) => ({ key: c.category, name: categoryLabel(c.category), amount: c.total })),
    recurring: args.duzenliler
      .filter((r) => r.isActive && r.type === "expense")
      .slice(0, SATIR)
      .map((r) => ({ name: r.description.slice(0, 80), amount: r.amount, frequency: r.frequency })),
    recent: args.islemler
      .filter((t) => t.date <= bugun)
      .slice(0, SATIR)
      .map((t) => ({
        date: t.date,
        categoryName: categoryLabel(t.category),
        amount: t.amount,
        type: t.type,
        description: stripAutoSuffix(t.description).slice(0, 80),
      })),
  };
  const ilkAd = args.ad?.trim().split(/\s+/)[0];
  if (ilkAd) ctx.userName = ilkAd.slice(0, 40);
  const onceki = args.donemOzetleri.find((p) => p.end < donem.start);
  if (onceki) {
    ctx.previousPeriod = { name: onceki.name, balance: onceki.balance, savingsRatePercent: onceki.savingsRate };
  }
  if (args.ayarlar) {
    ctx.profile = {
      goal: args.ayarlar.financialGoal,
      savingsStyle: args.ayarlar.savingsStyle,
      risk: args.ayarlar.riskTolerance,
    };
  }
  if (args.stil) ctx.style = args.stil;
  return ctx;
}

export function saatDilimi(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
}
