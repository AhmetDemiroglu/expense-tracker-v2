import { create } from "zustand";
import { initialNav, pop, popToRoot, push, replace, setTab, type NavState, type TabKey } from "./stack";

export const useNav = create<NavState>(() => initialNav);

/** Gezinme komutları. Her yerden çağrılır (bileşen dışı dahil). */
export const nav = {
  push: (name: string, params?: Record<string, unknown>) => useNav.setState((s) => push(s, name, params)),
  pop: () => useNav.setState(pop),
  replace: (name: string, params?: Record<string, unknown>) => useNav.setState((s) => replace(s, name, params)),
  popToRoot: () => useNav.setState(popToRoot),
  setTab: (tab: TabKey) => useNav.setState((s) => setTab(s, tab)),
};
