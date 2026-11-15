/* Üst bar (yatay logo + profil), alt yüzen cam kapsül (4 sekme) ve ayrı yüzen bakır ekle düğmesi. */
import { useEffect, useRef } from "react";
import { CalendarDays, House, Plus, ReceiptText, Sparkles, UserRound } from "lucide-react";
import { Logo } from "@/brand/Logo";
import { tr } from "@/metin";
import { IconButton } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Glass } from "@/ui/Glass";
import { haptic } from "@/ui/haptics";
import { useKeyboardOpen } from "@/ui/layout";
import { pagerPosition } from "./active";
import { nav, useNav } from "./router/nav";
import { TABS, tabIndex, type TabKey } from "./router/stack";

export function TopBar({ onProfile }: { onProfile?: () => void }) {
  return (
    <header className="absolute inset-x-0 top-0 flex items-end pt-(--safe-top)" style={{ zIndex: "var(--z-bar)", height: "var(--content-top)" }}>
      <div className="flex h-(--topbar-h) w-full items-center justify-between pr-2 pl-(--page-x)">
        <Logo variant="horizontal" height={30} />
        <IconButton label={tr.ortak.profil} variant="tinted" onClick={onProfile} data-tour="profil">
          <UserRound size={20} aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}

const ICONS: Record<TabKey, typeof House> = { ozet: House, takvim: CalendarDays, kayitlar: ReceiptText, nova: Sparkles };

export interface TabBarProps {
  onAdd?: () => void;
  /** row: ekle düğmesi kapsülün yanında. above: kapsülün üstünde, sağda. */
  addPlacement?: "row" | "above";
}

export function TabBar({ onAdd, addPlacement = "row" }: TabBarProps) {
  const tab = useNav((s) => s.tab);
  const keyboard = useKeyboardOpen();
  const pill = useRef<HTMLSpanElement>(null);

  /* Seçili sekme işareti parmağı izler (TabPager konumu yayınlar). */
  useEffect(() => {
    const set = (pos: number) => {
      if (pill.current) pill.current.style.transform = `translate3d(${pos * 100}%,0,0)`;
    };
    set(tabIndex(useNav.getState().tab));
    return pagerPosition.subscribe(set);
  }, []);

  const add = (
    <button
      type="button"
      aria-label={tr.ortak.kayitEkle}
      data-tour="ekle"
      onClick={() => {
        haptic.medium();
        onAdd?.();
      }}
      className="pressable flex h-(--tabbar-h) w-(--tabbar-h) shrink-0 items-center justify-center rounded-pill bg-copper text-on-copper shadow-(--f-shadow-float)"
    >
      <Plus size={28} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );

  return (
    <div
      className="absolute inset-x-0 flex items-end gap-2 px-(--page-x) transition-transform duration-(--f-dur) ease-fintel"
      style={{ zIndex: "var(--z-tabbar)", bottom: "var(--tabbar-bottom)", transform: keyboard ? "translateY(200%)" : undefined }}
    >
      <Glass as="nav" tone="dense" lens radius="pill" aria-label={tr.ortak.uygulama} data-tour="sekmeler" className="min-h-(--tabbar-h) min-w-0 flex-1 p-1">
        <div className="relative flex h-full min-h-[calc(var(--tabbar-h)-8px)]">
          <span ref={pill} aria-hidden="true" className="absolute inset-y-0 left-0 rounded-pill bg-accent/12 will-change-transform" style={{ width: `${100 / TABS.length}%`, transition: "transform var(--f-dur-fast) linear" }} />
          {TABS.map((key) => {
            const Icon = ICONS[key];
            const on = key === tab;
            return (
              <button
                key={key}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => {
                  if (!on) haptic.selection();
                  nav.setTab(key);
                }}
                className={cn("relative z-1 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-pill py-1 transition-colors", on ? "text-accent" : "text-text-3")}
              >
                <Icon size={22} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                <span className={cn("text-xs whitespace-nowrap", on ? "font-semibold" : "font-medium")}>{tr.ortak.sekme[key]}</span>
              </button>
            );
          })}
        </div>
      </Glass>
      {addPlacement === "row" ? add : <div className="absolute right-(--page-x) bottom-[calc(var(--tabbar-h)+12px)]">{add}</div>}
    </div>
  );
}
