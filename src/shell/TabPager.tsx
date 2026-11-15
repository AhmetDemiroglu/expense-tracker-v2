/* Kök sekmeler yan yana durur ve parmağı izleyerek kayar. Eşikler ui/gesture.ts içinde (hız ve mesafe, kenarda direnç).
   Dikey kaydırmayla çakışmaz (eksen kilidi + touch-action: pan-y). Kendi yatay jesti olan içerik data-swipe-lock taşır.
   Sekmeler bir kez kurulur ve açık kalır; görünmeyen sekme gizlenir ve etkisizdir (inert). */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { tr } from "@/metin";
import { EmptyState } from "@/ui/EmptyState";
import { pagerOffset, pagerTarget } from "@/ui/gesture";
import { haptic } from "@/ui/haptics";
import { useDrag } from "@/ui/useDrag";
import { ActiveContext, pagerPosition } from "./active";
import type { TabProps } from "./registry";
import { nav, useNav } from "./router/nav";
import { TABS, tabIndex, type TabKey } from "./router/stack";
import { TabPage } from "./TabPage";

const COUNT = TABS.length;

function Placeholder() {
  return (
    <TabPage>
      <EmptyState className="flex-1" title={tr.ortak.bos.hazirlaniyor} />
    </TabPage>
  );
}

export function TabPager({ tabs }: { tabs: Partial<Record<TabKey, ComponentType<TabProps>>> }) {
  const tab = useNav((s) => s.tab);
  const covered = useNav((s) => s.stack.length > 0);
  const index = tabIndex(tab);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  /* Sürükleme ya da geçiş sürerken komşu sekmeler de görünür. */
  const [moving, setMoving] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback((i: number, dx: number, animate: boolean) => {
    const el = track.current;
    if (!el) return;
    el.style.transition = animate ? "transform var(--f-dur-slow) var(--f-ease)" : "none";
    el.style.transform = `translate3d(calc(${(-100 / COUNT) * i}% + ${dx}px),0,0)`;
  }, []);

  const first = useRef(true);
  useLayoutEffect(() => {
    place(index, 0, !first.current);
    pagerPosition.emit(index);
    if (first.current) {
      first.current = false;
      return;
    }
    setMoving(true);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => setMoving(false), 460);
  }, [index, place]);
  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  useDrag(viewport, {
    axis: "x",
    lockAttr: "data-swipe-lock",
    enabled: !covered,
    onStart: () => {
      width.current = viewport.current?.offsetWidth || window.innerWidth;
      if (settle.current) clearTimeout(settle.current);
      setMoving(true);
    },
    onMove: (d) => {
      const dx = pagerOffset(d, index, COUNT, width.current);
      place(index, dx, false);
      pagerPosition.emit(index - dx / width.current);
    },
    onEnd: ({ distance, velocity, cancelled }) => {
      const next = cancelled ? index : pagerTarget(distance, velocity, index, COUNT, width.current);
      if (next !== index) {
        haptic.selection();
        const key = TABS[next];
        if (key) nav.setTab(key);
      } else {
        place(index, 0, true);
        pagerPosition.emit(index);
        if (settle.current) clearTimeout(settle.current);
        settle.current = setTimeout(() => setMoving(false), 460);
      }
    },
  });

  return (
    <div ref={viewport} className="absolute inset-0 overflow-hidden" style={{ touchAction: "pan-y" }}>
      <div ref={track} className="flex h-full will-change-transform" style={{ width: `${COUNT * 100}%` }}>
        {TABS.map((key, i) => {
          const Comp = tabs[key] ?? Placeholder;
          const here = i === index;
          const active = here && !covered;
          return (
            <section
              key={key}
              aria-label={tr.ortak.sekme[key]}
              aria-hidden={!here}
              inert={!here}
              className="relative h-full"
              style={{ width: `${100 / COUNT}%`, visibility: here || moving ? "visible" : "hidden" }}
            >
              <ActiveContext.Provider value={active}>
                <Comp active={active} />
              </ActiveContext.Provider>
            </section>
          );
        })}
      </div>
    </div>
  );
}
