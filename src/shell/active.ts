import { createContext, useContext } from "react";

/** İçinde bulunulan sekme ya da ekran şu an önde mi. */
export const ActiveContext = createContext(true);

export function useScreenActive(): boolean {
  return useContext(ActiveContext);
}

/** Sekme kaydırıcının konumu (0..3, kesirli): alt kapsüldeki işaret parmağı izler. */
type Listener = (position: number) => void;
const listeners = new Set<Listener>();
export const pagerPosition = {
  emit(position: number): void {
    listeners.forEach((fn) => fn(position));
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
