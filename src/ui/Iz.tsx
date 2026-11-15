/* Olay izi: YALNIZ geliştirmede, adrese ?iz eklenince açılır (yayın paketine girmez).
   Gerçek cihazda ya da simülatörde jest hatası ararken son dokunma, işaretçi ve tıklama olaylarını ekrana yazar. */
import { useEffect, useState } from "react";

const TIPLER = ["pointerdown", "pointerup", "pointercancel", "touchstart", "touchend", "touchcancel", "click"];

export default function Iz() {
  const [satirlar, setSatirlar] = useState<string[]>([]);
  useEffect(() => {
    const t0 = performance.now();
    const ekle = (satir: string) => setSatirlar((l) => [...l.slice(-15), satir]);
    const yaz = (e: Event) => {
      const el = e.target as Element | null;
      const etiket = el?.closest?.("[aria-label]")?.getAttribute("aria-label");
      const ad = el ? `${el.tagName.toLowerCase()}${etiket ? `[${etiket.slice(0, 14)}]` : ""}` : "?";
      const ek = e instanceof PointerEvent ? ` ${e.pointerType}` : "";
      ekle(`${Math.round(performance.now() - t0)} ${e.type}${ek} ${ad}`);
    };
    TIPLER.forEach((t) => window.addEventListener(t, yaz, true));
    /* Tıklama hedefe ulaştı mı: kabarcık aşaması. */
    const son = (e: Event) => ekle(e.defaultPrevented ? "   click ENGELLENDI" : "   click gecti");
    document.addEventListener("click", son);
    return () => {
      TIPLER.forEach((t) => window.removeEventListener(t, yaz, true));
      document.removeEventListener("click", son);
    };
  }, []);
  return (
    <pre className="pointer-events-none fixed inset-x-2 top-36 rounded-control bg-text p-2 font-mono text-xs text-bg opacity-90" style={{ zIndex: 999 }}>
      {satirlar.join("\n") || "iz bekleniyor"}
    </pre>
  );
}
