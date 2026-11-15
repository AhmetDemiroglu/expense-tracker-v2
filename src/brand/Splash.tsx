/* Hareketli açılış: logonun gövdesi ve iki kolu sırayla çizilir, sonra isim belirir. Toplam 1,2 sn altı.
   Native açılış ekranı burada gizlenir (capacitor.config: launchAutoHide false). */
import { useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { prefersReducedMotion } from "@/ui/motion";
import { useTheme } from "@/ui/useTheme";
import nameLight from "../../brand/logo/svg/wordmark-light.svg";
import nameDark from "../../brand/logo/svg/wordmark-dark.svg";
import { LogoMark } from "./LogoMark";

export interface SplashProps {
  onDone: () => void;
  /** Animasyon bitince bu da beklenir (en çok 2,5 sn): veri açılışı. */
  ready?: Promise<unknown>;
}

const ANIM_MS = 980;
const EXIT_MS = 160;
const MAX_WAIT_MS = 2500;

export function Splash({ onDone, ready }: SplashProps) {
  const { resolved } = useTheme();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let alive = true;
    let exit: ReturnType<typeof setTimeout> | undefined;
    requestAnimationFrame(() => void SplashScreen.hide().catch(() => {}));
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const anim = wait(prefersReducedMotion() ? 400 : ANIM_MS);
    const data = Promise.race([Promise.resolve(ready).catch(() => {}), wait(MAX_WAIT_MS)]);
    void Promise.all([anim, data]).then(() => {
      if (!alive) return;
      setLeaving(true);
      exit = setTimeout(() => alive && onDone(), EXIT_MS);
    });
    return () => {
      alive = false;
      if (exit) clearTimeout(exit);
    };
    // Açılış bir kez oynar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="img"
      aria-label="Fintel"
      className="f-backdrop fixed inset-0 flex flex-col items-center justify-center gap-5"
      style={{ zIndex: "var(--z-splash)", opacity: leaving ? 0 : 1, transition: `opacity ${EXIT_MS}ms var(--f-ease)`, pointerEvents: leaving ? "none" : "auto" }}
    >
      <LogoMark size={104} tone={resolved} animate />
      <img src={resolved === "dark" ? nameDark : nameLight} alt="" draggable={false} className="f-splash-name" style={{ height: 40, width: "auto" }} />
    </div>
  );
}
