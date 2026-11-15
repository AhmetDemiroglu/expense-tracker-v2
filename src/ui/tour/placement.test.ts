import { describe, expect, it } from "vitest";
import { holeFor, holeMaxHeightFor, isInView, nextIndex, placeBubble, sameRect, type Viewport } from "./placement";

const SIZES: [string, Viewport][] = [
  ["360x640", { w: 360, h: 640, top: 24, bottom: 0, left: 0, right: 0 }],
  ["390x844", { w: 390, h: 844, top: 47, bottom: 34, left: 0, right: 0 }],
  ["412x915", { w: 412, h: 915, top: 32, bottom: 24, left: 0, right: 0 }],
  ["768x1024", { w: 768, h: 1024, top: 24, bottom: 20, left: 0, right: 0 }],
];
const BUBBLES = [
  { w: 320, h: 150 },
  { w: 336, h: 260 } /* yazı büyütülmüş */,
];

describe("tur yerleşimi", () => {
  for (const [name, vp] of SIZES) {
    for (const bubble of BUBBLES) {
      const b = { w: Math.min(bubble.w, vp.w - 24), h: bubble.h };
      it(`${name}, balon ${b.w}x${b.h}: balon her hedefte ekranın içinde kalır ve deliği gereksiz örtmez`, () => {
        for (let ty = vp.top; ty <= vp.h - vp.bottom - 44; ty += 37) {
          for (const tx of [0, 16, vp.w / 2 - 22, vp.w - 60]) {
            const hole = holeFor({ x: tx, y: ty, w: 44, h: 44 }, vp);
            const p = placeBubble(hole, b, vp);
            expect(p.x).toBeGreaterThanOrEqual(vp.left + 12 - 0.01);
            expect(p.x + b.w).toBeLessThanOrEqual(vp.w - vp.right - 12 + 0.01);
            expect(p.y).toBeGreaterThanOrEqual(vp.top + 8 - 0.01);
            expect(p.y + b.h).toBeLessThanOrEqual(vp.h - vp.bottom - 8 + 0.01);
            expect(p.arrowX).toBeGreaterThanOrEqual(22);
            expect(p.arrowX).toBeLessThanOrEqual(b.w - 22);
            if (p.side === "below") expect(p.y).toBeGreaterThanOrEqual(hole.y + hole.h);
            if (p.side === "above") expect(p.y + b.h).toBeLessThanOrEqual(hole.y);
          }
        }
      });
    }
  }

  const vp = SIZES[1]![1];

  it("üstteki hedefte balon alta, alttaki hedefte üste gelir", () => {
    const b = { w: 320, h: 150 };
    expect(placeBubble(holeFor({ x: 20, y: 80, w: 100, h: 40 }, vp), b, vp).side).toBe("below");
    expect(placeBubble(holeFor({ x: 20, y: 720, w: 100, h: 40 }, vp), b, vp).side).toBe("above");
  });

  it("istenen taraf sığmıyorsa yön değiştirir", () => {
    const b = { w: 320, h: 200 };
    const nearTop = holeFor({ x: 20, y: 60, w: 100, h: 40 }, vp);
    expect(placeBubble(nearTop, b, vp, "above").side).toBe("below");
    const nearBottom = holeFor({ x: 20, y: 740, w: 100, h: 40 }, vp);
    expect(placeBubble(nearBottom, b, vp, "below").side).toBe("above");
  });

  it("klavye açıkken balon klavyenin üstünde kalır", () => {
    const kb: Viewport = { ...vp, bottom: 34 + 300 };
    const b = { w: 320, h: 150 };
    const p = placeBubble(holeFor({ x: 20, y: 300, w: 200, h: 48 }, kb), b, kb);
    expect(p.y + b.h).toBeLessThanOrEqual(kb.h - kb.bottom - 8);
  });

  it("iki tarafa da sığmayan balon ekranın içinde kalır", () => {
    const small: Viewport = { w: 360, h: 640, top: 24, bottom: 300, left: 0, right: 0 };
    const p = placeBubble(holeFor({ x: 20, y: 150, w: 300, h: 60 }, small), { w: 330, h: 260 }, small);
    expect(p.side).toBe("over");
    expect(p.y).toBeGreaterThanOrEqual(32);
    expect(p.y + 260).toBeLessThanOrEqual(640 - 300 - 8);
  });

  it("uzun hedefin deliği sınırlanır", () => {
    const hole = holeFor({ x: 16, y: 120, w: 358, h: 900 }, vp);
    expect(hole.h).toBeLessThanOrEqual((vp.h - vp.top - vp.bottom) * 0.45 + 0.01);
    expect(hole.x).toBeGreaterThanOrEqual(4);
    expect(hole.x + hole.w).toBeLessThanOrEqual(vp.w - 4);
  });

  it("delik güvenli alanın dışına taşmaz", () => {
    const hole = holeFor({ x: -10, y: 0, w: 60, h: 30 }, vp);
    expect(hole.y).toBeGreaterThanOrEqual(vp.top + 4);
    expect(hole.x).toBeGreaterThanOrEqual(4);
  });

  it("daire ve hap biçimi", () => {
    const c = holeFor({ x: 300, y: 700, w: 56, h: 56 }, vp, { shape: "circle", padding: 6 });
    expect(c.w).toBe(c.h);
    expect(c.r).toBe(c.w / 2);
    const p = holeFor({ x: 16, y: 740, w: 280, h: 60 }, vp, { shape: "pill" });
    expect(p.r).toBe(p.h / 2);
  });

  it("görünür alan denetimi güvenli alan ve klavyeyi sayar", () => {
    expect(isInView({ x: 10, y: 100, w: 50, h: 50 }, vp)).toBe(true);
    expect(isInView({ x: 10, y: 20, w: 50, h: 50 }, vp)).toBe(false);
    expect(isInView({ x: 10, y: 790, w: 50, h: 50 }, vp)).toBe(false);
    expect(isInView({ x: 10, y: 500, w: 50, h: 50 }, { ...vp, bottom: 400 })).toBe(false);
  });

  it("ölçü karşılaştırma ve adım atlama", () => {
    expect(sameRect({ x: 1, y: 2, w: 3, h: 4 }, { x: 1.3, y: 2, w: 3, h: 4 })).toBe(true);
    expect(sameRect({ x: 1, y: 2, w: 3, h: 4 }, { x: 2, y: 2, w: 3, h: 4 })).toBe(false);
    expect(sameRect(null, null)).toBe(true);
    expect(nextIndex(1, 4, new Set([1, 2]))).toBe(3);
    expect(nextIndex(2, 3, new Set([2]))).toBe(-1);
  });
});

describe("uzun hedefte delik kısaltma", () => {
  it("kısa ekran ve büyük yazıda balon sığmıyorsa delik kısaltılır, balon artık deliğin üstüne binmez", () => {
    const vp: Viewport = { w: 360, h: 640, top: 24, bottom: 0, left: 0, right: 0 };
    const balon = { w: 336, h: 250 };
    const hedef = { x: 16, y: 132, w: 328, h: 330 };
    const ilk = holeFor(hedef, vp);
    expect(placeBubble(ilk, balon, vp).side).toBe("over");
    const kisa = holeFor(hedef, vp, { maxH: holeMaxHeightFor(balon.h, vp, ilk.y) });
    const p = placeBubble(kisa, balon, vp);
    expect(p.side).toBe("below");
    expect(p.y).toBeGreaterThanOrEqual(kisa.y + kisa.h);
    expect(p.y + balon.h).toBeLessThanOrEqual(vp.h - vp.bottom - 8 + 0.01);
    expect(kisa.h).toBeGreaterThanOrEqual(48);
  });
});
