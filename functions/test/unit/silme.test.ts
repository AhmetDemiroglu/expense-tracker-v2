import { describe, expect, it } from "vitest";
import { handleDeleteAccount, type AccountStore, type UserCollection } from "../../src/silme";
import { expectCode } from "./yardimci";

const NOW = Date.parse("2026-11-15T10:00:00Z");
const fresh = { uid: "u1", authTime: NOW / 1000 - 60 };

function fakeStore(failOn?: string) {
  const log: string[] = [];
  const store: AccountStore = {
    async deleteWhereUser(c: UserCollection, uid: string) {
      log.push(`${c}:${uid}`);
      if (failOn === c) throw new Error("ağ");
      return { transactions: 3, budget_periods: 2, recurring_transactions: 1 }[c];
    },
    async deleteDoc(c: string, id: string) {
      log.push(`${c}/${id}`);
      return 1;
    },
    async deleteAuthUser(uid: string) {
      log.push(`auth:${uid}`);
    },
  };
  return { store, log };
}

describe("deleteAccount", () => {
  it("sıra: veri koleksiyonları, settings, ai_usage, en son Auth", async () => {
    const f = fakeStore();
    const r = await handleDeleteAccount(fresh, f.store, NOW);
    expect(f.log).toEqual([
      "transactions:u1",
      "budget_periods:u1",
      "recurring_transactions:u1",
      "settings/u1",
      "ai_usage/u1",
      "auth:u1",
    ]);
    expect(r.deleted).toEqual({ transactions: 3, budget_periods: 2, recurring_transactions: 1, settings: 1, ai_usage: 1 });
  });

  it("oturumsuz AUTH_REQUIRED", async () => {
    await expectCode(handleDeleteAccount(null, fakeStore().store, NOW), "AUTH_REQUIRED");
  });

  it("son giriş 5 dakikadan eskiyse REAUTH_REQUIRED, hiçbir şey silinmez", async () => {
    const f = fakeStore();
    await expectCode(handleDeleteAccount({ uid: "u1", authTime: NOW / 1000 - 301 }, f.store, NOW), "REAUTH_REQUIRED");
    await expectCode(handleDeleteAccount({ uid: "u1" }, f.store, NOW), "REAUTH_REQUIRED");
    await expectCode(handleDeleteAccount({ uid: "u1", authTime: NaN }, f.store, NOW), "REAUTH_REQUIRED");
    expect(f.log).toEqual([]);
  });

  it("yarıda hata: DELETE_FAILED, Auth kullanıcısı silinmez (tekrar denenebilir)", async () => {
    const f = fakeStore("budget_periods");
    await expectCode(handleDeleteAccount(fresh, f.store, NOW), "DELETE_FAILED");
    expect(f.log).not.toContain("auth:u1");
  });
});
