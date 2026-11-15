// TEK "bugün" kaynağı. Cihazın yerel günü; gece yarısında ve uygulama öne gelince yenilenir.

import { create } from "zustand";
import { today, type LocalDate } from "@/core";
import { oneGelinceDinle } from "@/services/platform";

interface BugunDurumu {
  bugun: LocalDate;
  yenile(): void;
  /** Yalnız testler için */
  ayarla(d: LocalDate): void;
}

export const useBugunStore = create<BugunDurumu>((set, get) => ({
  bugun: today(),
  yenile() {
    const d = today();
    if (d !== get().bugun) set({ bugun: d });
  },
  ayarla(d) {
    set({ bugun: d });
  },
}));

let basladi = false;

/** Kabuk bir kez çağırır (useOturum.baslat içinden çağrılır). */
export function bugunuIzle(): void {
  if (basladi || typeof window === "undefined") return;
  basladi = true;
  const yenile = (): void => useBugunStore.getState().yenile();
  const kur = (): void => {
    const simdi = new Date();
    const yarin = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 1, 0, 0, 2);
    setTimeout(() => {
      yenile();
      kur();
    }, Math.max(1000, yarin.getTime() - simdi.getTime()));
  };
  kur();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") yenile();
  });
  window.addEventListener("focus", yenile);
  oneGelinceDinle(yenile);
}
