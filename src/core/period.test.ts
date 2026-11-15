import { describe, expect, it } from "vitest";
import type { Period } from "./model";
import {
  assignPeriod,
  daysUntilStart,
  defaultPeriodName,
  findOverlaps,
  groupByPeriod,
  isInPeriod,
  periodDays,
  periodPhase,
  periodsOverlap,
  remainingDays,
  suggestNextPeriod,
  validatePeriod,
} from "./period";
import { D, tx } from "./testkit";

const P = (id: string, start: string, end: string, extra: Partial<Period> = {}): Period => ({
  id,
  userId: "u1",
  name: id,
  start: D(start),
  end: D(end),
  plannedIncome: 3_000_000,
  fixedExpenses: 0,
  ...extra,
});

describe("period: sınırlar", () => {
  const kasim = P("kasim", "2026-11-01", "2026-11-30");
  it("başlangıç ve bitiş günleri dahil (denetim 3.1)", () => {
    expect(isInPeriod(kasim, D("2026-11-01"))).toBe(true);
    expect(isInPeriod(kasim, D("2026-11-30"))).toBe(true);
    expect(isInPeriod(kasim, D("2026-10-31"))).toBe(false);
    expect(isInPeriod(kasim, D("2026-12-01"))).toBe(false);
  });
  it("gün sayısı dahil sayımdır: 30 günlük dönem 30 (eski kod 29 buluyordu)", () => {
    expect(periodDays(kasim)).toBe(30);
    expect(periodDays(P("tek", "2026-11-15", "2026-11-15"))).toBe(1);
    expect(periodDays(P("ters", "2026-11-15", "2026-11-10"))).toBe(0);
  });
  it("yaz saati geçişini içeren dönemde gün sayısı doğru (Berlin Mart 2027)", () => {
    expect(periodDays(P("mart", "2027-03-01", "2027-03-31"))).toBe(31);
    expect(remainingDays(P("mart", "2027-03-01", "2027-03-31"), D("2027-03-27"))).toBe(5);
  });
  it("kalan gün bugün dahil; dönem öncesi tamamı, sonrası 0", () => {
    expect(remainingDays(kasim, D("2026-11-01"))).toBe(30);
    expect(remainingDays(kasim, D("2026-11-30"))).toBe(1);
    expect(remainingDays(kasim, D("2026-10-20"))).toBe(30);
    expect(remainingDays(kasim, D("2026-12-01"))).toBe(0);
  });
  it("evre ve başlangıca kalan gün", () => {
    expect(periodPhase(kasim, D("2026-10-31"))).toBe("before");
    expect(periodPhase(kasim, D("2026-11-01"))).toBe("active");
    expect(periodPhase(kasim, D("2026-11-30"))).toBe("active");
    expect(periodPhase(kasim, D("2026-12-01"))).toBe("ended");
    expect(daysUntilStart(kasim, D("2026-10-29"))).toBe(3);
    expect(daysUntilStart(kasim, D("2026-11-05"))).toBe(0);
  });
});

describe("period: çakışma", () => {
  const list = [P("ekim", "2026-10-01", "2026-10-31"), P("kasim", "2026-11-01", "2026-11-30")];
  it("uç günü paylaşan dönemler çakışır, bitişik dönemler çakışmaz", () => {
    expect(periodsOverlap(P("a", "2026-11-01", "2026-11-15"), P("b", "2026-11-15", "2026-11-30"))).toBe(true);
    expect(periodsOverlap(P("a", "2026-11-01", "2026-11-15"), P("b", "2026-11-16", "2026-11-30"))).toBe(false);
  });
  it("çakışan dönem kaydedilemez, düzenlenen dönem kendisiyle çakışmaz", () => {
    const aday = { start: D("2026-10-20"), end: D("2026-11-10"), plannedIncome: 1, fixedExpenses: 0 };
    expect(findOverlaps(aday, list).map((p) => p.id)).toEqual(["ekim", "kasim"]);
    expect(validatePeriod(aday, list)).toEqual(["overlap"]);
    const kasimDuzenle = { start: D("2026-11-01"), end: D("2026-11-29"), plannedIncome: 1, fixedExpenses: 0 };
    expect(validatePeriod(kasimDuzenle, list, "kasim")).toEqual([]);
    expect(validatePeriod({ start: D("2026-12-01"), end: D("2026-12-31"), plannedIncome: 1, fixedExpenses: 0 }, list)).toEqual([]);
  });
  it("ters tarih, negatif ve NaN tutar reddedilir (denetim 3.7)", () => {
    expect(validatePeriod({ start: D("2026-12-10"), end: D("2026-12-01"), plannedIncome: -1, fixedExpenses: NaN }, list)).toEqual([
      "end_before_start",
      "negative_income",
      "negative_fixed",
    ]);
  });
  it("eski çakışan veride işlem en yeni başlangıçlı döneme yazılır, tek döneme", () => {
    const eski = P("eski", "2026-11-01", "2026-11-30");
    const yeni = P("yeni", "2026-11-15", "2026-12-14");
    expect(assignPeriod(D("2026-11-20"), [eski, yeni])?.id).toBe("yeni");
    expect(assignPeriod(D("2026-11-20"), [yeni, eski])?.id).toBe("yeni");
    expect(assignPeriod(D("2026-11-10"), [eski, yeni])?.id).toBe("eski");
    expect(assignPeriod(D("2027-01-01"), [eski, yeni])).toBeNull();
    // Aynı başlangıç: geç biten, o da eşitse küçük kimlik
    expect(assignPeriod(D("2026-11-02"), [P("b", "2026-11-01", "2026-11-30"), P("a", "2026-11-01", "2026-11-30")])?.id).toBe("a");
    const g = groupByPeriod([tx("2026-11-20", 100), tx("2026-11-10", 100), tx("2027-05-05", 100)], [eski, yeni]);
    expect(g.get("yeni")?.length).toBe(1);
    expect(g.get("eski")?.length).toBe(1);
    expect(g.get("")?.length).toBe(1);
  });
});

describe("period: maaş gününden dönem önerisi", () => {
  const onceki = P("onceki", "2026-10-15", "2026-11-14", { plannedIncome: 4_500_000, fixedExpenses: 1_200_000 });
  it("maaş gününden bir sonraki maaş gününün önceki gününe", () => {
    const s = suggestNextPeriod({ today: D("2026-11-15"), payday: 15, previous: onceki });
    expect(s.start).toBe("2026-11-15");
    expect(s.end).toBe("2026-12-14");
    expect(s.plannedIncome).toBe(4_500_000);
    expect(s.fixedExpenses).toBe(1_200_000);
    expect(s.name).toBe("Kasım 2026");
  });
  it("geç açılan uygulamada bugünü içeren dönem önerilir", () => {
    const s = suggestNextPeriod({ today: D("2026-12-20"), payday: 15, previous: onceki });
    expect([s.start, s.end]).toEqual(["2026-12-15", "2027-01-14"]);
  });
  it("31'i maaş günü kısa ayda ayın son gününe düşer", () => {
    const s = suggestNextPeriod({ today: D("2027-02-28"), payday: 31 });
    expect([s.start, s.end]).toEqual(["2027-02-28", "2027-03-30"]);
    const m = suggestNextPeriod({ today: D("2027-03-31"), payday: 31 });
    expect([m.start, m.end]).toEqual(["2027-03-31", "2027-04-29"]);
  });
  it("önceki dönemle çakışmaz", () => {
    const elle = P("elle", "2026-11-01", "2026-11-30");
    const s = suggestNextPeriod({ today: D("2026-12-01"), payday: 15, previous: elle });
    expect([s.start, s.end]).toEqual(["2026-12-01", "2026-12-14"]);
    expect(periodsOverlap(s, elle)).toBe(false);
  });
  it("maaş günü yoksa önceki bitişin ertesi gününden bir ay", () => {
    const s = suggestNextPeriod({ today: D("2026-12-01"), previous: P("k", "2026-11-01", "2026-11-30") });
    expect([s.start, s.end]).toEqual(["2026-12-01", "2026-12-31"]);
    const ilk = suggestNextPeriod({ today: D("2026-01-31") });
    expect([ilk.start, ilk.end, ilk.plannedIncome]).toEqual(["2026-01-31", "2026-02-27", 0]);
    const eskimis = suggestNextPeriod({ today: D("2027-03-10"), previous: P("k", "2026-11-01", "2026-11-30") });
    expect(eskimis.start).toBe("2027-03-10");
  });
  it("dönem adı orta günün ayıdır", () => {
    expect(defaultPeriodName(D("2026-11-25"), D("2026-12-24"))).toBe("Aralık 2026");
    expect(defaultPeriodName(D("2026-11-01"), D("2026-11-30"))).toBe("Kasım 2026");
  });
});
