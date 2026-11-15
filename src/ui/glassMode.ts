/* Kök anahtar: kenar kırılmasını tümden kapatır (iOS yedeğini masaüstünde görmek ve zayıf cihazda kapatmak için). */
let lensEnabled = true;
const listeners = new Set<() => void>();

export function setLensEnabled(v: boolean): void {
  lensEnabled = v;
  listeners.forEach((fn) => fn());
}
export function isLensEnabled(): boolean {
  return lensEnabled;
}
export function subscribeLens(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
