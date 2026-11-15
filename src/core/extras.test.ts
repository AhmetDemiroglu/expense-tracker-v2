import { describe, expect, it } from "vitest";
import { computeBudget } from "./budget";
import { categoryLabel } from "./category";
import { addDays, endOfMonth } from "./date";
import { buildDemoData, DEMO_FIXED_EXPENSES, DEMO_PLANNED_INCOME } from "./demo";
import * as core from "./index";
import { buildInstallmentPlan } from "./installment";
import { activePeriod, readGuestList, readTransaction, withId, writeTransaction } from "./model";
import { sumKurus } from "./money";
import { guessCategory, parseQuickEntry } from "./quickEntry";
import { isAutoTransaction, processRecurring } from "./recurrence";
import { D, tl } from "./testkit";

describe("installment: taksit planı", () => {
  const plan = (total: number, count: number, firstDate: string) =>
    buildInstallmentPlan({
      userId: "u1",
      description: "Televizyon",
      category: "teknoloji",
      total,
      count,
      firstDate: D(firstDate),
      groupId: "g1",
      idFor: (i) => `g1_${i}`,
      now: 1000,
    });

  it("31'inde başlayan 6 ay: gün sabit, kısa ayda ay sonu, zincirleme kayma yok", () => {
    const p = plan(tl(12000), 6, "2026-08-31");
    expect(p.map((t) => t.date)).toEqual(["2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31"]);
    expect(plan(tl(600), 3, "2027-01-31").map((t) => t.date)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("ortak grup, sıra ve sayı alanları, açıklamada sıra", () => {
    const p = plan(tl(12000), 6, "2026-08-31");
    expect(p.length).toBe(6);
    expect(p[1]).toMatchObject({
      id: "g1_2",
      description: "Televizyon (2/6)",
      amount: tl(2000),
      type: "expense",
      category: "teknoloji",
      installmentGroupId: "g1",
      installmentIndex: 2,
      installmentCount: 6,
    });
    expect(new Set(p.map((t) => t.id)).size).toBe(6);
  });
  it("toplam korunur, artan kuruş ilk taksitlere", () => {
    const p = plan(tl(1000), 3, "2026-11-15");
    expect(p.map((t) => t.amount)).toEqual([33334, 33333, 33333]);
    expect(sumKurus(p.map((t) => t.amount))).toBe(tl(1000));
  });
  it("tek taksit sıradan giderdir", () => {
    const p = plan(tl(640), 1, "2026-11-15");
    expect(p.length).toBe(1);
    expect(p[0]?.description).toBe("Televizyon");
    expect(p[0]).not.toHaveProperty("installmentGroupId");
  });
  it("geçersiz sayı ve tutar reddedilir", () => {
    for (const count of [0, 37, 2.5, NaN]) expect(() => plan(tl(100), count, "2026-11-15")).toThrow();
    for (const total of [0, -100, NaN, 5]) expect(() => plan(total, 6, "2026-11-15")).toThrow();
  });
  it("today verilirse gelecek tarihli ilk taksit planlı işaretlenir; taksit günü aşım yok", () => {
    const args = { userId: "u1", description: "Koltuk", category: "ev_esyasi" as const, total: tl(6000), count: 3, firstDate: D("2026-11-10"), groupId: "g2", idFor: (i: number) => `g2_${i}`, now: 1 };
    expect(buildInstallmentPlan({ ...args, today: D("2026-11-02") })[0]?.planned).toBe(true);
    expect(buildInstallmentPlan({ ...args, today: D("2026-11-10") })[0]).not.toHaveProperty("planned");
    expect(buildInstallmentPlan(args)[0]).not.toHaveProperty("planned");
    // İkinci taksit Aralık döneminde: 10 Aralık'ta bugün harcanan 0, durum iyi
    const p = buildInstallmentPlan({ ...args, today: D("2026-11-10") });
    const aralik = { start: D("2026-12-01"), end: D("2026-12-30"), plannedIncome: tl(30000), fixedExpenses: 0 };
    const b = computeBudget({ period: aralik, transactions: p, recurrences: [], today: D("2026-12-10") });
    expect(b.plannedTx).toBe(tl(2000));
    expect(b.todaySpent).toBe(0);
    expect(b.todayStatus).toBe("good");
    expect(b.dailyLimit).toBe(Math.floor(tl(28000) / 21));
  });
  it("ilk taksit gelecek tarihliyse (işaretsiz) bugünden ayrılır", () => {
    const p = plan(tl(6000), 3, "2026-11-10");
    const period = { start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: tl(30000), fixedExpenses: 0 };
    const b = computeBudget({ period, transactions: p, recurrences: [], today: D("2026-11-02") });
    // Dönemde yalnız ilk taksit (2.000): (30.000 − 2.000) / 29
    expect(b.dailyLimit).toBe(Math.floor(tl(28000) / 29));
    expect(b.balance).toBe(tl(28000));
    expect(writeTransaction(p[1] ?? p[0]!)).toMatchObject({ installmentGroupId: "g1", installmentIndex: 2, installmentCount: 3, amount: 2000 });
  });
});

describe("quickEntry: tek satır hızlı kayıt", () => {
  const today = D("2026-11-15");
  it("şartnamedeki örnekler", () => {
    expect(parseQuickEntry("market 640", today)).toEqual({ amount: tl(640), type: "expense", category: "market", description: "Market", date: today, dateHint: null });
    expect(parseQuickEntry("640 market", today)).toMatchObject({ amount: tl(640), category: "market", description: "Market" });
    expect(parseQuickEntry("dün taksi 120,50", today)).toEqual({
      amount: 12050,
      type: "expense",
      category: "toplu_tasima",
      description: "Taksi",
      date: "2026-11-14",
      dateHint: "yesterday",
    });
  });
  it("tarih ipuçları: bugün, dün, yarın (büyük harf ve ay sınırı dahil)", () => {
    expect(parseQuickEntry("Bugün kahve 95", today)).toMatchObject({ date: today, dateHint: "today", category: "yeme_icme" });
    expect(parseQuickEntry("DÜN benzin 1.200", D("2026-12-01"))).toMatchObject({ date: "2026-11-30", dateHint: "yesterday", amount: tl(1200), category: "arac_yakit" });
    expect(parseQuickEntry("yarın kira 12000", today)).toMatchObject({ date: "2026-11-16", dateHint: "tomorrow", category: "kira" });
  });
  it("para birimi ekleri ve Türkçe tutar biçimleri", () => {
    expect(parseQuickEntry("eczane 85,5 tl", today)).toMatchObject({ amount: 8550, category: "saglik", description: "Eczane" });
    expect(parseQuickEntry("₺1.234,56 migros", today)).toMatchObject({ amount: 123456, category: "market", description: "Migros" });
    expect(parseQuickEntry("sinema 400TL", today)).toMatchObject({ amount: tl(400), category: "eglence" });
  });
  it("birden çok sayı: sondaki tutardır, para birimi ekli olan önceliklidir", () => {
    expect(parseQuickEntry("2 ekmek 30", today)).toMatchObject({ amount: tl(30), description: "2 ekmek", category: "market" });
    expect(parseQuickEntry("50 tl 2 simit", today)).toMatchObject({ amount: tl(50), description: "2 simit", category: "yeme_icme" });
  });
  it("gelir kelimesi türü gelire çevirir", () => {
    expect(parseQuickEntry("maaş 45000", today)).toMatchObject({ amount: tl(45000), type: "income", category: "maas" });
    expect(parseQuickEntry("+500 hediye", today)).toMatchObject({ amount: tl(500), type: "income", category: "diger_gelir" });
  });
  it("tutar ya da kategori bulunamazsa null döner, çökmez", () => {
    expect(parseQuickEntry("market", today)).toMatchObject({ amount: null, category: "market" });
    expect(parseQuickEntry("640", today)).toEqual({ amount: tl(640), type: "expense", category: null, description: "", date: today, dateHint: null });
    expect(parseQuickEntry("", today)).toMatchObject({ amount: null, category: null, description: "" });
    expect(parseQuickEntry("xyzq 12", today)).toMatchObject({ amount: tl(12), category: null, description: "Xyzq" });
    expect(parseQuickEntry("ıspanak 40", today).description).toBe("Ispanak");
    expect(parseQuickEntry("ilaç 40", today)).toMatchObject({ description: "İlaç", category: "saglik" });
  });
  it("kategori tahmini: çekim eki, çok kelimeli kalıp, kısa kelime tam eşleşme", () => {
    expect(guessCategory("marketten aldım")).toBe("market");
    expect(guessCategory("kredi kartı ödemesi")).toBe("kredi_karti");
    expect(guessCategory("telefon faturası")).toBe("fatura");
    expect(guessCategory("yeni telefon")).toBe("teknoloji");
    expect(guessCategory("su")).toBe("fatura");
    expect(guessCategory("sunum")).toBeNull();
    expect(guessCategory("oyuncak")).toBe("cocuk");
    expect(guessCategory("Netflix")).toBe("abonelik");
    expect(guessCategory("")).toBeNull();
  });
});

describe("demo: misafir verisi", () => {
  const make = (today: string) => buildDemoData({ guestId: "guest_1", today: D(today), now: 5000, idFor: (n) => `demo_${n}` });

  it("maaş ve kira çift sayılmaz: toplam gelir 47.500, 90.000 değil (denetim 3.12)", () => {
    const demo = make("2026-11-15");
    expect(demo.transactions.some((t) => t.category === "maas")).toBe(false);
    expect(demo.transactions.some((t) => t.category === "kira")).toBe(false);
    const period = activePeriod(demo.settings, demo.periods);
    expect(period).not.toBeNull();
    if (!period) return;
    const b = computeBudget({ period, transactions: demo.transactions, recurrences: demo.recurrences, today: D("2026-11-15") });
    expect(b.plannedIncome).toBe(DEMO_PLANNED_INCOME);
    expect(b.totalIncome).toBe(tl(47500));
    expect(b.fixed).toBe(DEMO_FIXED_EXPENSES);
    expect(b.autoPaid).toBe(22999);
    expect(b.duePending).toBe(0);
    expect(b.discretionary).toBe(tl(5545));
    expect(b.totalExpense).toBe(tl(12850) + 22999 + tl(5545));
    expect(b.balance).toBe(tl(47500) - tl(12850) - 22999 - tl(5545));
    expect(b.phase).toBe("active");
    expect(b.dailyLimit).not.toBeNull();
    expect(b.dailyLimit ?? 0).toBeGreaterThan(0);
  });
  it("dönem ayın son gününü içerir (denetim 3.6: eski demo 29 Kasım'da bitiyordu)", () => {
    for (const today of ["2026-11-15", "2026-11-30", "2026-12-31", "2027-02-10", "2028-02-29", "2026-03-01"]) {
      const demo = make(today);
      const p = demo.periods[0];
      expect(p?.end).toBe(endOfMonth(D(today)));
      expect(p?.start).toBe(addDays(D(today), -15));
      expect(demo.settings.period?.end).toBe(p?.end);
      for (const t of demo.transactions) {
        expect(t.date >= (p?.start ?? "") && t.date <= D(today)).toBe(true);
        expect(t.userId).toBe("guest_1");
      }
    }
  });
  it("kimlikler tekil, düzenli ödeme yeniden üretilmez, kategoriler asıl listeden", () => {
    const demo = make("2026-11-15");
    const ids = [...demo.transactions.map((t) => t.id), ...demo.periods.map((p) => p.id), ...demo.recurrences.map((r) => r.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(processRecurring(demo.recurrences, demo.transactions, D("2026-11-15"), 1).create).toEqual([]);
    expect(demo.transactions.filter(isAutoTransaction).length).toBe(1);
    expect(demo.settings.activePeriodId).toBe(demo.periods[0]?.id);
    for (const t of demo.transactions) expect(categoryLabel(t.category).length).toBeGreaterThan(0);
  });
  it("demo metinlerinde uzun tire ve asistan adı yok; eski biçime yazılıp geri okunur", () => {
    const demo = make("2026-11-15");
    const text = JSON.stringify(demo);
    expect(text).not.toMatch(/[\u2013\u2014]/);
    expect(text.toLowerCase()).not.toMatch(/claude|gemini|gpt|asistan/);
    const stored = JSON.stringify(demo.transactions.map((t) => withId(writeTransaction(t), t.id)));
    expect(readGuestList(stored, readTransaction).items).toEqual(demo.transactions);
  });
});

describe("index: dışa açılan API", () => {
  it("sözleşmedeki fonksiyonlar dışa açık, test yardımcıları değil", () => {
    const names = [
      "parseLocalDate", "localDate", "dateParts", "today", "addDays", "diffDays", "daysInclusive", "eachDay", "minDate", "maxDate",
      "weekdayIndex", "startOfWeek", "weekDays", "daysInMonth", "startOfMonth", "endOfMonth", "addMonthsAnchored", "addYearsAnchored",
      "monthGrid", "formatDateTr", "kurusFromTl", "tlFromKurus", "parseAmount", "formatMoney", "formatAmountInput", "sumKurus",
      "splitEvenly", "percentOf", "percentage", "isCategoryKey", "categoryDef", "categoryLabel", "categoryLegacyName", "categoryFromLegacy",
      "readTransaction", "readPeriod", "readRecurring", "readSettings", "readGuestList", "writeTransaction", "writePeriod",
      "writeRecurring", "writeSettings", "withId", "activationPatch", "activePeriod", "guestStorageKeys", "isInPeriod", "periodDays",
      "remainingDays", "periodPhase", "daysUntilStart", "periodsOverlap", "findOverlaps", "validatePeriod", "assignPeriod",
      "groupByPeriod", "suggestNextPeriod", "defaultPeriodName", "isAutoTransaction", "occurrencesBetween", "nextOccurrenceAfter",
      "autoTransactionId", "processRecurring", "dedupeAutoTransactions", "effectiveTransactions", "computeBudget", "prepareBudget",
      "dailyLimitFor", "dayInfo", "weekSeries", "monthDays", "categoryBreakdown", "dayStatus", "periodSummary", "periodSummaries",
      "buildInstallmentPlan", "parseQuickEntry", "buildDemoData",
    ];
    const api = core as Record<string, unknown>;
    for (const name of names) expect(typeof api[name], name).toBe("function");
    for (const name of ["CATEGORIES", "INCOME_CATEGORIES", "EXPENSE_CATEGORIES", "MONTH_NAMES_TR", "WEEKDAY_SHORT_TR"]) expect(Array.isArray(api[name]), name).toBe(true);
    expect(api.AUTO_SUFFIX).toBe(" (Otomatik)");
    expect(api.GUEST_PREFIX).toBe("guest_");
    expect(api.rng).toBeUndefined();
  });
});
