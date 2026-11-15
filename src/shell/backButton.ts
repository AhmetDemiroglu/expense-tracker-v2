/* Android donanım geri tuşu ve web'de Escape: hepsi goBack() yolunu kullanır. En dipte çift basışla çıkış. */
import { App } from "@capacitor/app";
import { tr } from "@/metin";
import { goBack, setBackFallback } from "@/ui/back";
import { toast } from "@/ui/overlays";
import { isNative } from "@/ui/platform";
import { useNav } from "./router/nav";
import { applyBack, backStep, exitConfirmed } from "./router/stack";

let started = false;

export function initBackButton(): void {
  if (started) return;
  started = true;
  setBackFallback(() => {
    const s = useNav.getState();
    if (backStep(s) === "exit") return false;
    useNav.setState(applyBack(s));
    return true;
  });
  let last: number | null = null;
  if (isNative) {
    void App.addListener("backButton", () => {
      if (goBack()) return;
      const now = Date.now();
      if (exitConfirmed(now, last)) {
        void App.exitApp();
        return;
      }
      last = now;
      toast(tr.ortak.cikisIcinTekrar);
    });
  } else {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") goBack();
    });
  }
}
