// Platform bilgisi ve sürüm. Dokunsal geri bildirim TEK modülde: `haptic` (@/ui, src/ui/haptics.ts).

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const ad = Capacitor.getPlatform();

export const platform: { ad: "android" | "ios" | "web"; native: boolean } = {
  ad: ad === "android" || ad === "ios" ? ad : "web",
  native: Capacitor.isNativePlatform(),
};

let surum: string | null = null;

export async function uygulamaSurumu(): Promise<string> {
  if (surum) return surum;
  try {
    surum = platform.native ? (await App.getInfo()).version : "3.0.0";
  } catch {
    surum = "3.0.0";
  }
  return surum;
}

/** Uygulama öne gelince (bugün ve bağlantı yenilemesi için). Dönen fonksiyon dinlemeyi bırakır. */
export function oneGelinceDinle(cb: () => void): () => void {
  if (!platform.native) return () => undefined;
  const h = App.addListener("appStateChange", (s) => {
    if (s.isActive) cb();
  });
  return () => {
    void h.then((x) => x.remove());
  };
}
