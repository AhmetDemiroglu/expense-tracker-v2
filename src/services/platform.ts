// Platform bilgisi, sürüm, dokunsal geri bildirim. Capacitor.isNativePlatform senkron: ilk karede doğru.

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

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

export type DokunsalTur = "hafif" | "orta" | "basari" | "uyari";

export function dokunsal(tur: DokunsalTur): void {
  if (!platform.native) return;
  const p =
    tur === "hafif"
      ? Haptics.impact({ style: ImpactStyle.Light })
      : tur === "orta"
        ? Haptics.impact({ style: ImpactStyle.Medium })
        : Haptics.notification({ type: tur === "basari" ? NotificationType.Success : NotificationType.Warning });
  void p.catch(() => undefined);
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
