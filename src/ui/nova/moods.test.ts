import { describe, expect, it } from "vitest";
import { FACES, NOVA_MOODS, canBlink, isCompact } from "./moods";

describe("Nova ruh halleri", () => {
  it("on ruh halinin hepsi tanımlı", () => {
    expect(NOVA_MOODS).toHaveLength(10);
    for (const m of NOVA_MOODS) expect(FACES[m]).toBeDefined();
  });
  it("her ruh halinin yüzü diğerlerinden farklı", () => {
    const keys = NOVA_MOODS.map((m) => JSON.stringify(FACES[m]));
    expect(new Set(keys).size).toBe(NOVA_MOODS.length);
  });
  it("selam el sallar, başarı iki kolu kaldırır, üzgün ağız aşağı", () => {
    expect(FACES.selam.arms).toBe("wave");
    expect(FACES.basari.arms).toBe("up");
    expect(FACES.uzgun.smile).toBeLessThan(0);
    expect(FACES.mutlu.smile).toBeGreaterThan(0);
  });
  it("yalnız açık gözlü ruh halleri göz kırpar", () => {
    expect(canBlink("selam")).toBe(true);
    expect(canBlink("uyku")).toBe(false);
    expect(canBlink("mutlu")).toBe(false);
    expect(canBlink("analiz")).toBe(false);
  });
  it("48 px altı sade çizilir", () => {
    expect(isCompact(28)).toBe(true);
    expect(isCompact(47)).toBe(true);
    expect(isCompact(48)).toBe(false);
    expect(isCompact(160)).toBe(false);
  });
});
