/* Gezinme durumu: 4 kök sekme + üstüne binen ekran yığını. Saf fonksiyonlar (birim testli). */

export const TABS = ["ozet", "takvim", "kayitlar", "nova"] as const;
export type TabKey = (typeof TABS)[number];

export interface StackEntry {
  id: string;
  name: string;
  params: Record<string, unknown>;
}

export interface NavState {
  tab: TabKey;
  stack: readonly StackEntry[];
  /** Kimlik sayacı: her yeni ekran benzersiz id alır. */
  seq: number;
}

export const initialNav: NavState = { tab: "ozet", stack: [], seq: 0 };

export const tabIndex = (tab: TabKey): number => TABS.indexOf(tab);

export function push(s: NavState, name: string, params: Record<string, unknown> = {}): NavState {
  const seq = s.seq + 1;
  return { ...s, seq, stack: [...s.stack, { id: `${name}#${seq}`, name, params }] };
}

export function pop(s: NavState): NavState {
  if (!s.stack.length) return s;
  return { ...s, stack: s.stack.slice(0, -1) };
}

/** En üstteki ekranı yenisiyle değiştirir (yığın boşsa ekler). */
export function replace(s: NavState, name: string, params: Record<string, unknown> = {}): NavState {
  const seq = s.seq + 1;
  return { ...s, seq, stack: [...s.stack.slice(0, -1), { id: `${name}#${seq}`, name, params }] };
}

export function popToRoot(s: NavState): NavState {
  return s.stack.length ? { ...s, stack: [] } : s;
}

/** Sekme değiştirir. Üstte ekran varsa önce kapanır. */
export function setTab(s: NavState, tab: TabKey): NavState {
  if (s.tab === tab && !s.stack.length) return s;
  return { ...s, tab, stack: [] };
}

export type BackStep = "pop" | "tab" | "exit";

/** Geri basılınca ne olur: üst ekran kapanır, yoksa ilk sekmeye dönülür, o da değilse çıkış. */
export function backStep(s: NavState): BackStep {
  if (s.stack.length) return "pop";
  if (s.tab !== TABS[0]) return "tab";
  return "exit";
}

export function applyBack(s: NavState): NavState {
  const step = backStep(s);
  if (step === "pop") return pop(s);
  if (step === "tab") return setTab(s, TABS[0]);
  return s;
}

/** Çift basışla çıkış: ikinci basış süre içinde geldiyse true. */
export function exitConfirmed(now: number, lastPress: number | null, windowMs = 2000): boolean {
  return lastPress !== null && now - lastPress >= 0 && now - lastPress <= windowMs;
}

export type LayerMode = "live" | "pop" | "cover";
export interface Layer {
  entry: StackEntry;
  /** live: yığında. pop: sağa kayarak çıkıyor. cover: yenisi üstünü örtünce kaldırılacak (replace). */
  mode: LayerMode;
}

/** Yığın değişince çizilecek katmanlar: çıkan ekranlar animasyon bitene kadar tutulur. */
export function mergeLayers(prev: readonly Layer[], stack: readonly StackEntry[]): Layer[] {
  const ids = new Set(stack.map((e) => e.id));
  const wasLive = prev.filter((l) => l.mode === "live");
  const removed = wasLive.filter((l) => !ids.has(l.entry.id));
  const shrunk = stack.length < wasLive.length;
  const out: Layer[] = [];
  /* Önceden çıkmakta olanlar yerinde kalır. */
  const stillLeaving = prev.filter((l) => l.mode !== "live");
  if (!shrunk) removed.forEach((l) => out.push({ entry: l.entry, mode: "cover" }));
  stack.forEach((entry) => out.push({ entry, mode: "live" }));
  if (shrunk) removed.forEach((l) => out.push({ entry: l.entry, mode: "pop" }));
  stillLeaving.forEach((l) => {
    if (!out.some((o) => o.entry.id === l.entry.id)) out.push(l);
  });
  return out;
}
