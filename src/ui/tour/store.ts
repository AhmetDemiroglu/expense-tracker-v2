/* Tur durumu ve "bir kez gösterildi" kaydı. */
import { create } from "zustand";
import type { Shape } from "./placement";

export interface TourStep {
  /** Hedef öğenin data-tour değeri. */
  target: string;
  title: string;
  text: string;
  shape?: Shape;
  padding?: number;
  placement?: "auto" | "above" | "below";
  /** Adımdan önce çalışır (sekme değiştir, alt sayfa aç). */
  before?: () => void | Promise<void>;
}

interface TourState {
  active: { id: string; steps: readonly TourStep[]; index: number; run: number } | null;
}

export const useTourStore = create<TourState>(() => ({ active: null }));

const PREFIX = "fintel_tour_";
export const MAX_STEPS = 5;

export function isTourSeen(id: string): boolean {
  try {
    return localStorage.getItem(PREFIX + id) === "1";
  } catch {
    return true;
  }
}

function markSeen(id: string): void {
  try {
    localStorage.setItem(PREFIX + id, "1");
  } catch {
    /* yoksay */
  }
}

/** Kaydı siler: id verilmezse hepsi (Ayarlar > "İpuçlarını yeniden göster"). */
export function resetTours(id?: string): void {
  try {
    if (id) {
      localStorage.removeItem(PREFIX + id);
      return;
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* yoksay */
  }
}

let run = 0;

/** Turu başlatır. Başka tur açıksa başlatmaz. En çok 5 adım gösterilir. */
export function startTour(id: string, steps: readonly TourStep[]): boolean {
  if (useTourStore.getState().active || !steps.length) return false;
  useTourStore.setState({ active: { id, steps: steps.slice(0, MAX_STEPS), index: 0, run: ++run } });
  return true;
}

/** Sonraki adım; son adımdaysa bitirir. */
export function advanceTour(): void {
  const a = useTourStore.getState().active;
  if (!a) return;
  if (a.index >= a.steps.length - 1) endTour();
  else useTourStore.setState({ active: { ...a, index: a.index + 1 } });
}

/** Turu kapatır ve gösterildi diye kaydeder (bitirme ve geçme aynı). */
export function endTour(): void {
  const a = useTourStore.getState().active;
  if (!a) return;
  markSeen(a.id);
  useTourStore.setState({ active: null });
}
