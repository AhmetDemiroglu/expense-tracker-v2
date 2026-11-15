import { beforeEach, describe, expect, it } from "vitest";
import { _resetBack, goBack, pushBackLayer, setBackFallback } from "./back";
import { keyboardOverlap, webKeyboardInset } from "./layout";

describe("geri yolu", () => {
  beforeEach(() => _resetBack());

  it("hiçbir şey yoksa false (kabuk çıkışı yönetir)", () => {
    expect(goBack()).toBe(false);
  });

  it("açık katmanlar son açılandan başlar ve kabuktan önce gelir", () => {
    const log: string[] = [];
    setBackFallback(() => {
      log.push("kabuk");
      return true;
    });
    const offSheet = pushBackLayer(() => {
      log.push("sayfa");
      offSheet();
      return true;
    });
    const offDialog = pushBackLayer(() => {
      log.push("onay");
      offDialog();
      return true;
    });
    expect(goBack()).toBe(true);
    expect(goBack()).toBe(true);
    expect(goBack()).toBe(true);
    expect(log).toEqual(["onay", "sayfa", "kabuk"]);
  });

  it("kapanmayan katman (zorunlu adım) geri tuşunu yutar", () => {
    let shell = 0;
    setBackFallback(() => {
      shell++;
      return true;
    });
    pushBackLayer(() => true);
    expect(goBack()).toBe(true);
    expect(goBack()).toBe(true);
    expect(shell).toBe(0);
  });

  it("kabuk false dönerse sonuç false", () => {
    setBackFallback(() => false);
    expect(goBack()).toBe(false);
  });
});

describe("klavye payı", () => {
  it("klavye yoksa 0", () => {
    expect(keyboardOverlap(800, 800, 0)).toBe(0);
  });
  it("görünüm küçülmediyse (iOS) pay klavye yüksekliğidir", () => {
    expect(keyboardOverlap(800, 800, 300)).toBe(300);
  });
  it("görünüm klavyeyle küçüldüyse (Android) pay 0", () => {
    expect(keyboardOverlap(800, 500, 300)).toBe(0);
    expect(keyboardOverlap(800, 520, 300)).toBe(0);
  });
  it("az küçülmede kalan pay", () => {
    expect(keyboardOverlap(800, 760, 300)).toBe(260);
  });
});

describe("web klavye payı", () => {
  it("görsel görünüm kısalınca pay kısalma kadardır", () => {
    expect(webKeyboardInset(844, 508, 0)).toBe(336);
  });
  it("sayfa klavye için yukarı kaydıysa kayma düşülür", () => {
    expect(webKeyboardInset(844, 508, 120)).toBe(216);
  });
  it("adres çubuğu kadar küçük fark klavye sayılmaz", () => {
    expect(webKeyboardInset(844, 780, 0)).toBe(0);
    expect(webKeyboardInset(844, 844, 0)).toBe(0);
  });
});
