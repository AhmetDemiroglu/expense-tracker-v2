// deleteAccount iş mantığı. Sıra: kullanıcı verisi -> settings -> ai_usage -> Auth.
// Auth en sonda: veri silinemezse kullanıcı hesabı kalır ve yeniden deneyebilir (idempotent).
import { REAUTH_MAX_AGE_SECONDS, USAGE_COLLECTION } from "./ayarlar";
import { apiError, isApiError } from "./hatalar";

export const USER_COLLECTIONS = ["transactions", "budget_periods", "recurring_transactions"] as const;
export type UserCollection = (typeof USER_COLLECTIONS)[number];

export type DeleteSummary = {
  transactions: number;
  budget_periods: number;
  recurring_transactions: number;
  settings: number;
  ai_usage: number;
};

export interface AccountStore {
  /** `userId == uid` olan dokümanları siler, silinen sayıyı döner. */
  deleteWhereUser(collection: UserCollection, uid: string): Promise<number>;
  /** Tek dokümanı siler, vardıysa 1 döner. */
  deleteDoc(collection: string, id: string): Promise<number>;
  /** Auth kullanıcısını siler. Kullanıcı yoksa hata fırlatmaz. */
  deleteAuthUser(uid: string): Promise<void>;
}

export type DeleteCaller = { uid: string; authTime?: number } | null;

export function requireRecentLogin(caller: DeleteCaller, nowMs: number): { uid: string } {
  if (!caller?.uid) throw apiError("AUTH_REQUIRED");
  const authTime = caller.authTime;
  if (typeof authTime !== "number" || !Number.isFinite(authTime)) throw apiError("REAUTH_REQUIRED");
  const ageSeconds = nowMs / 1000 - authTime;
  // Saat kayması için 60 sn geleceği tolere et.
  if (ageSeconds > REAUTH_MAX_AGE_SECONDS || ageSeconds < -60) {
    throw apiError("REAUTH_REQUIRED", { maxAgeSeconds: REAUTH_MAX_AGE_SECONDS });
  }
  return { uid: caller.uid };
}

export async function handleDeleteAccount(
  caller: DeleteCaller,
  store: AccountStore,
  nowMs: number,
  log: (msg: string, data?: Record<string, unknown>) => void = () => {},
): Promise<{ deleted: DeleteSummary }> {
  const { uid } = requireRecentLogin(caller, nowMs);
  const deleted: DeleteSummary = { transactions: 0, budget_periods: 0, recurring_transactions: 0, settings: 0, ai_usage: 0 };
  try {
    for (const c of USER_COLLECTIONS) deleted[c] = await store.deleteWhereUser(c, uid);
    deleted.settings = await store.deleteDoc("settings", uid);
    deleted.ai_usage = await store.deleteDoc(USAGE_COLLECTION, uid);
    await store.deleteAuthUser(uid);
  } catch (e) {
    if (isApiError(e)) throw e;
    log("deleteAccount failed", { error: e instanceof Error ? e.name : "unknown", deleted });
    throw apiError("DELETE_FAILED");
  }
  log("deleteAccount ok", { deleted });
  return { deleted };
}
