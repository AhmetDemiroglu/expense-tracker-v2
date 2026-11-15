import { describe, expect, it } from "vitest";
import {
  categoryBreakdown,
  computeBudget,
  dailyLimitFor,
  dayInfo,
  dayStartBudget,
  dayStatus,
  monthDays,
  periodSummaries,
  periodSummary,
  prepareBudget,
  weekSeries,
  type BudgetInput,
} from "./budget";
import { addDays, daysInclusive, eachDay, type LocalDate } from "./date";
import type { Period, Recurring, Transaction } from "./model";
import { AUTO_SUFFIX, processRecurring } from "./recurrence";
import { D, income, rec, rng, tl, tx } from "./testkit";

const kasim = (plannedIncome = tl(30000), fixedExpenses = 0) => ({
  start: D("2026-11-01"),
  end: D("2026-11-30"),
  plannedIncome,
  fixedExpenses,
});

const input = (
  today: string,
  transactions: Transaction[] = [],
  recurrences: Recurring[] = [],
  period = kasim(),
): BudgetInput => ({ period, transactions, recurrences, today: D(today) });

describe("budget: günlük limit (tek tanım)", () => {
  it("30.000 TL, 30 gün, ilk gün 500 TL: limit 1.000,00, bugün kalan 500,00 (denetim 3.2)", () => {
    const b = computeBudget(input("2026-11-01", [tx("2026-11-01", tl(500))]));
    expect(b.dailyLimit).toBe(tl(1000));
    expect(b.todaySpent).toBe(tl(500));
    expect(b.todayRemaining).toBe(tl(500));
    expect(b.todayStatus).toBe("good");
    expect(b.balance).toBe(tl(29500));
    expect(b.remainingDays).toBe(30);
  });
  it("limit gün içinde harcamayla değişmez, değişen bugün kalandır", () => {
    const txs: Transaction[] = [];
    let last: number | null = null;
    for (const amount of [0, 100, 250, 900, 5000]) {
      if (amount > 0) txs.push(tx("2026-11-10", tl(amount)));
      const b = computeBudget(input("2026-11-10", [tx("2026-11-03", tl(900)), ...txs]));
      if (last !== null) expect(b.dailyLimit).toBe(last);
      last = b.dailyLimit;
    }
    // (30.000 − 900) / 21 = 1.385,714... -> aşağı
    expect(last).toBe(138571);
    const son = computeBudget(input("2026-11-10", [tx("2026-11-03", tl(900)), ...txs]));
    expect(son.todayRemaining).toBe(138571 - tl(6250));
  });
  it("aynı gün için limit her ekranda aynı sayı (Özet, Takvim, gün detayı, hafta çubuğu)", () => {
    const src = input("2026-11-12", [tx("2026-11-03", tl(1234.56)), tx("2026-11-12", tl(80)), tx("2026-11-20", tl(2000))], [rec("r1", "weekly", "2026-11-02", tl(100))]);
    const snapshot = computeBudget(src).dailyLimit;
    const day = dayInfo(src, D("2026-11-12")).limit;
    const week = weekSeries(src).find((x) => x.isToday)?.limit;
    const month = monthDays(src, 2026, 11).flat().find((c) => c.date === "2026-11-12")?.info.limit;
    expect(snapshot).not.toBeNull();
    expect([day, week, month, dailyLimitFor(src, D("2026-11-12"))]).toEqual([snapshot, snapshot, snapshot, snapshot]);
    // Hazırlanmış bağlamla da aynı
    expect(computeBudget(prepareBudget(src))).toEqual(computeBudget(src));
  });
  it("gelecek tarihli kira bugünden ayrılır: limit o gün çökmez", () => {
    const kira = tx("2026-11-25", tl(10000), { category: "kira" });
    const b1 = computeBudget(input("2026-11-01", [kira]));
    expect(b1.dailyLimit).toBe(66666); // 20.000 / 30
    expect(b1.todaySpent).toBe(0);
    expect(b1.balance).toBe(tl(20000));
    // 24'ünde ve 26'sında limit aynı düzlemde: ayrılan para zaten düşülmüştü.
    const b24 = computeBudget(input("2026-11-24", [kira]));
    const b26 = computeBudget(input("2026-11-26", [kira]));
    expect(b24.dailyLimit).toBe(285714); // 20.000 / 7
    expect(b26.dailyLimit).toBe(tl(4000)); // 20.000 / 5
    expect(b26.dailyLimit ?? 0).toBeGreaterThan(b24.dailyLimit ?? 0);
    // Kira günü (PLAN 4 formülü aynen): kira o günün harcamasıdır, limit 30.000 / 6, gün "aşım" görünür.
    const b25 = computeBudget(input("2026-11-25", [kira]));
    expect(b25.dailyLimit).toBe(tl(5000));
    expect(b25.todaySpent).toBe(tl(10000));
    expect(b25.todayRemaining).toBe(tl(-5000));
    expect(b25.todayStatus).toBe("over");
    expect(b25.balance).toBe(tl(20000));
  });
  it("gelecek tarihli gelir günü gelene kadar limite girmez, bakiyede görünür", () => {
    const prim = income("2026-11-20", tl(5000));
    const once = computeBudget(input("2026-11-01", [prim]));
    expect(once.dailyLimit).toBe(tl(1000));
    expect(once.balance).toBe(tl(35000));
    expect(once.totalIncome).toBe(tl(35000));
    const gunu = computeBudget(input("2026-11-20", [prim]));
    expect(gunu.dailyLimit).toBe(318181); // 35.000 / 11
    expect(dailyLimitFor(input("2026-11-01", [prim]), D("2026-11-19"))).toBe(tl(2500)); // 30.000 / 12
    expect(dailyLimitFor(input("2026-11-01", [prim]), D("2026-11-20"))).toBe(318181);
  });
  it("geçmiş günün limiti sonradan yapılan harcamayla değişmez (karar K1)", () => {
    const base = [tx("2026-11-02", tl(300))];
    const gun5once = dayInfo(input("2026-11-10", base), D("2026-11-05"));
    const gun5sonra = dayInfo(input("2026-11-10", [...base, tx("2026-11-08", tl(4000)), tx("2026-11-10", tl(700))]), D("2026-11-05"));
    expect(gun5sonra.limit).toBe(gun5once.limit);
    expect(gun5sonra.status).toBe(gun5once.status);
    // (30.000 − 300) / 26
    expect(gun5once.limit).toBe(114230);
    // Geçmişe dönük girilen kayıt ise sonraki günleri değiştirir (veri değişti).
    const geriye = dayInfo(input("2026-11-10", [...base, tx("2026-11-03", tl(2600))]), D("2026-11-05"));
    expect(geriye.limit).toBe(104230);
  });
  it("New York ve Berlin kullanıcısında dönemin son günündeki işlem dahildir (denetim 3.6 sınıf 2)", () => {
    const b = computeBudget(input("2026-11-30", [tx("2026-11-30", tl(750)), tx("2026-11-01", tl(250)), tx("2026-12-01", tl(999)), tx("2026-10-31", tl(999))]));
    expect(b.discretionary).toBe(tl(1000));
    expect(b.todaySpent).toBe(tl(750));
    expect(b.remainingDays).toBe(1);
    expect(b.dailyLimit).toBe(tl(29750));
  });
});

describe("budget: kenar durumları (denetim 3.3)", () => {
  it("tek günlük dönem: bölme güvenli, NaN ve Infinity yok", () => {
    const p = { start: D("2026-11-15"), end: D("2026-11-15"), plannedIncome: tl(1000), fixedExpenses: 0 };
    const b = computeBudget(input("2026-11-15", [tx("2026-11-15", tl(400))], [], p));
    expect(b.totalDays).toBe(1);
    expect(b.dailyLimit).toBe(tl(1000));
    expect(b.todayRemaining).toBe(tl(600));
    const bos = computeBudget(input("2026-11-15", [], [], { ...p, plannedIncome: 0 }));
    expect(bos.dailyLimit).toBe(0);
    expect(bos.savingsRate).toBeNull();
    expect(bos.todayStatus).toBe("good");
    for (const v of Object.values(bos)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
  });
  it("biten dönem: limit yok, son bakiye gösterilir", () => {
    const b = computeBudget(input("2026-12-03", [tx("2026-11-10", tl(26000))]));
    expect(b.phase).toBe("ended");
    expect(b.dailyLimit).toBeNull();
    expect(b.limitDay).toBeNull();
    expect(b.todayRemaining).toBeNull();
    expect(b.todayStatus).toBe("none");
    expect(b.remainingDays).toBe(0);
    expect(b.balance).toBe(tl(4000)); // eski kod bunu "bugünkü limit" diye gösteriyordu
    expect(dailyLimitFor(input("2026-12-03"), D("2026-12-03"))).toBeNull();
  });
  it("başlamamış dönem: limit dönemin ilk günü için, başlangıca kalan gün", () => {
    const b = computeBudget(input("2026-10-29", [tx("2026-11-05", tl(3000))]));
    expect(b.phase).toBe("before");
    expect(b.daysUntilStart).toBe(3);
    expect(b.limitDay).toBe("2026-11-01");
    expect(b.dailyLimit).toBe(tl(900)); // (30.000 − 3.000) / 30
    expect(b.todayRemaining).toBeNull();
    expect(b.todaySpent).toBe(0);
    expect(b.remainingDays).toBe(30);
  });
  it("negatif limit: açık, aşağı yuvarlanır", () => {
    const b = computeBudget(input("2026-11-21", [tx("2026-11-05", tl(30000.01))]));
    expect(b.dailyLimit).toBe(-1); // −1 kuruş / 10 gün -> −0,1 -> −1
    expect(b.todayStatus).toBe("deficit");
    const buyuk = computeBudget(input("2026-11-21", [tx("2026-11-05", tl(35000))]));
    expect(buyuk.dailyLimit).toBe(tl(-500));
    expect(buyuk.todayRemaining).toBe(tl(-500));
    expect(buyuk.balance).toBe(tl(-5000));
    expect(buyuk.savingsRate).toBe(-17);
  });
  it("gün durumu eşikleri: limite kadar iyi, 1,2 katına kadar uyarı, üstü aşım", () => {
    expect(dayStatus(tl(1000), 0)).toBe("good");
    expect(dayStatus(tl(1000), tl(1000))).toBe("good");
    expect(dayStatus(tl(1000), tl(1000) + 1)).toBe("warning");
    expect(dayStatus(tl(1000), tl(1200))).toBe("warning");
    expect(dayStatus(tl(1000), tl(1200) + 1)).toBe("over");
    expect(dayStatus(0, 0)).toBe("good");
    expect(dayStatus(0, 1)).toBe("over");
    expect(dayStatus(-1, 0)).toBe("deficit");
    expect(dayStatus(null, 500)).toBe("none");
  });
  it("ters tarihli (bozuk) dönem çökmez", () => {
    const p = { start: D("2026-11-20"), end: D("2026-11-10"), plannedIncome: tl(100), fixedExpenses: 0 };
    const b = computeBudget(input("2026-11-15", [tx("2026-11-15", 100)], [], p));
    expect(b.phase).toBe("ended");
    expect(b.dailyLimit).toBeNull();
    expect(b.totalDays).toBe(0);
  });
  it("bozuk tutarlı kayıt toplamları NaN yapmaz (denetim 3.7)", () => {
    const bozuk = [tx("2026-11-02", NaN), tx("2026-11-02", -500), tx("2026-11-02", Infinity), tx("2026-11-02", tl(100))];
    const b = computeBudget(input("2026-11-02", bozuk, [rec("x", "monthly", "2026-11-10", NaN)], kasim(NaN, -5)));
    expect(b.discretionary).toBe(tl(100));
    expect(b.plannedIncome).toBe(0);
    expect(b.fixed).toBe(0);
    for (const v of Object.values(b)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
  });
});

describe("budget: düzenli ödeme tam bir kez sayılır (denetim 3.4)", () => {
  const netflix = (extra: Partial<Recurring> = {}) => rec("r1", "monthly", "2026-10-05", tl(200), { description: "Netflix", ...extra });
  const yeniKayit = (date: string, id = "r1") =>
    tx(date, tl(200), { id: `${id}_${date}`, category: "abonelik", description: "Netflix", recurringId: id, dueDate: D(date) });
  const eskiKayit = (date: string) => tx(date, tl(200), { category: "abonelik", description: `Netflix${AUTO_SUFFIX}` });

  it("vadesi dönemde, işlemi üretilmiş: 200 TL bir kez düşer (eski kod 400 düşüyordu)", () => {
    const b = computeBudget(input("2026-11-10", [yeniKayit("2026-11-05")], [netflix({ nextDueDate: D("2026-12-05") })]));
    expect(b.autoPaid).toBe(tl(200));
    expect(b.duePending).toBe(0);
    expect(b.planned).toBe(tl(200));
    expect(b.balance).toBe(tl(29800));
    expect(b.discretionary).toBe(0);
  });
  it("vadesi henüz gelmemiş: gelecekteki vade planlıdır, bakiye aynı", () => {
    const once = computeBudget(input("2026-11-03", [], [netflix({ nextDueDate: D("2026-11-05") })]));
    expect(once.duePending).toBe(tl(200));
    expect(once.autoPaid).toBe(0);
    expect(once.balance).toBe(tl(29800));
    expect(once.dailyLimit).toBe(Math.floor(tl(29800) / 28));
  });
  it("eski ' (Otomatik)' kaydı ile yeni kayıt birlikte çift sayılmaz", () => {
    const b = computeBudget(input("2026-11-10", [eskiKayit("2026-11-05"), yeniKayit("2026-11-05")], [netflix({ nextDueDate: D("2026-12-05") })]));
    expect(b.planned).toBe(tl(200));
    expect(b.totalExpense).toBe(tl(200));
  });
  it("eski sürümün iki kez yazdığı vade hesapta bir kez (denetim 3.4.7)", () => {
    const b = computeBudget(input("2026-11-10", [eskiKayit("2026-11-05"), eskiKayit("2026-11-05")], [netflix({ nextDueDate: D("2026-12-05") })]));
    expect(b.autoPaid).toBe(tl(200));
    expect(b.planned).toBe(tl(200));
  });
  it("otomatik işlem kullanıcının günlük harcaması sayılmaz: o gün limit aşılmış görünmez", () => {
    const src = input("2026-11-05", [yeniKayit("2026-11-05")], [netflix({ nextDueDate: D("2026-12-05") })]);
    const b = computeBudget(src);
    expect(b.todaySpent).toBe(0);
    expect(b.todayStatus).toBe("good");
    expect(dayInfo(src, D("2026-11-05")).autoSpent).toBe(tl(200));
  });
  it("haftalık ödeme dönemde 4-5 vade: bugün hangi gün olursa olsun toplam planlı aynı", () => {
    const spor = rec("w1", "weekly", "2026-10-05", tl(100), { description: "Spor" });
    // Kasım 2026 Pazartesileri: 2, 9, 16, 23, 30 -> 5 vade
    const beklenen = tl(500);
    let txs: Transaction[] = [];
    let cur = spor;
    for (const gun of ["2026-11-01", "2026-11-02", "2026-11-10", "2026-11-23", "2026-11-30"]) {
      const out = processRecurring([cur], txs, D(gun), 1);
      // Üretimden ÖNCE de sonra da aynı sayı
      expect(computeBudget(input(gun, txs, [cur])).planned).toBe(beklenen);
      txs = [...txs, ...out.create.filter((t) => t.date >= "2026-11-01")];
      const upd = out.update[0];
      if (upd) cur = { ...cur, nextDueDate: upd.nextDueDate };
      const b = computeBudget(input(gun, txs, [cur]));
      expect(b.planned).toBe(beklenen);
      expect(b.balance).toBe(tl(29500));
    }
    expect(txs.length).toBe(5);
  });
  it("yıllık ödeme vadesi olmayan dönemde 0 (eski kod her ay düşüyordu)", () => {
    const sigorta = rec("y1", "yearly", "2026-03-10", tl(1200), { nextDueDate: D("2027-03-10") });
    expect(computeBudget(input("2026-11-10", [], [sigorta])).planned).toBe(0);
    const mart = { start: D("2027-03-01"), end: D("2027-03-31"), plannedIncome: tl(30000), fixedExpenses: 0 };
    expect(computeBudget(input("2027-03-02", [], [sigorta], mart)).planned).toBe(tl(1200));
  });
  it("eski sürümün 28'ine yazdığı kayıt + 31'i vadesi çift sayılmaz (imleç alt sınırdır)", () => {
    const r = rec("r31", "monthly", "2026-01-31", tl(200), { description: "Netflix", nextDueDate: D("2026-04-28") });
    const mart = { start: D("2026-03-01"), end: D("2026-03-31"), plannedIncome: tl(30000), fixedExpenses: 0 };
    const b = computeBudget(input("2026-03-29", [eskiKayit("2026-03-28")], [r], mart));
    expect(b.autoPaid).toBe(tl(200));
    expect(b.duePending).toBe(0);
    expect(b.planned).toBe(tl(200));
  });
  it("vadesi geçmiş ama işlemi henüz üretilmemiş vade de sayılır; üretilince sayı değişmez", () => {
    const r = netflix({ nextDueDate: D("2026-11-05") });
    const once = computeBudget(input("2026-11-10", [], [r]));
    expect(once.duePending).toBe(tl(200));
    const out = processRecurring([r], [], D("2026-11-10"), 1);
    const sonra = computeBudget(input("2026-11-10", out.create, [{ ...r, nextDueDate: D("2026-12-05") }]));
    expect(sonra.autoPaid).toBe(tl(200));
    expect(sonra.duePending).toBe(0);
    expect(sonra.planned).toBe(once.planned);
    expect(sonra.dailyLimit).toBe(once.dailyLimit);
    expect(sonra.balance).toBe(once.balance);
  });
  it("pasif ödeme ve düzenli gelir planlıya girmez; kullanıcının sildiği vade geri gelmez", () => {
    const pasif = netflix({ isActive: false, nextDueDate: D("2026-11-05") });
    const gelir = rec("g", "monthly", "2026-11-20", tl(5000), { type: "income", category: "kira_geliri" });
    expect(computeBudget(input("2026-11-10", [], [pasif, gelir])).planned).toBe(0);
    // 5 Kasım vadesi işlendi (imleç 5 Aralık), kullanıcı kaydı sildi
    expect(computeBudget(input("2026-11-10", [], [netflix({ nextDueDate: D("2026-12-05") })])).planned).toBe(0);
  });
  it("sabit gider + otomatik + bekleyen vade birlikte", () => {
    const b = computeBudget(
      input("2026-11-10", [yeniKayit("2026-11-05"), tx("2026-11-07", tl(1000))], [netflix({ nextDueDate: D("2026-12-05") }), rec("w", "weekly", "2026-11-12", tl(50))], kasim(tl(30000), tl(5000))),
    );
    expect(b.fixed).toBe(tl(5000));
    expect(b.autoPaid).toBe(tl(200));
    expect(b.duePending).toBe(tl(150)); // 12, 19, 26 Kasım
    expect(b.planned).toBe(tl(5350));
    expect(b.totalExpense).toBe(tl(6350));
    expect(b.balance).toBe(tl(23650));
    expect(b.savingsRate).toBe(79);
    expect(dayInfo(input("2026-11-10", [], [rec("w", "weekly", "2026-11-12", tl(50))]), D("2026-11-19")).plannedDue).toBe(tl(50));
  });
});

describe("budget: hafta, takvim, dağılım, dönem özeti", () => {
  it("haftalık dizi: Pazartesi'den Pazar'a 7 gün, bugün işaretli", () => {
    const src = input("2026-11-12", [tx("2026-11-09", tl(400)), tx("2026-11-11", tl(1500)), tx("2026-11-12", tl(1100)), tx("2026-11-14", tl(90))]);
    const w = weekSeries(src);
    expect(w.map((x) => x.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(w.map((x) => x.spent)).toEqual([tl(400), 0, tl(1500), tl(1100), 0, tl(90), 0]);
    expect(w.filter((x) => x.isToday).map((x) => x.date)).toEqual(["2026-11-12"]);
    expect(w.map((x) => x.isFuture)).toEqual([false, false, false, false, true, true, true]);
    // Harcamasız gelecek gün renksiz, harcamalı gelecek gün değerlendirilir
    expect(w[4]?.status).toBe("none");
    expect(w[5]?.status).toBe("good");
    expect(w[0]?.status).toBe("good");
    for (const x of w) expect(x.limit).not.toBeNull();
  });
  it("dönem sınırındaki haftada dönem dışı günün limiti yok, harcaması görünür", () => {
    const src = input("2026-11-01", [tx("2026-10-28", tl(300))]);
    const w = weekSeries(src); // 26 Ekim - 1 Kasım
    expect(w[0]?.date).toBe("2026-10-26");
    expect(w[2]).toMatchObject({ inPeriod: false, limit: null, spent: tl(300), status: "none", remaining: null });
    expect(w[6]).toMatchObject({ date: "2026-11-01", inPeriod: true, isToday: true, limit: tl(1000) });
  });
  it("takvim: ay boyunca her gün için limit ve harcama, gün içi limit toplamı tutarlı", () => {
    const src = input("2026-11-12", [tx("2026-11-03", tl(600)), tx("2026-11-12", tl(200))]);
    const grid = monthDays(src, 2026, 11);
    const days = grid.flat().filter((c) => c.inMonth);
    expect(days.length).toBe(30);
    expect(days.every((c) => c.info.inPeriod && c.info.limit !== null)).toBe(true);
    expect(grid.flat().filter((c) => !c.inMonth).every((c) => c.info.limit === null)).toBe(true);
    expect(days.find((c) => c.date === "2026-11-03")?.info.spent).toBe(tl(600));
    // 1 ve 2 Kasım: 30.000/30 ve 30.000/29
    expect(days[0]?.info.limit).toBe(tl(1000));
    expect(days[1]?.info.limit).toBe(103448);
  });
  it("kategori dağılımı: büyükten küçüğe, pay yüzdesi, otomatik işlem dahil, çift kayıt hariç", () => {
    const src = input("2026-11-12", [
      tx("2026-11-03", tl(600), { category: "market" }),
      tx("2026-11-04", tl(200), { category: "market" }),
      tx("2026-11-05", tl(150), { category: "yeme_icme" }),
      tx("2026-11-05", tl(50), { category: "abonelik", description: `Netflix${AUTO_SUFFIX}` }),
      tx("2026-11-05", tl(50), { category: "abonelik", description: `Netflix${AUTO_SUFFIX}` }),
      income("2026-11-06", tl(999)),
      tx("2026-12-06", tl(999)),
    ]);
    expect(categoryBreakdown(src)).toEqual([
      { category: "market", total: tl(800), count: 2, share: 80 },
      { category: "yeme_icme", total: tl(150), count: 1, share: 15 },
      { category: "abonelik", total: tl(50), count: 1, share: 5 },
    ]);
    expect(categoryBreakdown(src, "income")).toEqual([{ category: "maas", total: tl(999), count: 1, share: 100 }]);
    expect(categoryBreakdown(input("2026-11-12"))).toEqual([]);
  });
  it("dönem özeti Özet ekranındaki bakiyeyle aynı tanım (denetim 3.5), tasarruf oranı tam sayı", () => {
    const period: Period = { id: "p1", userId: "u1", name: "Kasım", ...kasim(tl(30000), tl(5000)) };
    const txs = [tx("2026-11-03", tl(7000)), income("2026-11-10", tl(3000)), tx("2026-11-05", tl(200), { category: "abonelik", description: `Netflix${AUTO_SUFFIX}` })];
    const recs = [rec("r1", "monthly", "2026-10-05", tl(200), { description: "Netflix", nextDueDate: D("2026-12-05") })];
    const s = periodSummary(period, txs, recs, D("2026-12-10"));
    const b = computeBudget({ period, transactions: txs, recurrences: recs, today: D("2026-11-15") });
    expect(s.balance).toBe(b.balance);
    expect(s).toMatchObject({ periodId: "p1", totalIncome: tl(33000), totalExpense: tl(12200), balance: tl(20800), savingsRate: 63, txCount: 3 });
  });
  it("gelir 0 ise tasarruf oranı gösterilmez", () => {
    const period: Period = { id: "p0", userId: "u1", name: "Boş", ...kasim(0, 0) };
    expect(periodSummary(period, [tx("2026-11-03", 100)], [], D("2026-12-01")).savingsRate).toBeNull();
  });
  it("çakışan dönemlerde işlem tek dönemde sayılır, en yeni dönem önce (denetim 3.1)", () => {
    const eski: Period = { id: "eski", userId: "u1", name: "Eski", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: tl(1000), fixedExpenses: 0 };
    const yeni: Period = { id: "yeni", userId: "u1", name: "Yeni", start: D("2026-11-15"), end: D("2026-12-14"), plannedIncome: tl(1000), fixedExpenses: 0 };
    const out = periodSummaries([eski, yeni], [tx("2026-11-20", tl(100)), tx("2026-11-05", tl(40))], [], D("2027-01-01"));
    expect(out.map((s) => s.periodId)).toEqual(["yeni", "eski"]);
    expect(out.map((s) => s.totalExpense)).toEqual([tl(100), tl(40)]);
    expect(out[0]?.totalExpense ?? 0).toBe(tl(100));
  });
});

describe("budget: özellik tabanlı kontroller", () => {
  const scenario = (seed: number) => {
    const r = rng(seed);
    const start = addDays(D("2026-01-01"), r.int(0, 800));
    const length = r.int(1, 45);
    const end = addDays(start, length - 1);
    const period = { start, end, plannedIncome: r.int(0, 8_000_000), fixedExpenses: r.int(0, 3_000_000) };
    const transactions: Transaction[] = [];
    const count = r.int(0, 40);
    for (let i = 0; i < count; i++) {
      const date = addDays(start, r.int(-5, length + 4));
      const amount = r.int(1, 600_000);
      const roll = r.next();
      if (roll < 0.15) transactions.push(income(date, amount));
      else if (roll < 0.25) transactions.push(tx(date, amount, { category: "abonelik", description: `Üyelik a${AUTO_SUFFIX}` }));
      else transactions.push(tx(date, amount));
    }
    const recurrences: Recurring[] = [];
    const recCount = r.int(0, 3);
    for (let i = 0; i < recCount; i++) {
      const s = addDays(start, r.int(-400, length));
      const freq = r.pick(["weekly", "monthly", "yearly"] as const);
      recurrences.push(rec(`r${i}`, freq, s, r.int(1, 200_000), { nextDueDate: r.bool(0.5) ? s : addDays(start, r.int(-10, length)), isActive: r.bool(0.85) }));
    }
    const today = addDays(start, r.int(-3, length + 2));
    return { period, transactions, recurrences, today, length };
  };

  it("bölme hiçbir zaman NaN ya da Infinity üretmez; tüm sayılar tamsayı kuruş", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const s = scenario(seed);
      const b = computeBudget(s);
      for (const [key, v] of Object.entries(b)) {
        if (typeof v === "number") {
          expect(Number.isFinite(v), `${key} seed ${seed}`).toBe(true);
          expect(Number.isInteger(v), `${key} seed ${seed}`).toBe(true);
        }
      }
      expect(b.totalExpense).toBe(b.planned + b.discretionary);
      expect(b.balance).toBe(b.totalIncome - b.totalExpense);
      expect(b.planned).toBe(b.fixed + b.autoPaid + b.duePending);
    }
  });

  it("her gün için: limit x kalan gün ≤ gün başı bütçe < (limit + 1 kuruş) x kalan gün (negatifte de)", () => {
    for (let seed = 1; seed <= 250; seed++) {
      const s = scenario(seed);
      const ctx = prepareBudget(s);
      for (const d of eachDay(s.period.start, s.period.end)) {
        const limit = dailyLimitFor(ctx, d);
        const budget = dayStartBudget(ctx, d);
        const rem = daysInclusive(d, s.period.end);
        expect(limit).not.toBeNull();
        expect(budget).not.toBeNull();
        if (limit === null || budget === null) continue;
        expect(limit * rem <= budget, `alt sinir seed ${seed} ${d}`).toBe(true);
        expect(budget < (limit + 1) * rem, `ust sinir seed ${seed} ${d}`).toBe(true);
      }
      expect(dailyLimitFor(ctx, addDays(s.period.start, -1))).toBeNull();
      expect(dailyLimitFor(ctx, addDays(s.period.end, 1))).toBeNull();
    }
  });

  it("bakiye özdeşliği: bakiye = bugünün gün başı bütçesi − bugünün harcaması + gelecek tarihli gelir", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = scenario(seed);
      const b = computeBudget(s);
      if (b.phase !== "active") continue;
      const ctx = prepareBudget(s);
      const futureIncome = s.transactions
        .filter((t) => t.type === "income" && t.date > s.today && t.date <= s.period.end)
        .reduce((a, t) => a + t.amount, 0);
      expect((dayStartBudget(ctx, s.today) ?? 0) - b.todaySpent + futureIncome).toBe(b.balance);
      expect(b.todayRemaining).toBe((b.dailyLimit ?? 0) - b.todaySpent);
    }
  });

  it("Σ günlük limit tutarlılığı: her gün tam limit kadar harcayan kullanıcı dönemi 0 bakiyeyle bitirir", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed * 7);
      const start = addDays(D("2026-01-01"), r.int(0, 500));
      const length = r.int(1, 40);
      const end = addDays(start, length - 1);
      const period = { start, end, plannedIncome: r.int(0, 6_000_000), fixedExpenses: 0 };
      const txs: Transaction[] = [];
      let spentTotal = 0;
      let d: LocalDate = start;
      for (let i = 0; i < length; i++, d = addDays(d, 1)) {
        const limit = computeBudget({ period, transactions: txs, recurrences: [], today: d }).dailyLimit;
        expect(limit).not.toBeNull();
        if (limit === null) break;
        expect(limit).toBeGreaterThanOrEqual(0);
        if (limit > 0) {
          txs.push(tx(d, limit));
          spentTotal += limit;
        }
      }
      const son = computeBudget({ period, transactions: txs, recurrences: [], today: end });
      expect(spentTotal).toBe(period.plannedIncome);
      expect(son.balance).toBe(0);
      expect(son.todayRemaining).toBe(0);
    }
  });

  it("düzenli ödeme üretimi sayıları değiştirmez ve ikinci kez üretmez (rastgele)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = scenario(seed + 1000);
      const once = computeBudget(s);
      const out = processRecurring(s.recurrences, s.transactions, s.today, 1);
      const recurrences = s.recurrences.map((x) => {
        const u = out.update.find((y) => y.id === x.id);
        return u ? { ...x, nextDueDate: u.nextDueDate } : x;
      });
      const transactions = [...s.transactions, ...out.create];
      const sonra = computeBudget({ ...s, transactions, recurrences });
      expect(sonra.planned, `seed ${seed}`).toBe(once.planned);
      expect(sonra.balance).toBe(once.balance);
      expect(sonra.dailyLimit).toBe(once.dailyLimit);
      expect(processRecurring(recurrences, transactions, s.today, 2).create).toEqual([]);
      expect(new Set(out.create.map((t) => t.id)).size).toBe(out.create.length);
    }
  });
});
