import { useEffect } from "react";
import { isTourSeen, resetTours, startTour, useTourStore, type TourStep } from "./store";

export function useTour(): { start: (id: string, steps: readonly TourStep[]) => boolean; isSeen: (id: string) => boolean; reset: (id?: string) => void; active: boolean } {
  const active = useTourStore((s) => s.active !== null);
  return { start: startTour, isSeen: isTourSeen, reset: resetTours, active };
}

/** Turu bir kez, kendiliğinden gösterir. when: ekran önde ve verisi hazır olduğunda true. */
export function useAutoTour(id: string, steps: readonly TourStep[], opts: { when: boolean; delay?: number }): void {
  const { when, delay = 700 } = opts;
  const hazir = useTourStore((s) => s.hazir);
  useEffect(() => {
    if (!when || !hazir || isTourSeen(id)) return;
    const timer = setTimeout(() => {
      if (!isTourSeen(id)) startTour(id, steps);
    }, delay);
    return () => clearTimeout(timer);
    // Adım listesi her çizimde yeni dizi olabilir: yalnız id ve when izlenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, when, hazir, delay]);
}
