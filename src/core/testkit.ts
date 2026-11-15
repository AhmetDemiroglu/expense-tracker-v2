// Yalnız testler için: tohumlu rastgele sayı üreteci ve kısa veri kurucuları.

import type { CategoryKey, TxType } from "./category";
import type { LocalDate } from "./date";
import type { Frequency, Recurring, Transaction } from "./model";
import type { Kurus } from "./money";

export interface Rng {
  next(): number;
  /** min ve max dahil tamsayı */
  int(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
  bool(p?: number): boolean;
}

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick<T>(list: readonly T[]): T {
      const item = list[int(0, list.length - 1)];
      if (item === undefined) throw new Error("bos liste");
      return item;
    },
    bool: (p = 0.5) => next() < p,
  };
}

export const D = (s: string): LocalDate => s as LocalDate;

let seq = 0;

export function tx(
  date: string,
  amount: Kurus,
  extra: Partial<Transaction> & { type?: TxType; category?: CategoryKey } = {},
): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    userId: "u1",
    description: "Deneme kaydı",
    amount,
    type: "expense",
    category: "market",
    date: D(date),
    createdAt: seq,
    ...extra,
  };
}

export function income(date: string, amount: Kurus, extra: Partial<Transaction> = {}): Transaction {
  return tx(date, amount, { type: "income", category: "maas", ...extra });
}

export function rec(
  id: string,
  frequency: Frequency,
  startDate: string,
  amount: Kurus,
  extra: Partial<Recurring> = {},
): Recurring {
  return {
    id,
    userId: "u1",
    type: "expense",
    category: "abonelik",
    amount,
    description: `Üyelik ${id}`,
    frequency,
    startDate: D(startDate),
    nextDueDate: D(startDate),
    isActive: true,
    ...extra,
  };
}

/** TL -> kuruş kısaltması: tl(1000) = 100000 */
export const tl = (n: number): Kurus => Math.round(n * 100);
