// Taksit: N taksit = N ayrı gider işlemi, aylık, ilk taksit gününe sabitli.

import type { CategoryKey } from "./category";
import { addMonthsAnchored, type LocalDate } from "./date";
import type { Transaction } from "./model";
import { isValidAmount, splitEvenly, type Kurus } from "./money";

export const MAX_INSTALLMENTS = 36;

export interface InstallmentPlanArgs {
  userId: string;
  description: string;
  category: CategoryKey;
  /** TOPLAM tutar. Eşit bölünür, artan kuruş ilk taksitlere eklenir. */
  total: Kurus;
  /** 1-36 */
  count: number;
  firstDate: LocalDate;
  groupId: string;
  /** index 1'den başlar */
  idFor: (index: number) => string;
  now: number;
  /** Verilirse ve ilk taksit bugünden sonraysa ilk taksit de planlı işaretlenir */
  today?: LocalDate;
}

/** "Televizyon (2/6)" */
export function installmentDescription(description: string, index: number, count: number): string {
  return count > 1 ? `${description} (${index}/${count})` : description;
}

/**
 * Taksit planı. 2. ve sonraki taksitler planlı giderdir: dönem başından düşülür, kendi gününde aşım üretmez.
 * İlk taksit bugünün harcamasıdır; tarihi bugünden sonraysa (today verildiyse) o da planlı işaretlenir.
 * count 1 ise tek sıradan gider döner (taksit alanları yazılmaz).
 * Geçersiz tutar ya da taksit sayısında hata fırlatır (form önce doğrular).
 */
export function buildInstallmentPlan(args: InstallmentPlanArgs): Transaction[] {
  const count = args.count;
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    throw new RangeError("Taksit sayisi 1-36 olmali");
  }
  if (!isValidAmount(args.total) || args.total < count) {
    throw new RangeError("Taksit tutari gecersiz");
  }
  const parts = splitEvenly(args.total, count);
  return parts.map((amount, i) => {
    const index = i + 1;
    const tx: Transaction = {
      id: args.idFor(index),
      userId: args.userId,
      description: installmentDescription(args.description, index, count),
      amount,
      type: "expense",
      category: args.category,
      date: addMonthsAnchored(args.firstDate, i),
      createdAt: args.now + i,
    };
    if (count > 1) {
      tx.installmentGroupId = args.groupId;
      tx.installmentIndex = index;
      tx.installmentCount = count;
    }
    if (i === 0 && args.today !== undefined && args.firstDate > args.today) tx.planned = true;
    return tx;
  });
}
