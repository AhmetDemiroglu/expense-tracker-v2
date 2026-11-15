import { describe, expect, it } from "vitest";
import type { Transaction } from "./model";
import {
  AUTO_SUFFIX,
  autoTransactionId,
  dedupeAutoTransactions,
  effectiveTransactions,
  isAutoTransaction,
  isLegacyAutoTransaction,
  nextOccurrenceAfter,
  occurrencesBetween,
  processRecurring,
  stripAutoSuffix,
} from "./recurrence";
import { D, rec, rng, tx } from "./testkit";
import { addDays, daysInclusive } from "./date";

const legacyAuto = (date: string, name: string, amount: number, extra: Partial<Transaction> = {}): Transaction =>
  tx(date, amount, { category: "abonelik", description: `${name}${AUTO_SUFFIX}`, ...extra });

describe("recurrence: vadeler", () => {
  it("31 Ocak aylık zincir kaymaz: 28 Şub, 31 Mar, 30 Nis (denetim 3.4.5)", () => {
    const r = rec("r1", "monthly", "2026-01-31", 20000);
    expect(occurrencesBetween(r, D("2026-01-01"), D("2026-06-30"))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2026-06-30",
    ]);
    // Aralığın ortasından sorulunca da aynı günler
    expect(occurrencesBetween(r, D("2026-03-29"), D("2026-05-01"))).toEqual(["2026-03-31", "2026-04-30"]);
    expect(occurrencesBetween(r, D("2028-02-01"), D("2028-02-29"))).toEqual(["2028-02-29"]);
  });
  it("29 Şubat yıllık: artık olmayan yılda 28 Şubat, artık yılda yine 29 Şubat", () => {
    const r = rec("r2", "yearly", "2028-02-29", 120000);
    expect(occurrencesBetween(r, D("2028-01-01"), D("2033-12-31"))).toEqual([
      "2028-02-29",
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
      "2033-02-28",
    ]);
  });
  it("haftalık ödeme 30 günlük dönemde 4 ya da 5 vade (denetim 3.4.2)", () => {
    for (let offset = 0; offset < 7; offset++) {
      const r = rec("w", "weekly", addDays(D("2026-10-01"), offset), 10000);
      const n = occurrencesBetween(r, D("2026-11-01"), D("2026-11-30")).length;
      expect(n === 4 || n === 5).toBe(true);
    }
    const pazartesi = rec("w", "weekly", "2026-11-02", 10000);
    expect(occurrencesBetween(pazartesi, D("2026-11-01"), D("2026-11-30"))).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
  });
  it("yıllık ödeme vadesi olmayan dönemde 0 vade", () => {
    const r = rec("y", "yearly", "2026-03-10", 120000);
    expect(occurrencesBetween(r, D("2026-11-01"), D("2026-11-30"))).toEqual([]);
    expect(occurrencesBetween(r, D("2027-03-01"), D("2027-03-31"))).toEqual(["2027-03-10"]);
  });
  it("başlangıçtan önce vade yok, uçlar dahil", () => {
    const r = rec("m", "monthly", "2026-11-15", 100);
    expect(occurrencesBetween(r, D("2026-01-01"), D("2026-11-14"))).toEqual([]);
    expect(occurrencesBetween(r, D("2026-11-15"), D("2026-11-15"))).toEqual(["2026-11-15"]);
    expect(occurrencesBetween(r, D("2026-12-16"), D("2026-12-01"))).toEqual([]);
  });
  it("rastgele: vadeler sıralı, tekil, aralık içinde ve alt aralıkla tutarlı", () => {
    const r = rng(41);
    for (let i = 0; i < 300; i++) {
      const start = addDays(D("2024-01-01"), r.int(0, 1500));
      const rule = rec("x", r.pick(["weekly", "monthly", "yearly"] as const), start, 100);
      const from = addDays(start, r.int(-100, 800));
      const to = addDays(from, r.int(0, 900));
      const all = occurrencesBetween(rule, from, to);
      for (let k = 0; k < all.length; k++) {
        const cur = all[k];
        const prev = all[k - 1];
        expect(cur !== undefined && cur >= from && cur <= to && cur >= start).toBe(true);
        if (prev !== undefined && cur !== undefined) expect(cur > prev).toBe(true);
      }
      const mid = addDays(from, Math.floor(daysInclusive(from, to) / 2));
      expect([...occurrencesBetween(rule, from, mid), ...occurrencesBetween(rule, addDays(mid, 1), to)]).toEqual(all);
    }
  });
  it("sonraki vade: eski sürümün kaydırdığı imleçten sonra bile başlangıç gününe döner", () => {
    const r = rec("r1", "monthly", "2026-01-31", 20000);
    expect(nextOccurrenceAfter(r, D("2026-03-28"))).toBe("2026-03-31");
    expect(nextOccurrenceAfter(r, D("2026-03-31"))).toBe("2026-04-30");
    expect(nextOccurrenceAfter(r, D("2025-12-01"))).toBe("2026-01-31");
    expect(nextOccurrenceAfter(rec("w", "weekly", "2026-11-02", 1), D("2026-11-02"))).toBe("2026-11-09");
    expect(nextOccurrenceAfter(rec("y", "yearly", "2028-02-29", 1), D("2028-02-29"))).toBe("2029-02-28");
  });
});

describe("recurrence: üretim", () => {
  it("3 ay açılmayan uygulamada kaçan TÜM vadeler tek seferde üretilir (denetim 3.4.4)", () => {
    const r = rec("r1", "monthly", "2026-08-15", 20000, { nextDueDate: D("2026-09-15") });
    const out = processRecurring([r], [], D("2026-11-20"), 1000);
    expect(out.create.map((t) => t.date)).toEqual(["2026-09-15", "2026-10-15", "2026-11-15"]);
    expect(out.create.map((t) => t.id)).toEqual(["r1_2026-09-15", "r1_2026-10-15", "r1_2026-11-15"]);
    expect(out.update).toEqual([{ id: "r1", nextDueDate: "2026-12-15", lastProcessedDate: "2026-11-20" }]);
    const first = out.create[0];
    expect(first).toMatchObject({ recurringId: "r1", dueDate: "2026-09-15", amount: 20000, type: "expense", category: "abonelik", createdAt: 1000 });
    // Yeni kayıtta eski ek yok
    expect(first?.description).toBe("Üyelik r1");
  });
  it("aynı vade iki kez üretilemez: kimlik deterministik, yazıldıktan sonra üretim boş (denetim 3.4.7)", () => {
    const r = rec("r1", "monthly", "2026-08-15", 20000, { nextDueDate: D("2026-09-15") });
    const a = processRecurring([r], [], D("2026-11-20"), 1000);
    // İki cihaz aynı anda: aynı kimlikler, ikinci yazım aynı dokümanı ezer.
    const b = processRecurring([r], [], D("2026-11-20"), 2000);
    expect(b.create.map((t) => t.id)).toEqual(a.create.map((t) => t.id));
    expect(autoTransactionId("r1", D("2026-09-15"))).toBe("r1_2026-09-15");
    // İşlemler yazıldı ama imleç güncellemesi düştü: yeniden üretmez.
    const c = processRecurring([r], a.create, D("2026-11-20"), 3000);
    expect(c.create).toEqual([]);
    expect(c.update[0]?.nextDueDate).toBe("2026-12-15");
    // İmleç de yazıldıktan sonra hiçbir şey yapmaz.
    const done = { ...r, nextDueDate: D("2026-12-15") };
    expect(processRecurring([done], a.create, D("2026-11-20"), 4000)).toEqual({ create: [], update: [] });
  });
  it("eski ' (Otomatik)' kaydı olan vade yeniden üretilmez", () => {
    const r = rec("r1", "monthly", "2026-08-15", 20000, { nextDueDate: D("2026-09-15") });
    const eski = legacyAuto("2026-09-15", "Üyelik r1", 20000);
    const out = processRecurring([r], [eski], D("2026-11-20"), 1);
    expect(out.create.map((t) => t.date)).toEqual(["2026-10-15", "2026-11-15"]);
  });
  it("imleçten önceki vade (kullanıcının sildiği kayıt) yeniden üretilmez", () => {
    const r = rec("r1", "monthly", "2026-08-15", 20000, { nextDueDate: D("2026-11-15") });
    expect(processRecurring([r], [], D("2026-11-14"), 1)).toEqual({ create: [], update: [] });
    expect(processRecurring([r], [], D("2026-11-15"), 1).create.map((t) => t.date)).toEqual(["2026-11-15"]);
  });
  it("eski sürümün 28'ine kaydırdığı imleç: vade yine 31'inde üretilir", () => {
    const r = rec("r1", "monthly", "2026-01-31", 20000, { nextDueDate: D("2026-03-28") });
    const erken = processRecurring([r], [], D("2026-03-29"), 1);
    expect(erken.create).toEqual([]);
    expect(erken.update[0]?.nextDueDate).toBe("2026-03-31");
    expect(processRecurring([r], [], D("2026-03-31"), 1).create.map((t) => t.date)).toEqual(["2026-03-31"]);
  });
  it("yeni eklenen geçmiş başlangıçlı ödeme: başlangıçtan bugüne tüm vadeler", () => {
    const r = rec("r9", "weekly", "2026-11-02", 5000);
    expect(processRecurring([r], [], D("2026-11-17"), 1).create.map((t) => t.date)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
  });
  it("pasif ödeme üretmez; düzenli gelir gelir işlemi üretir", () => {
    const pasif = rec("p", "monthly", "2026-01-10", 100, { isActive: false });
    const gelir = rec("g", "monthly", "2026-11-10", 500000, { type: "income", category: "kira_geliri" });
    const out = processRecurring([pasif, gelir], [], D("2026-11-20"), 1);
    expect(out.create.length).toBe(1);
    expect(out.create[0]).toMatchObject({ type: "income", category: "kira_geliri", recurringId: "g" });
    expect(isAutoTransaction(out.create[0] as Transaction)).toBe(false);
  });
});

describe("recurrence: otomatik işlemin tanınması ve çift kayıt", () => {
  it("yeni alan ya da eski ek ile tanınır", () => {
    expect(isAutoTransaction(tx("2026-11-01", 100, { recurringId: "r1" }))).toBe(true);
    expect(isAutoTransaction(legacyAuto("2026-11-01", "Netflix", 100))).toBe(true);
    expect(isLegacyAutoTransaction(legacyAuto("2026-11-01", "Netflix", 100))).toBe(true);
    // Ek var ama kategori abonelik değil: kullanıcının kendi kaydı
    expect(isAutoTransaction(tx("2026-11-01", 100, { category: "market", description: "Not (Otomatik)" }))).toBe(false);
    expect(isAutoTransaction(tx("2026-11-01", 100, { category: "abonelik", description: "Netflix" }))).toBe(false);
    expect(isAutoTransaction(tx("2026-11-01", 100, { type: "income", category: "maas", recurringId: "g" }))).toBe(false);
    expect(stripAutoSuffix("Netflix (Otomatik)")).toBe("Netflix");
    expect(stripAutoSuffix("Netflix")).toBe("Netflix");
  });
  it("eski sürümün aynı vadeye yazdığı iki kayıttan biri tutulur", () => {
    const a = legacyAuto("2026-11-05", "Netflix", 20000, { id: "a", createdAt: 10 });
    const b = legacyAuto("2026-11-05", "Netflix", 20000, { id: "b", createdAt: 20 });
    const baska = legacyAuto("2026-11-05", "Spotify", 6000, { id: "c" });
    const r = dedupeAutoTransactions([b, a, baska]);
    expect(r.kept.map((t) => t.id)).toEqual(["a", "c"]);
    expect(r.duplicates.map((t) => t.id)).toEqual(["b"]);
  });
  it("eski ' (Otomatik)' kaydı ile yeni kayıt aynı vadede birlikte çift sayılmaz", () => {
    const eski = legacyAuto("2026-11-05", "Netflix", 20000, { id: "eski", createdAt: 1 });
    const yeni = tx("2026-11-05", 20000, { id: "r1_2026-11-05", category: "abonelik", description: "Netflix", recurringId: "r1", dueDate: D("2026-11-05") });
    expect(effectiveTransactions([eski, yeni]).map((t) => t.id)).toEqual(["r1_2026-11-05"]);
    expect(effectiveTransactions([yeni, eski]).map((t) => t.id)).toEqual(["r1_2026-11-05"]);
  });
  it("farklı gün, farklı tutar ve otomatik olmayan kayıtlara dokunulmaz", () => {
    const list = [
      legacyAuto("2026-11-05", "Netflix", 20000),
      legacyAuto("2026-12-05", "Netflix", 20000),
      legacyAuto("2026-11-05", "Netflix", 25000),
      tx("2026-11-05", 5000, { description: "Ekmek" }),
      tx("2026-11-05", 5000, { description: "Ekmek" }),
      tx("2026-11-05", 20000, { recurringId: "r1", dueDate: D("2026-11-05"), description: "Başka" }),
      tx("2026-11-05", 20000, { recurringId: "r2", dueDate: D("2026-11-05"), description: "Başka" }),
    ];
    expect(dedupeAutoTransactions(list).duplicates).toEqual([]);
  });
  it("aynı recurringId ve vade iki kayıtta (kimlik çakışması olmayan eski veri): biri tutulur", () => {
    const a = tx("2026-11-05", 100, { id: "a", recurringId: "r1", dueDate: D("2026-11-05"), createdAt: 5 });
    const b = tx("2026-11-07", 100, { id: "b", recurringId: "r1", dueDate: D("2026-11-05"), createdAt: 9 });
    expect(dedupeAutoTransactions([a, b]).kept.map((t) => t.id)).toEqual(["a"]);
  });
});
