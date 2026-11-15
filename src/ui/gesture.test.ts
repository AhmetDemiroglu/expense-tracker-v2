import { describe, expect, it } from "vitest";
import { GESTURE, VelocityTracker, keypadDisplay, keypadPress, lockAxis, nearestDetent, pagerOffset, pagerTarget, rowRest, rubber, shouldDismiss, shouldGoBack } from "./gesture";

describe("eksen kilidi", () => {
  it("eşik altında karar vermez", () => {
    expect(lockAxis(6, 4)).toBeNull();
    expect(lockAxis(-9, 9)).toBeNull();
  });
  it("yatay ağırlıklı hareket x, dikey ağırlıklı y", () => {
    expect(lockAxis(14, 3)).toBe("x");
    expect(lockAxis(-20, 8)).toBe("x");
    expect(lockAxis(3, 14)).toBe("y");
    expect(lockAxis(5, -30)).toBe("y");
  });
  it("çapraz hareket dikey sayılır (kaydırma öncelikli)", () => {
    expect(lockAxis(12, 11)).toBe("y");
    expect(lockAxis(12, 10)).toBe("x");
  });
});

describe("kenar direnci", () => {
  it("çekilen mesafeden az ilerler, işareti korur ve boyutu aşmaz", () => {
    expect(rubber(100, 390)).toBeGreaterThan(0);
    expect(rubber(100, 390)).toBeLessThan(100);
    expect(rubber(-100, 390)).toBeCloseTo(-rubber(100, 390));
    expect(rubber(100000, 390)).toBeLessThan(390);
    expect(rubber(0, 390)).toBe(0);
    expect(rubber(50, 0)).toBe(0);
  });
  it("artan çekişte artar ama yavaşlar", () => {
    const a = rubber(50, 390);
    const b = rubber(100, 390);
    const c = rubber(150, 390);
    expect(b).toBeGreaterThan(a);
    expect(c - b).toBeLessThan(b - a);
  });
});

describe("sekme kaydırıcı", () => {
  const W = 390;
  it("ilk sekmede sağa, son sekmede sola çekiş dirençlidir", () => {
    expect(pagerOffset(200, 0, 4, W)).toBeLessThan(120);
    expect(pagerOffset(-200, 3, 4, W)).toBeGreaterThan(-120);
    expect(pagerOffset(-200, 0, 4, W)).toBe(-200);
    expect(pagerOffset(200, 3, 4, W)).toBe(200);
  });
  it("bir seferde bir sayfadan fazla kaymaz", () => {
    expect(pagerOffset(-900, 1, 4, W)).toBe(-W);
  });
  it("mesafe eşiği: genişliğin üçte birini geçince sayfa değişir", () => {
    expect(pagerTarget(-W * 0.2, 0, 1, 4, W)).toBe(1);
    expect(pagerTarget(-W * 0.4, 0, 1, 4, W)).toBe(2);
    expect(pagerTarget(W * 0.4, 0, 1, 4, W)).toBe(0);
  });
  it("hız eşiği: kısa ama hızlı fırlatma sayfayı değiştirir", () => {
    expect(pagerTarget(-40, -0.8, 1, 4, W)).toBe(2);
    expect(pagerTarget(40, 0.8, 1, 4, W)).toBe(0);
    expect(pagerTarget(-40, -0.2, 1, 4, W)).toBe(1);
  });
  it("ters yöne fırlatma sayfayı değiştirmez", () => {
    expect(pagerTarget(-40, 0.9, 1, 4, W)).toBe(1);
  });
  it("uçlarda dışarı çıkmaz", () => {
    expect(pagerTarget(300, 2, 0, 4, W)).toBe(0);
    expect(pagerTarget(-300, -2, 3, 4, W)).toBe(3);
  });
  it("eşik altı titreme sayfayı değiştirmez", () => {
    expect(pagerTarget(-6, -3, 1, 4, W)).toBe(1);
  });
});

describe("geri jesti ve alt sayfa", () => {
  it("geri: mesafe ya da hız yeter, sola hareket saymaz", () => {
    expect(shouldGoBack(150, 0, 390)).toBe(true);
    expect(shouldGoBack(60, 0.1, 390)).toBe(false);
    expect(shouldGoBack(60, 0.9, 390)).toBe(true);
    expect(shouldGoBack(-200, -2, 390)).toBe(false);
    expect(shouldGoBack(5, 3, 390)).toBe(false);
  });
  it("alt sayfa: aşağı mesafe ya da hızla kapanır, yukarı hareketle kapanmaz", () => {
    expect(shouldDismiss(GESTURE.sheetDistance + 1, 0)).toBe(true);
    expect(shouldDismiss(40, 0.1)).toBe(false);
    expect(shouldDismiss(40, 0.9)).toBe(true);
    expect(shouldDismiss(-50, -2)).toBe(false);
  });
  it("durak seçimi: en yakın durak, hızlı çekiş bir sonrakine atlar", () => {
    const offsets = [0, 340];
    expect(nearestDetent(40, 0, offsets)).toBe(0);
    expect(nearestDetent(300, 0, offsets)).toBe(1);
    expect(nearestDetent(60, 0.9, offsets)).toBe(1);
    expect(nearestDetent(280, -0.9, offsets)).toBe(0);
    expect(nearestDetent(10, -0.9, offsets)).toBe(0);
    expect(nearestDetent(999, 0, [])).toBe(0);
  });
});

describe("satır kaydırma", () => {
  const has = { del: true, edit: true };
  it("küçük hareket kapalıya döner", () => {
    expect(rowRest(-20, 0, 360, has)).toBe("closed");
    expect(rowRest(20, 0, 360, has)).toBe("closed");
  });
  it("eşiği geçen hareket düğmeyi açar", () => {
    expect(rowRest(-60, 0, 360, has)).toBe("delete");
    expect(rowRest(60, 0, 360, has)).toBe("edit");
  });
  it("sonuna kadar kaydırma doğrudan çalıştırır", () => {
    expect(rowRest(-250, 0, 360, has)).toBe("delete-full");
    expect(rowRest(250, 0, 360, has)).toBe("edit-full");
  });
  it("hızlı kısa hareket düğmeyi açar, ters yöne hız açmaz", () => {
    expect(rowRest(-20, -0.8, 360, has)).toBe("delete");
    expect(rowRest(-20, 0.8, 360, has)).toBe("closed");
  });
  it("tanımsız yön açılmaz", () => {
    expect(rowRest(-250, -1, 360, { del: false, edit: true })).toBe("closed");
    expect(rowRest(250, 1, 360, { del: true, edit: false })).toBe("closed");
  });
});

describe("hız ölçer", () => {
  it("son 100 ms'nin hızını verir", () => {
    const v = new VelocityTracker();
    v.add(0, 0);
    v.add(10, 400);
    v.add(60, 450);
    v.add(110, 500);
    expect(v.get()).toBeCloseTo(1, 1);
  });
  it("tek örnekte hız 0", () => {
    const v = new VelocityTracker();
    v.add(5, 10);
    expect(v.get()).toBe(0);
  });
});

describe("tuş takımı", () => {
  const type = (keys: string) => keys.split("").reduce((v, k) => keypadPress(v, k), "");
  it("rakam, virgül ve en çok iki ondalık", () => {
    expect(type("1234,567")).toBe("1234,56");
    expect(type(",5")).toBe("0,5");
    expect(type("1,,2")).toBe("1,2");
  });
  it("baştaki sıfır tekrarlanmaz", () => {
    expect(type("007")).toBe("7");
    expect(type("0,05")).toBe("0,05");
  });
  it("en çok 9 tam hane", () => {
    expect(type("12345678901")).toBe("123456789");
  });
  it("silme ve bilinmeyen tuş", () => {
    expect(keypadPress("12,5", "sil")).toBe("12,");
    expect(keypadPress("", "sil")).toBe("");
    expect(keypadPress("12", "x")).toBe("12");
  });
  it("binlik ayraçlı gösterim", () => {
    expect(keypadDisplay("")).toBe("0");
    expect(keypadDisplay("1234567,5")).toBe("1.234.567,5");
    expect(keypadDisplay("640")).toBe("640");
    expect(keypadDisplay("1000,")).toBe("1.000,");
  });
});
