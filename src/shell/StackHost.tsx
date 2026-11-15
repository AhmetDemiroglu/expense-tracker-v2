/* Üst ekran yığını. Ekran sağdan girer, alttaki katman hafifçe sola kayar (iOS hissi), açılan alan perdeyle kararır.
   Sol kenardan (24 px) parmakla geri: Android'de de çalışır. Yalnız transform ve (perdede) opacity hareket eder. */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { goBack } from "@/ui/back";
import { GESTURE, shouldGoBack } from "@/ui/gesture";
import { useDrag } from "@/ui/useDrag";
import { ActiveContext } from "./active";
import type { ScreenProps } from "./registry";
import { useNav } from "./router/nav";
import { mergeLayers, type Layer, type StackEntry } from "./router/stack";

const UNDER = -22; /* alttaki katmanın sola kayma payı (%) */
const DIM = 0.5;
const EASE = "var(--f-dur-slow) var(--f-ease)";

function Missing({ name }: { name: string }) {
  useEffect(() => {
    if (import.meta.env.DEV) console.warn(`[shell] Kayıtlı olmayan ekran: "${name}". src/screens/<klasör>/kayit.tsx içinde screens'e ekle.`);
  }, [name]);
  return null;
}

/** Kök (sekmeler) katmanı bu bileşenden hemen ÖNCE gelen kardeş öğedir: alttaki katman olarak o kayar. */
export function StackHost({ screens }: { screens: Record<string, ComponentType<ScreenProps>> }) {
  const stack = useNav((s) => s.stack);
  const [seen, setSeen] = useState<readonly StackEntry[]>(stack);
  const [layers, setLayers] = useState<Layer[]>(() => stack.map((entry) => ({ entry, mode: "live" })));
  if (seen !== stack) {
    setSeen(stack);
    setLayers(mergeLayers(layers, stack));
  }

  const host = useRef<HTMLDivElement>(null);
  const rootEl = () => (host.current?.previousElementSibling ?? null) as HTMLElement | null;
  const els = useRef(new Map<string, HTMLDivElement>());
  const dims = useRef(new Map<string, HTMLDivElement>());
  const entered = useRef(new Set<string>());
  const hideRoot = useRef<ReturnType<typeof setTimeout> | null>(null);

  const live = layers.filter((l) => l.mode === "live");
  const liveCount = live.length;

  /* Katmanların dinlenme konumunu yazar. animate: geçişli. */
  const apply = (animate: boolean) => {
    const t = animate ? `transform ${EASE}` : "none";
    const o = animate ? `opacity ${EASE}` : "none";
    const liveIds = layers.filter((l) => l.mode === "live").map((l) => l.entry.id);
    const topIndex = liveIds.length - 1;
    for (const l of layers) {
      const el = els.current.get(l.entry.id);
      const dim = dims.current.get(l.entry.id);
      if (!el) continue;
      const depth = topIndex - liveIds.indexOf(l.entry.id); /* 0: en üst */
      if (l.mode === "pop") {
        el.style.transition = t;
        el.style.transform = "translate3d(100%,0,0)";
        el.style.visibility = "";
        if (dim) {
          dim.style.transition = o;
          dim.style.opacity = "0";
        }
        continue;
      }
      if (l.mode === "cover") continue;
      if (!entered.current.has(l.entry.id)) {
        /* Yeni ekran: sağdan başlar, bir sonraki karede yerine kayar. */
        entered.current.add(l.entry.id);
        el.style.transition = "none";
        el.style.transform = "translate3d(100%,0,0)";
        if (dim) {
          dim.style.transition = "none";
          dim.style.opacity = "0";
        }
        void el.offsetWidth;
        el.style.transition = `transform ${EASE}`;
        el.style.transform = "translate3d(0,0,0)";
        if (dim) {
          dim.style.transition = `opacity ${EASE}`;
          dim.style.opacity = String(DIM);
        }
        continue;
      }
      el.style.transition = t;
      el.style.transform = depth === 0 ? "translate3d(0,0,0)" : `translate3d(${UNDER}%,0,0)`;
      el.style.visibility = depth >= 2 ? "hidden" : "";
      if (dim) {
        dim.style.transition = o;
        dim.style.opacity = String(DIM);
      }
    }
    const root = rootEl();
    if (root) {
      if (hideRoot.current) clearTimeout(hideRoot.current);
      hideRoot.current = null;
      root.style.transition = t;
      if (liveIds.length === 0) {
        root.style.transform = "";
        root.style.visibility = "";
      } else {
        root.style.transform = `translate3d(${UNDER}%,0,0)`;
        /* Üst ekran yerine oturunca kök gizlenir (cam ve içerik boşuna çizilmesin). */
        hideRoot.current = setTimeout(() => {
          root.style.visibility = "hidden";
        }, 480);
      }
    }
  };
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });

  useLayoutEffect(() => {
    applyRef.current(true);
    const ids = new Set(layers.map((l) => l.entry.id));
    entered.current.forEach((id) => {
      if (!ids.has(id)) entered.current.delete(id);
    });
  }, [layers]);

  /* Çıkan katmanlar animasyon bitince kaldırılır. */
  const leaving = layers.some((l) => l.mode !== "live");
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLayers((ls) => ls.filter((l) => l.mode === "live")), 460);
    return () => clearTimeout(id);
  }, [leaving, layers]);

  useEffect(
    () => () => {
      if (hideRoot.current) clearTimeout(hideRoot.current);
    },
    [],
  );

  /* Sol kenardan geri. */
  const drag = useRef<{ top: HTMLDivElement; dim: HTMLDivElement | undefined; under: HTMLElement | null; w: number } | null>(null);
  useDrag(host, {
    axis: "x",
    edge: GESTURE.edge,
    enabled: liveCount > 0 && !leaving,
    canStart: ({ dx }) => dx > 0,
    onStart: () => {
      const top = live[live.length - 1];
      const below = live[live.length - 2];
      const topEl = top ? els.current.get(top.entry.id) : undefined;
      if (!topEl) return;
      const under: HTMLElement | null = below ? (els.current.get(below.entry.id) ?? null) : rootEl();
      if (hideRoot.current) clearTimeout(hideRoot.current);
      if (under) {
        under.style.visibility = "";
        under.style.transition = "none";
      }
      topEl.style.transition = "none";
      const dim = top ? dims.current.get(top.entry.id) : undefined;
      if (dim) dim.style.transition = "none";
      drag.current = { top: topEl, dim, under, w: host.current?.offsetWidth || window.innerWidth };
    },
    onMove: (d) => {
      const g = drag.current;
      if (!g) return;
      const x = Math.max(0, d);
      const p = Math.min(1, x / g.w);
      g.top.style.transform = `translate3d(${x}px,0,0)`;
      if (g.dim) g.dim.style.opacity = String(DIM * (1 - p));
      if (g.under) g.under.style.transform = `translate3d(${UNDER * (1 - p)}%,0,0)`;
    },
    onEnd: ({ distance, velocity, cancelled }) => {
      const g = drag.current;
      drag.current = null;
      if (!g) return;
      if (!cancelled && shouldGoBack(distance, velocity, g.w)) {
        const before = useNav.getState().stack;
        goBack();
        /* Ekranın kendi geri işleyicisi geri gitmeyi durdurduysa yerine döner. */
        if (useNav.getState().stack === before) applyRef.current(true);
      } else {
        applyRef.current(true);
      }
    },
  });

  return (
    <div ref={host} className="f-clip pointer-events-none absolute inset-0" style={{ zIndex: "var(--z-stack)", touchAction: "pan-y" }}>
      {layers.map((l) => {
        const Comp = screens[l.entry.name];
        const top = live[live.length - 1];
        const active = l.mode === "live" && top?.entry.id === l.entry.id;
        return (
          <div
            key={l.entry.id}
            ref={(el) => {
              if (el) els.current.set(l.entry.id, el);
              else els.current.delete(l.entry.id);
            }}
            data-edge-back=""
            inert={!active}
            className="f-stack-layer f-backdrop"
            style={{ pointerEvents: active ? "auto" : "none" }}
          >
            <div
              ref={(el) => {
                if (el) dims.current.set(l.entry.id, el);
                else dims.current.delete(l.entry.id);
              }}
              aria-hidden="true"
              className="f-stack-dim"
            />
            <ActiveContext.Provider value={active}>{Comp ? <Comp params={l.entry.params} active={active} /> : <Missing name={l.entry.name} />}</ActiveContext.Provider>
          </div>
        );
      })}
    </div>
  );
}
