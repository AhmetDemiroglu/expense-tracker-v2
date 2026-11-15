// Düzenli ödeme: vadeler başlangıç gününe sabitlidir, üretim deterministik kimlikle yapılır.

import {
  addDays,
  addMonthsAnchored,
  dateParts,
  diffDays,
  maxDate,
  type LocalDate,
} from "./date";
import type { Frequency, Recurring, Transaction } from "./model";
import { trFold } from "./text";

/** Eski sürümün otomatik işlem açıklamasına eklediği ek. Yeni sürüm bu eki YAZMAZ. */
export const AUTO_SUFFIX = " (Otomatik)";

export interface RecurrenceRule {
  frequency: Frequency;
  startDate: LocalDate;
}

/**
 * [from, to] aralığındaki vadeler (uçlar dahil). Her vade startDate'ten hesaplanır:
 * 31 Ocak aylık -> 28 Şub, 31 Mar, 30 Nis. Zincirleme kayma olmaz.
 */
export function occurrencesBetween(rule: RecurrenceRule, from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const start = rule.startDate;
  const lower = maxDate(from, start);
  if (to < lower) return out;

  if (rule.frequency === "weekly") {
    let k = Math.ceil(diffDays(start, lower) / 7);
    for (let d = addDays(start, k * 7); d <= to; k += 1, d = addDays(start, k * 7)) out.push(d);
    return out;
  }

  const step = rule.frequency === "yearly" ? 12 : 1;
  const s = dateParts(start);
  const l = dateParts(lower);
  const monthsApart = (l.year - s.year) * 12 + (l.month - s.month);
  let k = Math.max(0, Math.floor(monthsApart / step) - 1);
  for (;;) {
    const d = addMonthsAnchored(start, k * step);
    if (d > to) break;
    if (d >= lower) out.push(d);
    k += 1;
  }
  return out;
}

/** day'den SONRAKİ ilk vade. */
export function nextOccurrenceAfter(rule: RecurrenceRule, day: LocalDate): LocalDate {
  if (day < rule.startDate) return rule.startDate;
  const from = addDays(day, 1);
  const window = rule.frequency === "weekly" ? 7 : rule.frequency === "monthly" ? 32 : 367;
  const found = occurrencesBetween(rule, from, addDays(from, window))[0];
  // Pencere her sıklıkta en az bir vade içerir; yine de tip güvenliği için geri dönüş.
  return found ?? from;
}

/** Üretilen işlemin doküman kimliği: aynı vade iki kez yazılamaz. */
export function autoTransactionId(recurringId: string, due: LocalDate): string {
  return `${recurringId}_${due}`;
}

function hasLegacySuffix(description: string): boolean {
  return description.trimEnd().endsWith(AUTO_SUFFIX.trim()) && description.trimEnd().length > AUTO_SUFFIX.trim().length;
}

/** Eski " (Otomatik)" eki olmadan açıklama. */
export function stripAutoSuffix(description: string): string {
  if (!hasLegacySuffix(description)) return description;
  const trimmed = description.trimEnd();
  return trimmed.slice(0, trimmed.length - AUTO_SUFFIX.trim().length).trimEnd();
}

/** Eski sürümün ürettiği otomatik kayıt: bağlantı alanı yok, kategori abonelik, açıklama ekli. */
export function isLegacyAutoTransaction(tx: Transaction): boolean {
  return !tx.recurringId && tx.type === "expense" && tx.category === "abonelik" && hasLegacySuffix(tx.description);
}

/** Düzenli ödemeden üretilmiş (gelir ya da gider) kayıt. */
export function isGeneratedTransaction(tx: Transaction): boolean {
  return Boolean(tx.recurringId) || isLegacyAutoTransaction(tx);
}

/**
 * Bütçedeki `autoTx`: düzenli ödemeden üretilmiş GİDER.
 * Yeni kayıtta recurringId, eski kayıtta kategori abonelik + " (Otomatik)" eki.
 */
export function isAutoTransaction(tx: Transaction): boolean {
  return tx.type === "expense" && isGeneratedTransaction(tx);
}

function vade(tx: Transaction): LocalDate {
  return tx.dueDate ?? tx.date;
}

function newKey(recurringId: string, due: LocalDate): string {
  return `${recurringId}|${due}`;
}

function legacyKey(date: LocalDate, description: string): string {
  return `${date}|${trFold(stripAutoSuffix(description))}`;
}

/**
 * Hangi vadelerin zaten işlemi var. Eşleştirme kuralı:
 * 1. Yeni kayıt: recurringId + vade günü (dueDate) birebir.
 * 2. Eski " (Otomatik)" kaydı: ad (eksiz, katlanmış) + aynı gün.
 * 3. Eski kayıt, AYLIK ve YILLIK ödemede: ad + aynı takvim ayı. Eski sürüm 31'i vadesini 28'ine kaydırıp
 *    yazdığı için gün tutmaz; aylık ve yıllık ödemenin bir takvim ayında en fazla bir vadesi vardır.
 * Haftalık ödemede 3. kural YOKTUR (ayda 4-5 vade): yalnız aynı gün eşleşir. Gün toleransı kullanılmaz.
 */
export interface OccurrenceIndex {
  has(rec: Pick<Recurring, "id" | "description"> & { frequency?: Frequency }, due: LocalDate): boolean;
}

export function indexGenerated(transactions: readonly Transaction[]): OccurrenceIndex {
  const fresh = new Set<string>();
  const legacy = new Set<string>();
  const legacyMonth = new Set<string>();
  const monthKey = (date: LocalDate, description: string): string =>
    `${date.slice(0, 7)}|${trFold(stripAutoSuffix(description))}`;
  for (const t of transactions) {
    if (t.recurringId) fresh.add(newKey(t.recurringId, vade(t)));
    else if (isLegacyAutoTransaction(t)) {
      legacy.add(legacyKey(t.date, t.description));
      legacyMonth.add(monthKey(t.date, t.description));
    }
  }
  return {
    has: (rec, due) =>
      fresh.has(newKey(rec.id, due)) ||
      legacy.has(legacyKey(due, rec.description)) ||
      ((rec.frequency === "monthly" || rec.frequency === "yearly") && legacyMonth.has(monthKey(due, rec.description))),
  };
}

/**
 * İşlemi henüz olmayan vadeler: imleçten (nextDueDate) `to` gününe kadar.
 * İmleçten önceki vadeler işlenmiş sayılır (kullanıcı silmiş ya da eski sürüm başka güne yazmış olabilir).
 */
export function unmatchedOccurrences(
  rec: Recurring,
  from: LocalDate,
  to: LocalDate,
  index: OccurrenceIndex,
): LocalDate[] {
  if (!rec.isActive) return [];
  const lower = maxDate(from, rec.nextDueDate);
  return occurrencesBetween(rec, lower, to).filter((due) => !index.has(rec, due));
}

export interface RecurringUpdate {
  id: string;
  nextDueDate: LocalDate;
  lastProcessedDate: LocalDate;
}

export interface ProcessRecurringResult {
  /** Yazılacak işlemler. Kimlik deterministik: `setDoc(id)` ile yazılır, ikinci yazım aynı dokümanı ezer. */
  create: Transaction[];
  /** Düzenli ödeme dokümanına yazılacak alanlar (eski sürüm bu imleci okur). */
  update: RecurringUpdate[];
}

/**
 * Kaçan TÜM vadeleri tek seferde üretir (uygulama 3 ay açılmadıysa 3 kayıt).
 * Saf fonksiyon: aynı girdiyle iki kez çağrılırsa aynı kimlikleri verir, yazıldıktan sonra boş döner.
 */
export function processRecurring(
  recurrences: readonly Recurring[],
  transactions: readonly Transaction[],
  today: LocalDate,
  now: number,
): ProcessRecurringResult {
  const index = indexGenerated(transactions);
  const create: Transaction[] = [];
  const update: RecurringUpdate[] = [];
  for (const rec of recurrences) {
    if (!rec.isActive || rec.nextDueDate > today) continue;
    for (const due of unmatchedOccurrences(rec, rec.nextDueDate, today, index)) {
      create.push({
        id: autoTransactionId(rec.id, due),
        userId: rec.userId,
        description: rec.description,
        amount: rec.amount,
        type: rec.type,
        category: rec.category,
        date: due,
        createdAt: now,
        recurringId: rec.id,
        dueDate: due,
      });
    }
    update.push({ id: rec.id, nextDueDate: nextOccurrenceAfter(rec, today), lastProcessedDate: today });
  }
  return { create, update };
}

/** YENİ eklenen düzenli ödemenin imleci: ilk vade başlangıç günüdür (geçmişteyse kaçan vadeler üretilir). */
export function initialNextDueDate(rule: RecurrenceRule): LocalDate {
  return rule.startDate;
}

/**
 * Var olan düzenli ödemenin ilk ödeme tarihi ya da sıklığı DÜZENLENİNCE yazılacak imleç.
 * Eski sürümde düzenleme imleci değiştirmiyordu (denetim 3.4.6). İmleci başlangıca çekmek ise
 * geçmiş vadelerin hepsini yeni günle yeniden üretir: bu yüzden ödenmiş çevrimler korunur,
 * yeni imleç eski imlece EN YAKIN yeni vadedir (5'inden 10'una: 5 Aralık -> 10 Aralık; 1'ine: 1 Aralık).
 * Hiç işlenmemiş ödemede (imleç başlangıçtaysa) yeni başlangıç kullanılır.
 */
export function nextDueDateAfterEdit(
  previous: Pick<Recurring, "startDate" | "nextDueDate">,
  edited: RecurrenceRule,
): LocalDate {
  const cursor = previous.nextDueDate;
  if (cursor <= previous.startDate) return edited.startDate;
  const window = 367;
  const after = occurrencesBetween(edited, cursor, addDays(cursor, window))[0];
  const beforeList = occurrencesBetween(edited, addDays(cursor, -window), addDays(cursor, -1));
  const before = beforeList[beforeList.length - 1];
  if (after === undefined) return before ?? edited.startDate;
  if (before === undefined) return after;
  return diffDays(before, cursor) < diffDays(cursor, after) ? before : after;
}

export interface DedupeResult {
  kept: Transaction[];
  duplicates: Transaction[];
}

function older(a: Transaction, b: Transaction): boolean {
  return a.createdAt < b.createdAt || (a.createdAt === b.createdAt && a.id < b.id);
}

/**
 * Eski sürümün aynı vadeyi iki kez yazdığı kayıtları ayıklar. Aynı vade:
 * recurringId + vade günü eşit, ya da en az biri eski kayıt ve gün + ad + tutar eşit.
 * Tutulan: recurringId taşıyan; yoksa en eski kayıt. Otomatik olmayan işlemlere dokunulmaz.
 */
export function dedupeAutoTransactions(transactions: readonly Transaction[]): DedupeResult {
  const winnerByNewKey = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.recurringId) continue;
    const key = newKey(t.recurringId, vade(t));
    const cur = winnerByNewKey.get(key);
    if (!cur || older(t, cur)) winnerByNewKey.set(key, t);
  }
  const fullKey = (t: Transaction): string => `${legacyKey(vade(t), t.description)}|${t.amount}|${t.type}`;
  const takenByNew = new Set<string>();
  for (const t of winnerByNewKey.values()) takenByNew.add(fullKey(t));

  const winnerByLegacyKey = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!isLegacyAutoTransaction(t)) continue;
    const key = fullKey(t);
    if (takenByNew.has(key)) continue;
    const cur = winnerByLegacyKey.get(key);
    if (!cur || older(t, cur)) winnerByLegacyKey.set(key, t);
  }

  const kept: Transaction[] = [];
  const duplicates: Transaction[] = [];
  for (const t of transactions) {
    let keep = true;
    if (t.recurringId) keep = winnerByNewKey.get(newKey(t.recurringId, vade(t))) === t;
    else if (isLegacyAutoTransaction(t)) keep = winnerByLegacyKey.get(fullKey(t)) === t;
    (keep ? kept : duplicates).push(t);
  }
  return { kept, duplicates };
}

/** Çiftleri ayıklanmış işlem listesi. Toplam gösteren her yer bunu kullanır. */
export function effectiveTransactions(transactions: readonly Transaction[]): Transaction[] {
  return dedupeAutoTransactions(transactions).kept;
}
