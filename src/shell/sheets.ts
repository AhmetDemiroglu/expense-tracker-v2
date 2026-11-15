/* Ortak alt sayfalar: bir paketin tanımladığını başka paket adıyla açar (ör. Takvim, "kayit-ekle" sayfasını açar). */
import { create } from "zustand";

export interface OpenSheet {
  id: number;
  name: string;
  params: Record<string, unknown>;
  open: boolean;
}

export const useSheets = create<{ current: OpenSheet | null }>(() => ({ current: null }));

let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export const sheets = {
  open(name: string, params: Record<string, unknown> = {}): void {
    if (timer) clearTimeout(timer);
    timer = null;
    useSheets.setState({ current: { id: ++seq, name, params, open: true } });
  },
  close(): void {
    const cur = useSheets.getState().current;
    if (!cur || !cur.open) return;
    useSheets.setState({ current: { ...cur, open: false } });
    /* Kapanış animasyonu bitince kaldırılır. */
    timer = setTimeout(() => {
      if (useSheets.getState().current?.id === cur.id) useSheets.setState({ current: null });
    }, 460);
  },
};
