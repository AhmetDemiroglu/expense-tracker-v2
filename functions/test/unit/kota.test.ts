import { describe, expect, it } from "vitest";
import { DAILY_LIMITS } from "../../src/ayarlar";
import { MemoryQuotaStore, planRefund, planReserve, quotaDay, quotaResetsAt } from "../../src/kota";
import { expectCode } from "./yardimci";

describe("kota günü", () => {
  it("İstanbul gece yarısında değişir (UTC 21:00)", () => {
    expect(quotaDay(new Date("2026-11-15T20:59:59Z"))).toBe("2026-11-15");
    expect(quotaDay(new Date("2026-11-15T21:00:00Z"))).toBe("2026-11-16");
  });
  it("sıfırlanma zamanı ertesi gün 00:00 +03:00, ay ve yıl sonunda doğru", () => {
    expect(quotaResetsAt("2026-11-15")).toBe("2026-11-16T00:00:00+03:00");
    expect(quotaResetsAt("2026-12-31")).toBe("2027-01-01T00:00:00+03:00");
    expect(quotaResetsAt("2028-02-28")).toBe("2028-02-29T00:00:00+03:00");
  });
  it("değerler tek yerde: fiş 30, rapor 10, sohbet 60", () => {
    expect(DAILY_LIMITS).toEqual({ receipt: 30, report: 10, chat: 60 });
  });
});

describe("kota kararı", () => {
  it("ilk istek 1 yazar, diğer sayaçlar 0", () => {
    const p = planReserve(undefined, "2026-11-15", "chat");
    expect(p).toEqual({ ok: true, used: 1, next: { day: "2026-11-15", receipt: 0, report: 0, chat: 1 } });
  });
  it("sınıra gelince reddeder", () => {
    expect(planReserve({ day: "2026-11-15", report: 10 }, "2026-11-15", "report").ok).toBe(false);
    expect(planReserve({ day: "2026-11-15", report: 9 }, "2026-11-15", "report").ok).toBe(true);
  });
  it("gün değişince tüm sayaçlar sıfırlanır", () => {
    const p = planReserve({ day: "2026-11-14", report: 10, chat: 60, receipt: 30 }, "2026-11-15", "report");
    expect(p).toEqual({ ok: true, used: 1, next: { day: "2026-11-15", receipt: 0, report: 1, chat: 0 } });
  });
  it("bozuk sayaç 0 kabul edilir", () => {
    const p = planReserve({ day: "2026-11-15", chat: -5 } as never, "2026-11-15", "chat");
    expect(p.ok && p.used).toBe(1);
  });
  it("iade sıfırın altına inmez, gün değiştiyse dokunmaz", () => {
    expect(planRefund({ day: "2026-11-15", chat: 0 }, "2026-11-15", "chat")).toBeNull();
    expect(planRefund({ day: "2026-11-14", chat: 3 }, "2026-11-15", "chat")).toBeNull();
    expect(planRefund({ day: "2026-11-15", chat: 3 }, "2026-11-15", "chat")).toEqual({ day: "2026-11-15", chat: 2 });
  });
});

describe("bellek içi depo", () => {
  it("30 fişten sonra QUOTA_EXCEEDED ve ayrıntı", async () => {
    const store = new MemoryQuotaStore();
    const now = new Date("2026-11-15T10:00:00Z");
    for (let i = 1; i <= 30; i++) expect((await store.reserve("u1", "receipt", now)).used).toBe(i);
    const e = await expectCode(store.reserve("u1", "receipt", now), "QUOTA_EXCEEDED");
    expect(e.code).toBe("resource-exhausted");
    expect(e.details).toMatchObject({ op: "receipt", limit: 30, used: 30, resetsAt: "2026-11-16T00:00:00+03:00" });
    // Başka kullanıcı ve başka işlem etkilenmez.
    expect((await store.reserve("u2", "receipt", now)).used).toBe(1);
    expect((await store.reserve("u1", "chat", now)).used).toBe(1);
    // Ertesi gün açılır.
    expect((await store.reserve("u1", "receipt", new Date("2026-11-15T21:00:01Z"))).used).toBe(1);
  });
});
