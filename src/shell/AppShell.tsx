/* Uygulama kabuğu: zemin, üst bar, kayan kök sekmeler, alt cam kapsül, ekle düğmesi, üst ekran yığını, ortak alt sayfalar.
   Veri katmanına bağımlı değildir: sekme, ekran ve alt sayfa bileşenlerini prop olarak alır. */
import { useEffect, type ComponentType } from "react";
import { TabBar, TopBar, type TabBarProps } from "./bars";
import type { ScreenProps, SheetScreenProps, TabProps } from "./registry";
import type { TabKey } from "./router/stack";
import { sheets, useSheets } from "./sheets";
import { StackHost } from "./StackHost";
import { TabPager } from "./TabPager";

export interface AppShellProps {
  tabs: Partial<Record<TabKey, ComponentType<TabProps>>>;
  screens?: Record<string, ComponentType<ScreenProps>>;
  sheets?: Record<string, ComponentType<SheetScreenProps>>;
  onAdd?: () => void;
  onProfile?: () => void;
  addPlacement?: TabBarProps["addPlacement"];
}

const NO_SCREENS: Record<string, ComponentType<ScreenProps>> = {};

function SheetHost({ registry }: { registry: Record<string, ComponentType<SheetScreenProps>> }) {
  const current = useSheets((s) => s.current);
  const Comp = current ? registry[current.name] : undefined;
  useEffect(() => {
    if (current && !Comp && import.meta.env.DEV) console.warn(`[shell] Kayıtlı olmayan alt sayfa: "${current.name}".`);
  }, [current, Comp]);
  if (!current || !Comp) return null;
  return <Comp key={current.id} open={current.open} close={sheets.close} params={current.params} />;
}

export function AppShell({ tabs, screens = NO_SCREENS, sheets: sheetRegistry, onAdd, onProfile, addPlacement }: AppShellProps) {
  return (
    <div className="f-backdrop f-clip fixed inset-0 text-text">
      <div className="absolute inset-0 will-change-transform">
        <TabPager tabs={tabs} />
        <TopBar onProfile={onProfile} />
        <TabBar onAdd={onAdd} addPlacement={addPlacement} />
      </div>
      <StackHost screens={screens} />
      {sheetRegistry ? <SheetHost registry={sheetRegistry} /> : null}
    </div>
  );
}
