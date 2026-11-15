/* Kabuk ve gezinme: dışa açılan API. Ekran paketleri yalnız buradan import eder. */
export { AppShell, type AppShellProps } from "./AppShell";
export { TabPage, type TabPageProps } from "./TabPage";
export { Screen, type ScreenProps as ScreenLayoutProps } from "./Screen";
export { TabBar, TopBar } from "./bars";
export { TabPager } from "./TabPager";
export { nav, useNav } from "./router/nav";
export { TABS, type TabKey, type StackEntry, type NavState } from "./router/stack";
export { sheets, useSheets } from "./sheets";
export { useScreenActive } from "./active";
export { buildRegistry, type ScreenKayit, type TabProps, type ScreenProps, type SheetScreenProps, type Registry } from "./registry";
export { initBackButton } from "./backButton";
export { goBack, useBackHandler } from "@/ui/back";
