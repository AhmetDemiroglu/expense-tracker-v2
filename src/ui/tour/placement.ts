/* Tur yerleşim hesabı: saf fonksiyonlar (birim testli). Tüm ölçüler tur katmanının kendi koordinatındadır
   (katman position: fixed ve body altında; hedef kutusu eksi katman kutusu). */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Katman ölçüsü ve kullanılamayan paylar: güvenli alan + (altta) klavye. */
export interface Viewport {
  w: number;
  h: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type Shape = "rect" | "pill" | "circle";
export type Side = "above" | "below" | "over";

export interface Hole extends Rect {
  r: number;
}

const MARGIN = 8;
const EDGE = 12;

/** Hedefin çevresindeki vurgu deliği. Çok uzun hedef kullanılabilir alanın %45'iyle sınırlanır, delik ekranda kalır. */
export function holeFor(target: Rect, vp: Viewport, opts: { padding?: number; shape?: Shape; maxH?: number } = {}): Hole {
  const pad = opts.padding ?? 8;
  const shape = opts.shape ?? "rect";
  let x = target.x - pad;
  let y = target.y - pad;
  let w = target.w + pad * 2;
  let h = target.h + pad * 2;
  if (shape === "circle") {
    const d = Math.max(w, h);
    x -= (d - w) / 2;
    y -= (d - h) / 2;
    w = d;
    h = d;
  }
  const usableH = vp.h - vp.top - vp.bottom;
  const minX = vp.left + 4;
  const minY = vp.top + 4;
  const maxW = vp.w - vp.left - vp.right - 8;
  const maxH = shape === "circle" ? usableH - 8 : Math.max(48, opts.maxH ?? usableH * 0.45);
  if (h > maxH) {
    /* Üst kısmı göster: açıklama balonuna yer kalsın. */
    h = maxH;
    if (shape === "circle") w = Math.min(w, h);
  }
  if (w > maxW) w = maxW;
  x = Math.min(Math.max(x, minX), Math.max(minX, vp.w - vp.right - 4 - w));
  y = Math.min(Math.max(y, minY), Math.max(minY, vp.h - vp.bottom - 4 - h));
  const r = shape === "rect" ? Math.min(16, h / 2, w / 2) : Math.min(w, h) / 2;
  return { x, y, w, h, r };
}

/** Balonun yeri. Sığdığı tarafa konur; istenen taraf sığmıyorsa yön değiştirir; iki taraf da dar ise deliğin üstüne biner. */
export function placeBubble(
  hole: Rect,
  bubble: { w: number; h: number },
  vp: Viewport,
  prefer: "auto" | "above" | "below" = "auto",
  gap = 14,
): { x: number; y: number; side: Side; arrowX: number } {
  const top = vp.top + MARGIN;
  const bottom = vp.h - vp.bottom - MARGIN;
  const spaceAbove = hole.y - gap - top;
  const spaceBelow = bottom - (hole.y + hole.h + gap);
  const fitsAbove = spaceAbove >= bubble.h;
  const fitsBelow = spaceBelow >= bubble.h;
  const centerY = hole.y + hole.h / 2;
  const natural: Side = centerY < (top + bottom) / 2 ? "below" : "above";
  const wanted: Side = prefer === "auto" ? natural : prefer;

  let side: Side;
  if (wanted === "below") side = fitsBelow ? "below" : fitsAbove ? "above" : "over";
  else side = fitsAbove ? "above" : fitsBelow ? "below" : "over";

  let y: number;
  if (side === "below") y = hole.y + hole.h + gap;
  else if (side === "above") y = hole.y - gap - bubble.h;
  else y = spaceBelow >= spaceAbove ? bottom - bubble.h : top;
  y = Math.max(top, Math.min(y, Math.max(top, bottom - bubble.h)));

  const minX = vp.left + EDGE;
  const maxX = Math.max(minX, vp.w - vp.right - EDGE - bubble.w);
  const cx = hole.x + hole.w / 2;
  const x = Math.max(minX, Math.min(cx - bubble.w / 2, maxX));
  const arrowX = Math.max(22, Math.min(bubble.w - 22, cx - x));
  return { x, y, side, arrowX };
}

/** Hedef kullanılabilir alanın içinde mi (kaydırmak gerekir mi). */
export function isInView(target: Rect, vp: Viewport, margin = 8): boolean {
  return (
    target.x >= vp.left - 1 &&
    target.x + target.w <= vp.w - vp.right + 1 &&
    target.y >= vp.top + margin &&
    target.y + target.h <= vp.h - vp.bottom - margin
  );
}

/** İki ölçü aynı mı (yarım piksel hoşgörü): gereksiz yeniden çizimi ve "oturdu mu" kararını belirler. */
export function sameRect(a: Rect | null, b: Rect | null, tol = 0.5): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.w - b.w) <= tol && Math.abs(a.h - b.h) <= tol;
}

/** Sonraki gösterilebilir adımın sırası (hedefi bulunamayanlar atlanır). Yoksa -1. */
export function nextIndex(from: number, count: number, missing: ReadonlySet<number>): number {
  for (let i = from; i < count; i++) if (!missing.has(i)) return i;
  return -1;
}

/** Balon deliğin ALTINA sığsın diye deliğin en çok olabileceği yükseklik (kısa ekran, büyük yazı). holeY: deliğin üst kenarı. */
export function holeMaxHeightFor(bubbleH: number, vp: Viewport, holeY: number, gap = 14): number {
  return Math.max(48, vp.h - vp.bottom - MARGIN - gap - bubbleH - holeY);
}
