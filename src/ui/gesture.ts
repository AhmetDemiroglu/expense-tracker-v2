/* Jest hesapları: saf fonksiyonlar (DOM yok), birim testli. Eşikler tek yerde. */

export const GESTURE = {
  /** Eksen kararı için gereken hareket (px). */
  slop: 10,
  /** Yatay sayılmak için |dx| en az |dy| x bu oran olmalı. */
  axisBias: 1.2,
  /** Sekme geçişi: genişliğin bu oranını geçince bırakılırsa geçer. */
  pageDistance: 0.32,
  /** Sekme geçişi: bu hızın (px/ms) üstündeki fırlatma geçirir. */
  pageVelocity: 0.4,
  /** Geri jesti: genişliğin bu oranı ya da hız. */
  backDistance: 0.35,
  backVelocity: 0.5,
  /** Geri jestinin başladığı sol kenar bölgesi (px). */
  edge: 24,
  /** Alt sayfa kapatma: mesafe (px) ya da hız (px/ms). */
  sheetDistance: 110,
  sheetVelocity: 0.6,
  /** Satır kaydırma: düğme açılma eşiği ve tam kaydırma oranı. */
  rowOpen: 36,
  rowFull: 0.6,
  /** Aşağı çekip yenileme eşiği (px). */
  pull: 64,
} as const;

export type Axis = "x" | "y";

/** Hareket eşiği aşıldıysa ekseni söyler, aşılmadıysa null. */
export function lockAxis(dx: number, dy: number, slop: number = GESTURE.slop, bias: number = GESTURE.axisBias): Axis | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < slop && ay < slop) return null;
  return ax >= ay * bias ? "x" : "y";
}

/** Kenar direnci: sınırın ötesine çekilen mesafe azalarak ilerler (iOS lastik bant). */
export function rubber(overshoot: number, dimension: number, c = 0.55): number {
  if (dimension <= 0) return 0;
  const sign = overshoot < 0 ? -1 : 1;
  const x = Math.abs(overshoot);
  return sign * (1 - 1 / ((x * c) / dimension + 1)) * dimension;
}

/** Sekme sürüklemesinde gösterilecek kayma: uçlarda dirençli. dx > 0 önceki sayfaya doğru. */
export function pagerOffset(dx: number, index: number, count: number, width: number): number {
  const atStart = index === 0 && dx > 0;
  const atEnd = index === count - 1 && dx < 0;
  if (atStart || atEnd) return rubber(dx, width, 0.4);
  return Math.max(-width, Math.min(width, dx));
}

/** Bırakınca hangi sayfa: mesafe ya da hız eşiği, bir seferde en çok bir sayfa. velocity px/ms, işaret dx ile aynı. */
export function pagerTarget(dx: number, velocity: number, index: number, count: number, width: number): number {
  let step = 0;
  const far = Math.abs(dx) > width * GESTURE.pageDistance;
  const fast = Math.abs(velocity) > GESTURE.pageVelocity && Math.sign(velocity) === Math.sign(dx);
  if ((far || fast) && Math.abs(dx) > GESTURE.slop) step = dx < 0 ? 1 : -1;
  return Math.max(0, Math.min(count - 1, index + step));
}

/** Sol kenardan geri: bırakınca ekran kapanır mı. */
export function shouldGoBack(dx: number, velocity: number, width: number): boolean {
  if (dx <= GESTURE.slop) return false;
  return dx > width * GESTURE.backDistance || velocity > GESTURE.backVelocity;
}

/** Alt sayfa aşağı çekildi: kapanır mı. */
export function shouldDismiss(dy: number, velocity: number): boolean {
  if (dy <= 0) return false;
  return dy > GESTURE.sheetDistance || velocity > GESTURE.sheetVelocity;
}

export type RowRest = "closed" | "delete" | "edit" | "delete-full" | "edit-full";

/** Satır bırakıldı. dx < 0 sola (sil), dx > 0 sağa (düzenle). Yok sayılan yön kapalıya döner. */
export function rowRest(dx: number, velocity: number, width: number, has: { del: boolean; edit: boolean }): RowRest {
  const dist = Math.abs(dx);
  const side = dx < 0 ? "delete" : "edit";
  if ((side === "delete" && !has.del) || (side === "edit" && !has.edit)) return "closed";
  const sameDir = Math.sign(velocity) === Math.sign(dx);
  if (dist > width * GESTURE.rowFull) return `${side}-full`;
  if (dist > GESTURE.rowOpen || (sameDir && Math.abs(velocity) > 0.5 && dist > GESTURE.slop)) return side;
  return "closed";
}

/** Alt sayfa durakları arasında en yakını; hızlı çekiş bir sonraki durağa atlar. offsets küçükten büyüğe (0 = tam açık). */
export function nearestDetent(offset: number, velocity: number, offsets: readonly number[]): number {
  if (!offsets.length) return 0;
  let best = 0;
  let bestDist = Infinity;
  offsets.forEach((o, i) => {
    const d = Math.abs(o - offset);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  if (Math.abs(velocity) > GESTURE.sheetVelocity) {
    const dir = velocity > 0 ? 1 : -1;
    const cur = offsets[best] ?? 0;
    const moved = dir > 0 ? offset >= cur : offset <= cur;
    if (moved) best = Math.max(0, Math.min(offsets.length - 1, best + dir));
  }
  return best;
}

/** Son ~100 ms'nin hızı (px/ms). */
export class VelocityTracker {
  private samples: { t: number; v: number }[] = [];
  add(value: number, time: number): void {
    this.samples.push({ t: time, v: value });
    while (this.samples.length > 2 && time - (this.samples[0]?.t ?? time) > 100) this.samples.shift();
  }
  get(): number {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last || last.t === first.t) return 0;
    return (last.v - first.v) / (last.t - first.t);
  }
}

/** Tuş takımı: metne tuş uygular. Biçim "1234,56". En çok 9 tam hane, 2 ondalık. */
export function keypadPress(value: string, key: string): string {
  if (key === "sil") return value.slice(0, -1);
  if (key === ",") {
    if (value.includes(",")) return value;
    return value === "" ? "0," : `${value},`;
  }
  if (!/^[0-9]$/.test(key)) return value;
  const [int = "", dec] = value.split(",");
  if (dec !== undefined) return dec.length >= 2 ? value : value + key;
  if (int === "0") return key === "0" ? value : key;
  if (int.length >= 9) return value;
  return value + key;
}

/** Tuş takımı metnini binlik noktalı gösterir: "1234,5" -> "1.234,5". */
export function keypadDisplay(value: string): string {
  if (!value) return "0";
  const [int = "", dec] = value.split(",");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== undefined ? `${grouped},${dec}` : grouped;
}
