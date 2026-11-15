import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsAnchored,
  addYearsAnchored,
  dateParts,
  dayNumber,
  daysInclusive,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  formatDateTr,
  localDate,
  monthGrid,
  parseLocalDate,
  startOfMonth,
  startOfWeek,
  today,
  weekdayIndex,
  weekDays,
  type LocalDate,
} from "./date";
import { rng } from "./testkit";

const d = (s: string) => s as LocalDate;

describe("date: ayrıştırma", () => {
  it("geçerli günü kabul eder", () => {
    expect(parseLocalDate("2026-11-15")).toBe("2026-11-15");
    expect(parseLocalDate("2028-02-29")).toBe("2028-02-29");
  });
  it("geçersiz biçim ve olmayan günü reddeder", () => {
    for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-00-10", "2026-1-5", "15.11.2026", "", "2026-11-15T10:00:00Z"]) {
      expect(parseLocalDate(bad)).toBeNull();
    }
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(20261115)).toBeNull();
  });
  it("localDate geçersiz günde hata fırlatır", () => {
    expect(() => localDate(2026, 2, 30)).toThrow();
    expect(localDate(2026, 3, 5)).toBe("2026-03-05");
    expect(dateParts(d("2026-03-05"))).toEqual({ year: 2026, month: 3, day: 5 });
  });
});

describe("date: bugün", () => {
  // 2026-11-14 21:30 UTC = 15 Kasım 00:30 Istanbul (denetim 3.6 sınıf 1: eski kod "2026-11-14" veriyordu)
  const instant = new Date(Date.UTC(2026, 10, 14, 21, 30));
  it("00:30 Istanbul'da bugün 15 Kasım", () => {
    expect(today("Europe/Istanbul", instant)).toBe("2026-11-15");
  });
  it("aynı an New York'ta 14 Kasım, Berlin'de 14 Kasım, Tokyo'da 15 Kasım", () => {
    expect(today("America/New_York", instant)).toBe("2026-11-14");
    expect(today("Europe/Berlin", instant)).toBe("2026-11-14");
    expect(today("Asia/Tokyo", instant)).toBe("2026-11-15");
  });
  it("saat dilimi verilmezse cihazın yerel günü (süreç TZ'sinden bağımsız doğru)", () => {
    // Yerel bileşenlerle kurulan an: hangi TZ'de koşarsa koşsun yerel gün aynı.
    expect(today(undefined, new Date(2026, 10, 15, 0, 30))).toBe("2026-11-15");
    expect(today(undefined, new Date(2026, 10, 15, 23, 59))).toBe("2026-11-15");
    expect(today(undefined, new Date(2027, 2, 28, 1, 30))).toBe("2027-03-28");
    expect(today(undefined, new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
  it("bilinmeyen saat diliminde yerel güne düşer", () => {
    expect(today("Yok/Boyle", new Date(2026, 10, 15, 12, 0))).toBe("2026-11-15");
  });
  it("yıl ve ay sınırı", () => {
    expect(today("Europe/Istanbul", new Date(Date.UTC(2026, 11, 31, 21, 0)))).toBe("2027-01-01");
  });
});

describe("date: gün aritmetiği", () => {
  it("gün ekler, ay ve yıl sınırını geçer", () => {
    expect(addDays(d("2026-11-30"), 1)).toBe("2026-12-01");
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(d("2028-02-28"), 1)).toBe("2028-02-29");
    expect(addDays(d("2026-03-01"), -1)).toBe("2026-02-28");
  });
  it("yaz saati geçişini kapsayan fark tam gündür (denetim 3.6 sınıf 3)", () => {
    // Berlin 27-29 Mart 2027: eski kod 1 veriyordu.
    expect(diffDays(d("2027-03-27"), d("2027-03-29"))).toBe(2);
    expect(daysInclusive(d("2027-03-27"), d("2027-03-29"))).toBe(3);
    // Geri geçiş haftası (Berlin 31 Ekim 2027, New York 7 Kasım 2027)
    expect(daysInclusive(d("2027-10-25"), d("2027-10-31"))).toBe(7);
    expect(daysInclusive(d("2027-11-01"), d("2027-11-07"))).toBe(7);
    // New York ileri geçiş 14 Mart 2027
    expect(diffDays(d("2027-03-13"), d("2027-03-15"))).toBe(2);
  });
  it("dahil gün sayısı", () => {
    expect(daysInclusive(d("2026-11-01"), d("2026-11-30"))).toBe(30);
    expect(daysInclusive(d("2026-11-15"), d("2026-11-15"))).toBe(1);
    expect(daysInclusive(d("2026-11-16"), d("2026-11-15"))).toBe(0);
  });
  it("gün numarası gidiş dönüş (rastgele)", () => {
    const r = rng(7);
    for (let i = 0; i < 2000; i++) {
      const n = r.int(-200_000, 200_000);
      const date = addDays(d("2000-01-01"), n);
      expect(parseLocalDate(date)).toBe(date);
      expect(diffDays(d("2000-01-01"), date)).toBe(n);
      expect(dayNumber(addDays(date, 1)) - dayNumber(date)).toBe(1);
    }
  });
  it("eachDay", () => {
    expect(eachDay(d("2026-02-27"), d("2026-03-01"))).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
    expect(eachDay(d("2026-03-02"), d("2026-03-01"))).toEqual([]);
  });
});

describe("date: hafta", () => {
  it("Pazartesi 0, Pazar 6", () => {
    expect(weekdayIndex(d("2026-11-16"))).toBe(0); // Pazartesi
    expect(weekdayIndex(d("2026-11-15"))).toBe(6); // Pazar
    expect(weekdayIndex(d("1970-01-01"))).toBe(3); // Perşembe
    expect(weekdayIndex(d("2000-01-01"))).toBe(5); // Cumartesi
  });
  it("hafta Pazartesi başlar", () => {
    expect(startOfWeek(d("2026-11-15"))).toBe("2026-11-09");
    expect(weekDays(d("2026-11-12"))).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });
});

describe("date: ay", () => {
  it("ay uzunlukları ve artık yıl", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(startOfMonth(d("2026-11-15"))).toBe("2026-11-01");
    // Denetim 3.6: eski demo kodu Kasım sonunu 29 buluyordu.
    expect(endOfMonth(d("2026-11-15"))).toBe("2026-11-30");
  });
  it("31 Ocak aylık zincir: 28 Şub, 31 Mar, 30 Nis (denetim 3.4.5)", () => {
    const a = d("2026-01-31");
    expect([1, 2, 3, 4, 12, 13].map((n) => addMonthsAnchored(a, n))).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2027-01-31",
      "2027-02-28",
    ]);
    expect(addMonthsAnchored(a, 25)).toBe("2028-02-29");
    expect(addMonthsAnchored(a, -2)).toBe("2025-11-30");
  });
  it("29 Şubat yıllık: 28 Şub, 4 yıl sonra yine 29 Şub", () => {
    const a = d("2028-02-29");
    expect([1, 2, 3, 4].map((n) => addYearsAnchored(a, n))).toEqual([
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
    ]);
  });
  it("ay ızgarası Pazartesi başlar, ayın tüm günlerini içerir", () => {
    const grid = monthGrid(2026, 11); // 1 Kasım 2026 Pazar
    expect(grid.length).toBe(6);
    expect(grid[0]?.[0]?.date).toBe("2026-10-26");
    expect(grid[0]?.[6]).toEqual({ date: "2026-11-01", inMonth: true });
    expect(grid[5]?.[0]).toEqual({ date: "2026-11-30", inMonth: true });
    for (const row of grid) expect(row.length).toBe(7);
    expect(grid.flat().filter((c) => c.inMonth).length).toBe(30);
    // Şubat 2027: 1 Şubat Pazartesi, 28 gün, tam 4 satır
    expect(monthGrid(2027, 2).length).toBe(4);
  });
});

describe("date: Türkçe biçim", () => {
  it("biçimler", () => {
    const x = d("2026-11-05");
    expect(formatDateTr(x)).toBe("5 Kasım 2026");
    expect(formatDateTr(x, "short")).toBe("5 Kas");
    expect(formatDateTr(x, "numeric")).toBe("05.11.2026");
    expect(formatDateTr(x, "dayMonth")).toBe("5 Kasım");
    expect(formatDateTr(x, "monthYear")).toBe("Kasım 2026");
  });
});
