/* Üst bar (cam kapsül: yatay logo + profil), alt yüzen cam kapsül (4 sekme) ve ayrı yüzen bakır ekle düğmesi. */
import { useEffect, useRef, type ComponentType } from "react";
import { CalendarDays, House, Plus, ReceiptText, Settings } from "lucide-react";
import { Logo } from "@/brand/Logo";
import { tr } from "@/metin";
import { IconButton } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Glass } from "@/ui/Glass";
import { haptic } from "@/ui/haptics";
import { useKeyboardOpen } from "@/ui/layout";
import { NovaGlyph } from "@/ui/nova/Nova";
import { pagerPosition } from "./active";
import { nav, useNav } from "./router/nav";
import { TABS, tabIndex, type TabKey } from "./router/stack";

/** Üst bar: cam kapsül. Logo ve Ayarlar düğmesi (dişli) bu yüzeyin içinde durur (yüzen öğe yok). */
export function TopBar({ onProfile }: { onProfile?: () => void }) {
  return (
    <header className="absolute inset-x-0 top-0 flex items-end px-(--page-x) pt-(--safe-top)" style={{ zIndex: "var(--z-bar)", height: "var(--content-top)" }}>
      <Glass tone="dense" lens radius="pill" className="mb-1.5 flex min-h-13 w-full items-center justify-between py-1 pr-1 pl-5">
        <Logo variant="horizontal" height={28} />
        <IconButton label={tr.ortak.ayarlar} variant="tinted" onClick={onProfile} data-tour="profil">
          <Settings size={20} aria-hidden="true" />
        </IconButton>
      </Glass>
    </header>
  );
}

type TabIcon = ComponentType<{ size?: number; strokeWidth?: number }>;
const ICONS: Record<TabKey, TabIcon> = { ozet: House, takvim: CalendarDays, kayitlar: ReceiptText, nova: NovaGlyph };

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
