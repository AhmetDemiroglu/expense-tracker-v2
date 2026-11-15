// Kullanıcı başı günlük kota. Sayaç Gemini çağrısından önce ayrılır, AI hatasında iade edilir.
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { DAILY_LIMITS, QUOTA_TIME_ZONE, QUOTA_TZ_OFFSET, USAGE_COLLECTION, type AiOp } from "./ayarlar";
import { apiError } from "./hatalar";

export type UsageDoc = {
  day?: string;
  receipt?: number;
  report?: number;
  chat?: number;
};

export type Usage = { op: AiOp; used: number; limit: number };

/** Kota günü: İstanbul takvim günü, "yyyy-MM-dd". */
export function quotaDay(now: Date): string {
  // en-CA biçimi yyyy-MM-dd verir.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Verilen kota gününün ertesi gece yarısı (İstanbul), ISO metni. */
export function quotaResetsAt(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const iso = next.toISOString().slice(0, 10);
  return `${iso}T00:00:00${QUOTA_TZ_OFFSET}`;
}

/** Gün değişmişse sayaçlar sıfır kabul edilir. */
export function currentCount(doc: UsageDoc | undefined, day: string, op: AiOp): number {
  if (!doc || doc.day !== day) return 0;
  const n = doc[op];
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Saf karar: yeni doküman ya da kota hatası.
 * Gün değiştiyse tüm sayaçlar sıfırlanır, yalnız istenen işlem 1 olur.
 */
export function planReserve(
  doc: UsageDoc | undefined,
  day: string,
  op: AiOp,
  limit: number = DAILY_LIMITS[op],
): { ok: true; next: UsageDoc; used: number } | { ok: false; used: number } {
  const used = currentCount(doc, day, op);
  if (used >= limit) return { ok: false, used };
  const base: UsageDoc =
    doc && doc.day === day
      ? { day, receipt: currentCount(doc, day, "receipt"), report: currentCount(doc, day, "report"), chat: currentCount(doc, day, "chat") }
      : { day, receipt: 0, report: 0, chat: 0 };
  return { ok: true, next: { ...base, [op]: used + 1 }, used: used + 1 };
}

/** İade: aynı gün ise sayacı bir azaltır, sıfırın altına inmez. Gün değiştiyse dokunmaz. */
export function planRefund(doc: UsageDoc | undefined, day: string, op: AiOp): UsageDoc | null {
  const used = currentCount(doc, day, op);
  if (!doc || doc.day !== day || used === 0) return null;
  return { ...doc, [op]: used - 1 };
}

export interface QuotaStore {
  /** Hakkı ayırır, aşımda QUOTA_EXCEEDED fırlatır. */
  reserve(uid: string, op: AiOp, now: Date): Promise<Usage>;
  /** Ayrılan hakkı geri verir (AI hatası). Hata fırlatmaz. */
  refund(uid: string, op: AiOp, now: Date): Promise<void>;
}

export function quotaExceeded(op: AiOp, used: number, day: string) {
  return apiError("QUOTA_EXCEEDED", {
    op,
    limit: DAILY_LIMITS[op],
    used,
    resetsAt: quotaResetsAt(day),
  });
}

/** Firestore uygulaması: tek doküman, işlem (transaction) içinde oku-yaz. */
export class FirestoreQuotaStore implements QuotaStore {
  constructor(private readonly db: Firestore) {}

  async reserve(uid: string, op: AiOp, now: Date): Promise<Usage> {
    const day = quotaDay(now);
    const ref = this.db.collection(USAGE_COLLECTION).doc(uid);
    const used = await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const plan = planReserve(snap.exists ? (snap.data() as UsageDoc) : undefined, day, op);
      if (!plan.ok) throw quotaExceeded(op, plan.used, day);
      tx.set(ref, { ...plan.next, updatedAt: FieldValue.serverTimestamp() });
      return plan.used;
    });
    return { op, used, limit: DAILY_LIMITS[op] };
  }

  async refund(uid: string, op: AiOp, now: Date): Promise<void> {
    const day = quotaDay(now);
    const ref = this.db.collection(USAGE_COLLECTION).doc(uid);
    try {
      await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const next = planRefund(snap.exists ? (snap.data() as UsageDoc) : undefined, day, op);
        if (next) tx.set(ref, { ...next, updatedAt: FieldValue.serverTimestamp() });
      });
    } catch {
      // İade başarısızsa kullanıcı en fazla bir hak kaybeder; ana hata istemciye döner.
    }
  }
}

/** Testler için bellek içi uygulama (gerçek mantığı paylaşır). */
export class MemoryQuotaStore implements QuotaStore {
  readonly docs = new Map<string, UsageDoc>();

  async reserve(uid: string, op: AiOp, now: Date): Promise<Usage> {
    const day = quotaDay(now);
    const plan = planReserve(this.docs.get(uid), day, op);
    if (!plan.ok) throw quotaExceeded(op, plan.used, day);
    this.docs.set(uid, plan.next);
    return { op, used: plan.used, limit: DAILY_LIMITS[op] };
  }

  async refund(uid: string, op: AiOp, now: Date): Promise<void> {
    const next = planRefund(this.docs.get(uid), quotaDay(now), op);
    if (next) this.docs.set(uid, next);
  }
}
