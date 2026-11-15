import { describe, expect, it } from "vitest";
import {
  activationPatch,
  activePeriod,
  guestStorageKeys,
  readGuestList,
  readPeriod,
  readRecurring,
  readSettings,
  readTransaction,
  withId,
  writePeriod,
  writeRecurring,
  writeSettings,
  writeTransaction,
  type Period,
} from "./model";
import { D } from "./testkit";

const must = <T>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};

describe("model: işlem", () => {
  const legacy = {
    userId: "u1",
    description: "Haftalık Alışveriş",
    amount: 1250.5,
    type: "expense",
    category: "Gıda & Market",
    date: "2026-11-05",
    createdAt: 1731000000000,
  };

  it("eski Firestore kaydını okur: TL ondalık kuruşa, eski kategori anahtara", () => {
    const t = must(readTransaction("doc1", legacy));
    expect(t).toEqual({
      id: "doc1",
      userId: "u1",
      description: "Haftalık Alışveriş",
      amount: 125050,
      type: "expense",
      category: "market",
      date: "2026-11-05",
      createdAt: 1731000000000,
    });
  });
  it("doküman içindeki id alanı yok sayılır, doc.id esas alınır (denetim 2.2)", () => {
    const t = must(readTransaction("gercek", { ...legacy, id: "eski-kopya" }));
    expect(t.id).toBe("gercek");
    expect(writeTransaction(t)).not.toHaveProperty("id");
  });
  it("geri yazınca eski alan adları ve anlamları korunur", () => {
    const t = must(readTransaction("doc1", { ...legacy, category: "Market & Pazar" }));
    expect(writeTransaction(t)).toEqual({ ...legacy, category: "Market & Pazar" });
  });
  it("yeni alanlar: düzenli ödeme ve taksit bağlantıları gidiş dönüş korunur", () => {
    const raw = {
      ...legacy,
      category: "Abonelikler",
      recurringId: "r1",
      dueDate: "2026-11-05",
      installmentGroupId: "g1",
      installmentIndex: 2,
      installmentCount: 6,
    };
    const t = must(readTransaction("r1_2026-11-05", raw));
    expect(t.recurringId).toBe("r1");
    expect(t.dueDate).toBe("2026-11-05");
    expect(t.installmentIndex).toBe(2);
    expect(writeTransaction(t)).toEqual(raw);
  });
  it("planlı işareti: yalnız giderde ve yalnız true okunur, gidiş dönüş korunur", () => {
    const t = must(readTransaction("x", { ...legacy, planned: true }));
    expect(t.planned).toBe(true);
    expect(writeTransaction(t)).toMatchObject({ planned: true });
    expect(must(readTransaction("x", { ...legacy, planned: "evet" }))).not.toHaveProperty("planned");
    expect(must(readTransaction("x", { ...legacy, type: "income", planned: true }))).not.toHaveProperty("planned");
    expect(writeTransaction(must(readTransaction("x", legacy)))).not.toHaveProperty("planned");
  });
  it("NaN, negatif ve bozuk tutarı reddeder (denetim 3.7), 0 tutarı uyarıyla okur", () => {
    for (const amount of [NaN, -5, Infinity, "abc", undefined, null]) {
      expect(readTransaction("x", { ...legacy, amount }).ok).toBe(false);
    }
    const zero = readTransaction("x", { ...legacy, amount: 0 });
    expect(zero.ok && zero.warnings).toEqual(["tutar 0"]);
  });
  it("bozuk tarih, tür ve nesne olmayan kaydı reddeder", () => {
    expect(readTransaction("x", { ...legacy, date: "2026-02-30" }).ok).toBe(false);
    expect(readTransaction("x", { ...legacy, date: 20261105 }).ok).toBe(false);
    expect(readTransaction("x", { ...legacy, type: "transfer" }).ok).toBe(false);
    expect(readTransaction("x", null).ok).toBe(false);
    expect(readTransaction("x", [legacy]).ok).toBe(false);
  });
  it("saat ekli tarih metninden takvim gününü alır, UTC'ye çevirmez", () => {
    expect(must(readTransaction("x", { ...legacy, date: "2026-11-30T23:30:00+03:00" })).date).toBe("2026-11-30");
  });
  it("eksik metin alanları boş okunur, bilinmeyen kategori diğer olur", () => {
    const t = must(readTransaction("x", { amount: 10, type: "income", date: "2026-01-01", category: "???" }));
    expect(t.description).toBe("");
    expect(t.userId).toBe("");
    expect(t.createdAt).toBe(0);
    expect(t.category).toBe("diger_gelir");
  });
});

describe("model: dönem ve düzenli ödeme", () => {
  it("dönem gidiş dönüş, isActive yok sayılır", () => {
    const raw = { userId: "u1", name: "Kasım", startDate: "2026-11-01", endDate: "2026-11-30", monthlyIncome: 45000, fixedExpenses: 12850.75, isActive: true };
    const p = must(readPeriod("p1", raw));
    expect(p).toEqual({ id: "p1", userId: "u1", name: "Kasım", start: "2026-11-01", end: "2026-11-30", plannedIncome: 4500000, fixedExpenses: 1285075 });
    const { isActive: _yok, ...beklenen } = raw;
    expect(writePeriod(p)).toEqual(beklenen);
  });
  it("negatif ve NaN gelir ya da gider 0 sayılır, uyarı verir (denetim 3.7)", () => {
    const r = readPeriod("p1", { startDate: "2026-11-01", endDate: "2026-11-30", monthlyIncome: -100, fixedExpenses: NaN });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.plannedIncome).toBe(0);
      expect(r.value.fixedExpenses).toBe(0);
      expect(r.warnings.length).toBe(2);
    }
    expect(readPeriod("p1", { startDate: "bozuk", endDate: "2026-11-30" }).ok).toBe(false);
  });
  it("düzenli ödeme gidiş dönüş", () => {
    const raw = {
      userId: "u1",
      type: "expense",
      category: "Abonelikler",
      amount: 229.99,
      description: "Müzik üyeliği",
      frequency: "monthly",
      startDate: "2026-01-31",
      nextDueDate: "2026-11-30",
      isActive: true,
      lastProcessedDate: "2026-11-02",
    };
    const r = must(readRecurring("r1", { ...raw, id: "icerideki" }));
    expect(r.id).toBe("r1");
    expect(r.amount).toBe(22999);
    expect(r.category).toBe("abonelik");
    expect(writeRecurring(r)).toEqual(raw);
  });
  it("düzenli ödemede NaN ve negatif tutar reddedilir, bozuk sonraki vade başlangıca düşer", () => {
    const base = { type: "expense", category: "Abonelikler", amount: 10, description: "a", frequency: "monthly", startDate: "2026-01-31", nextDueDate: "2026-02-28", isActive: true };
    expect(readRecurring("r", { ...base, amount: NaN }).ok).toBe(false);
    expect(readRecurring("r", { ...base, amount: -3 }).ok).toBe(false);
    const r = must(readRecurring("r", { ...base, nextDueDate: "" }));
    expect(r.nextDueDate).toBe("2026-01-31");
  });
});

describe("model: ayarlar", () => {
  const raw = {
    userId: "u1",
    periodName: "Kasım",
    periodStartDate: "2026-11-01",
    periodEndDate: "2026-11-30",
    monthlyIncome: 30000,
    fixedExpenses: 5000,
    currency: "TRY",
  };

  it("Nova alanları eksikse varsayılanlar (denetim 2.2)", () => {
    const s = must(readSettings("u1", raw));
    expect(s.financialGoal).toBe("stability");
    expect(s.savingsStyle).toBe("balanced");
    expect(s.riskTolerance).toBe("medium");
    expect(s.period).toEqual({ name: "Kasım", start: "2026-11-01", end: "2026-11-30", plannedIncome: 3000000, fixedExpenses: 500000 });
    expect(s.payday).toBeUndefined();
  });
  it("yeni alanlar okunur ve yazılır", () => {
    const s = must(readSettings("u1", { ...raw, activePeriodId: "p1", payday: 15, financialGoal: "savings" }));
    expect(s.activePeriodId).toBe("p1");
    expect(s.payday).toBe(15);
    const out = writeSettings(s);
    expect(out).toMatchObject({ ...raw, activePeriodId: "p1", payday: 15, financialGoal: "savings" });
    expect(must(readSettings("u1", { ...raw, payday: 45 })).payday).toBeUndefined();
  });
  it("dönem tarihi yoksa period null, yazarken dönem alanları hiç çıkmaz", () => {
    const s = must(readSettings("u1", { userId: "u1", financialGoal: "investment" }));
    expect(s.period).toBeNull();
    const out = writeSettings(s);
    expect(out).not.toHaveProperty("periodStartDate");
    expect(out).not.toHaveProperty("monthlyIncome");
  });
  it("dönem aktif etme yaması Nova alanlarına dokunmaz (denetim 3.9)", () => {
    const period: Period = { id: "p2", userId: "u1", name: "Aralık", start: D("2026-12-01"), end: D("2026-12-31"), plannedIncome: 3000000, fixedExpenses: 0 };
    const patch = activationPatch(period);
    for (const key of ["financialGoal", "savingsStyle", "riskTolerance", "payday"]) expect(patch).not.toHaveProperty(key);
    expect(patch).toMatchObject({ periodName: "Aralık", periodStartDate: "2026-12-01", periodEndDate: "2026-12-31", monthlyIncome: 30000, fixedExpenses: 0, activePeriodId: "p2" });
    // Birleştirerek yazma benzetimi
    const merged = { ...raw, financialGoal: "savings", savingsStyle: "strict", ...patch };
    const s = must(readSettings("u1", merged));
    expect(s.financialGoal).toBe("savings");
    expect(s.savingsStyle).toBe("strict");
    expect(s.period?.name).toBe("Aralık");
  });
  it("aktif dönem eşleşmesi: önce activePeriodId, sonra ad + başlangıç, yoksa 'active' (denetim 3.10)", () => {
    const mk = (id: string, name: string, start: string): Period => ({ id, userId: "u1", name, start: D(start), end: D("2026-11-30"), plannedIncome: 1, fixedExpenses: 0 });
    const periods = [mk("a", "Kasım", "2026-11-01"), mk("b", "Kasım", "2026-11-01"), mk("c", "Ekim", "2026-10-01")];
    const s = must(readSettings("u1", raw));
    expect(activePeriod({ ...s, activePeriodId: "b" }, periods)?.id).toBe("b");
    expect(activePeriod(s, periods)?.id).toBe("a");
    expect(activePeriod({ ...s, activePeriodId: "silinmis" }, periods)?.id).toBe("a");
    expect(activePeriod(s, [])?.id).toBe("active");
    // Değerler settings kopyasından gelir
    expect(activePeriod(s, periods)?.plannedIncome).toBe(3000000);
    expect(activePeriod(null, periods)).toBeNull();
    expect(activePeriod({ ...s, period: null }, periods)).toBeNull();
  });
});

describe("model: misafir (localStorage)", () => {
  it("anahtarlar eski sürümle aynı", () => {
    expect(guestStorageKeys("guest_abc")).toEqual({
      transactions: "tx_guest_abc",
      settings: "settings_guest_abc",
      periods: "periods_guest_abc",
      recurring: "recurring_guest_abc",
    });
  });
  it("dizide kimlik nesnenin içindeki id'dir, bozuk öğe atlanır", () => {
    const json = JSON.stringify([
      { id: "t1", userId: "guest_1", description: "Benzin", amount: 350, type: "expense", category: "Ulaşım", date: "2026-11-07", createdAt: 1 },
      { userId: "guest_1", amount: 5, type: "expense", date: "2026-11-07" },
      { id: "t3", userId: "guest_1", amount: "NaN", type: "expense", date: "2026-11-07" },
      null,
    ]);
    const r = readGuestList(json, readTransaction);
    expect(r.items.map((t) => t.id)).toEqual(["t1"]);
    expect(r.items[0]?.category).toBe("toplu_tasima");
    expect(r.skipped.map((s) => s.index)).toEqual([1, 2, 3]);
  });
  it("bozuk JSON ve dizi olmayan veri hata fırlatmaz", () => {
    expect(readGuestList("{bozuk", readTransaction).items).toEqual([]);
    expect(readGuestList(null, readTransaction).items).toEqual([]);
    expect(readGuestList({ a: 1 }, readTransaction).items).toEqual([]);
  });
  it("misafir dizisine yazarken kimlik eklenir ve geri okunur", () => {
    const t = must(readTransaction("t9", { userId: "guest_1", description: "Deneme kaydı", amount: 12.5, type: "expense", category: "Market & Pazar", date: "2026-11-07", createdAt: 5 }));
    const stored = JSON.stringify([withId(writeTransaction(t), t.id)]);
    expect(readGuestList(stored, readTransaction).items).toEqual([t]);
  });
});
