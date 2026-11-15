// Bağlantı durumu. @capacitor/network kurulu değil: navigator.onLine + online/offline olayları.
// Firestore'un "önbellekten" bilgisi ayrıca useVeri.onbellektenMi içinde.

import { create } from "zustand";

interface BaglantiDurumu {
  cevrimici: boolean;
}

export const useBaglanti = create<BaglantiDurumu>(() => ({
  cevrimici: typeof navigator === "undefined" ? true : navigator.onLine !== false,
}));

let basladi = false;

export function baglantiyiIzle(): void {
  if (basladi || typeof window === "undefined") return;
  basladi = true;
  window.addEventListener("online", () => useBaglanti.setState({ cevrimici: true }));
  window.addEventListener("offline", () => useBaglanti.setState({ cevrimici: false }));
}
