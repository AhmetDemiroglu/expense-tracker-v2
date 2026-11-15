import { describe, expect, it } from "vitest";
import {
  formatAmountInput,
  formatMoney,
  isValidAmount,
  kurusFromTl,
  parseAmount,
  percentage,
  percentOf,
  splitEvenly,
  sumKurus,
  tlFromKurus,
} from "./money";
import { rng } from "./testkit";

const ok = (text: string) => {
  const r = parseAmount(text);
  return r.ok ? r.kurus : `HATA:${r.reason}`;
};

describe("money: TL ondalık <-> kuruş", () => {
  it("0.1 + 0.2 kuruş hatası üretmez (denetim 3.7)", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    const a = kurusFromTl(0.1);
    const b = kurusFromTl(0.2);
    expect(a).toBe(10);
    expect(b).toBe(20);
    expect(sumKurus([a ?? 0, b ?? 0])).toBe(30);
    expect(tlFromKurus(30)).toBe(0.3);
  });
  it("ikili kesir hatalı sayıları doğru kuruşa çevirir", () => {
    expect(kurusFromTl(12480.5)).toBe(1248050);
    expect(kurusFromTl(1.15)).toBe(115);
    expect(kurusFromTl(0.07)).toBe(7);
    expect(kurusFromTl(19.99)).toBe(1999);
    expect(kurusFromTl(0.30000000000000004)).toBe(30);
    expect(kurusFromTl(1234.568)).toBe(123457);
    expect(kurusFromTl(-12.5)).toBe(-1250);
    expect(kurusFromTl(0)).toBe(0);
    expect(Object.is(kurusFromTl(-0), 0)).toBe(true);
  });
  it("NaN, Infinity ve sayı olmayanı reddeder", () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, "abc", "12,5", {}, [], true]) {
      expect(kurusFromTl(bad)).toBeNull();
    }
    expect(kurusFromTl("640")).toBe(64000);
    expect(kurusFromTl("12.5")).toBe(1250);
  });
  it("kuruş -> TL -> kuruş özdeşliktir (rastgele)", () => {
    const r = rng(11);
    for (let i = 0; i < 20000; i++) {
      const k = r.int(0, 2_000_000_000);
      expect(kurusFromTl(tlFromKurus(k))).toBe(k);
    }
    for (let k = 0; k <= 10000; k++) expect(kurusFromTl(tlFromKurus(k))).toBe(k);
  });
  it("isValidAmount: NaN, 0, negatif ve kesirli kuruş geçersiz", () => {
    expect(isValidAmount(1)).toBe(true);
    for (const bad of [0, -5, NaN, 1.5, Infinity, "10", null]) expect(isValidAmount(bad)).toBe(false);
  });
});

describe("money: Türkçe tutar ayrıştırma", () => {
  it("şartnamedeki örnekler", () => {
    expect(ok("1.234,56")).toBe(123456);
    expect(ok("1234,5")).toBe(123450);
    expect(ok("640")).toBe(64000);
    expect(ok("12,5 tl")).toBe(1250);
  });
  it("simge, boşluk ve işaret", () => {
    expect(ok("₺640")).toBe(64000);
    expect(ok("640₺")).toBe(64000);
    expect(ok("640 TL")).toBe(64000);
    expect(ok("  1 234,56  ")).toBe(123456);
    expect(ok("+50")).toBe(5000);
    expect(ok("12,")).toBe(1200);
    expect(ok(",5")).toBe(50);
    expect(ok("0,01")).toBe(1);
    expect(ok("007")).toBe(700);
  });
  it("nokta: binlik ya da ondalık", () => {
    expect(ok("1.234")).toBe(123400);
    expect(ok("12.480")).toBe(1248000);
    expect(ok("1.234.567")).toBe(123456700);
    expect(ok("1.234.567,89")).toBe(123456789);
    expect(ok("12.5")).toBe(1250);
    expect(ok("120.50")).toBe(12050);
    expect(ok("1,234.56")).toBe(123456);
    expect(ok("1,234,567")).toBe(123456700);
  });
  it("geçersiz girişleri reddeder", () => {
    expect(ok("")).toBe("HATA:empty");
    expect(ok("   ")).toBe("HATA:empty");
    expect(ok("tl")).toBe("HATA:empty");
    for (const bad of ["abc", "12a", "1,2,3", "1.23,45", "12,345", "1.2345", "0.500", "1..2", ",", ".", "12,5,", "NaN", "1e5", "12.34.56"]) {
      expect(ok(bad)).toBe("HATA:invalid");
    }
  });
  it("0 ve negatif reddedilir", () => {
    expect(ok("0")).toBe("HATA:zero");
    expect(ok("0,00")).toBe("HATA:zero");
    expect(ok("-640")).toBe("HATA:negative");
    expect(ok("-0")).toBe("HATA:zero");
  });
  it("çok büyük tutar reddedilir", () => {
    expect(ok("999.999.999,99")).toBe(99999999999);
    expect(ok("1.000.000.000")).toBe("HATA:too_large");
    expect(ok("12345678901234567890")).toBe("HATA:too_large");
  });
  it("biçimlendirilen her tutar aynı kuruşa geri ayrışır (rastgele)", () => {
    const r = rng(23);
    for (let i = 0; i < 5000; i++) {
      const k = r.int(1, 5_000_000_000);
      expect(ok(formatMoney(k))).toBe(k);
      expect(ok(formatAmountInput(k))).toBe(k);
    }
  });
});

describe("money: biçimlendirme", () => {
  it("kuruşlu", () => {
    expect(formatMoney(1248050)).toBe("₺12.480,50");
    expect(formatMoney(5)).toBe("₺0,05");
    expect(formatMoney(0)).toBe("₺0,00");
    expect(formatMoney(100000000)).toBe("₺1.000.000,00");
    expect(formatMoney(99999)).toBe("₺999,99");
  });
  it("işaret", () => {
    expect(formatMoney(-50000)).toBe("-₺500,00");
    expect(formatMoney(64000, { sign: "always" })).toBe("+₺640,00");
    expect(formatMoney(-64000, { sign: "always" })).toBe("-₺640,00");
    expect(formatMoney(0, { sign: "always" })).toBe("₺0,00");
    expect(formatMoney(-64000, { sign: "never" })).toBe("₺640,00");
  });
  it("kuruşsuz en yakına yuvarlar, sıfıra inen değerde işaret yok", () => {
    expect(formatMoney(1248050, { decimals: false })).toBe("₺12.481");
    expect(formatMoney(1248049, { decimals: false })).toBe("₺12.480");
    expect(formatMoney(-1248050, { decimals: false })).toBe("-₺12.481");
    expect(formatMoney(-40, { decimals: false })).toBe("₺0");
    expect(formatMoney(98333, { decimals: false })).toBe("₺983");
  });
  it("NaN ekrana sızmaz", () => {
    expect(formatMoney(NaN)).toBe("₺0,00");
    expect(formatMoney(Infinity)).toBe("₺0,00");
  });
  it("çıktıda uzun tire yok", () => {
    for (const k of [-1, -100000, 5, 0]) expect(formatMoney(k)).not.toMatch(/[\u2012-\u2015\u2212]/);
  });
  it("giriş alanı biçimi", () => {
    expect(formatAmountInput(123456)).toBe("1234,56");
    expect(formatAmountInput(64000)).toBe("640");
    expect(formatAmountInput(1205)).toBe("12,05");
  });
});

describe("money: bölme ve yüzde", () => {
  it("eşit bölme toplamı korur", () => {
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(100, 6)).toEqual([17, 17, 17, 17, 16, 16]);
    expect(splitEvenly(5, 1)).toEqual([5]);
    const r = rng(5);
    for (let i = 0; i < 2000; i++) {
      const total = r.int(1, 100_000_000);
      const n = r.int(1, 36);
      const parts = splitEvenly(total, n);
      expect(parts.length).toBe(n);
      expect(sumKurus(parts)).toBe(total);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
  it("tutarın yüzdesi: tamsayı kuruş, en yakına, yarım sıfırdan uzağa", () => {
    expect(percentage(8_000_000, 15)).toBe(1_200_000);
    expect(percentage(125050, 10)).toBe(12505);
    expect(percentage(1005, 10)).toBe(101); // 100,5 -> 101
    expect(percentage(1004, 10)).toBe(100);
    expect(percentage(999, 12.5)).toBe(125); // 124,875
    expect(percentage(33, 33)).toBe(11); // 10,89
    expect(percentage(-1005, 10)).toBe(-101);
    expect(percentage(1005, -10)).toBe(-101);
    expect(percentage(-1005, -10)).toBe(101);
    expect(percentage(5000, 0)).toBe(0);
    expect(percentage(0, 50)).toBe(0);
    expect(Object.is(percentage(0, -50), 0)).toBe(true);
    expect(percentage(5000, 100)).toBe(5000);
    expect(percentage(5000, 150)).toBe(7500);
    for (const [w, p] of [[NaN, 10], [100, NaN], [Infinity, 10], [100, Infinity]] as const) expect(percentage(w, p)).toBe(0);
  });
  it("tutarın yüzdesi rastgele: sonuç tamsayı, tam değerden en fazla yarım kuruş uzak, percentOf ile tutarlı", () => {
    const r = rng(77);
    for (let i = 0; i < 5000; i++) {
      const whole = r.int(1, 2_000_000_000);
      const pct = r.int(0, 100);
      const out = percentage(whole, pct);
      expect(Number.isInteger(out)).toBe(true);
      expect(out * 100 - whole * pct).toBeGreaterThanOrEqual(-50);
      expect(out * 100 - whole * pct).toBeLessThanOrEqual(50);
      if (whole >= 10_000) expect(percentOf(out, whole)).toBe(pct);
    }
  });
  it("yüzde: payda 0 ise null, NaN yok", () => {
    expect(percentOf(50, 0)).toBeNull();
    expect(percentOf(50, -10)).toBeNull();
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(-1, 4)).toBe(-25);
    expect(percentOf(0, 100)).toBe(0);
  });
});
