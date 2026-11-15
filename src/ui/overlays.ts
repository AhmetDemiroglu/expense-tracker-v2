/* Onay ve toast: her yerden çağrılır, UiHost çizer. Native alert / confirm YASAK. */
import { create } from "zustand";

export interface DialogRequest {
  id: number;
  kind: "confirm" | "inform";
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export interface ToastItem {
  id: number;
  message: string;
  kind: "info" | "error";
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface OverlayState {
  dialogs: DialogRequest[];
  toast: ToastItem | null;
}

export const useOverlays = create<OverlayState>(() => ({ dialogs: [], toast: null }));

let seq = 0;

function ask(kind: DialogRequest["kind"], opts: Omit<DialogRequest, "id" | "kind" | "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    const id = ++seq;
    useOverlays.setState((s) => ({ dialogs: [...s.dialogs, { ...opts, id, kind, resolve }] }));
  });
}

/** Onay sorar. true: onaylandı. Geri tuşu ve perdeye dokunma vazgeçer. */
export function confirm(opts: { title: string; text?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }): Promise<boolean> {
  return ask("confirm", opts);
}

/** Tek düğmeli bilgi kutusu. */
export function inform(opts: { title: string; text?: string; okLabel?: string }): Promise<void> {
  return ask("inform", { title: opts.title, text: opts.text, confirmLabel: opts.okLabel }).then(() => undefined);
}

export function resolveDialog(id: number, ok: boolean): void {
  const req = useOverlays.getState().dialogs.find((d) => d.id === id);
  if (!req) return;
  useOverlays.setState((s) => ({ dialogs: s.dialogs.filter((d) => d.id !== id) }));
  req.resolve(ok);
}

type ToastInput = string | { message: string; action?: { label: string; onClick: () => void }; duration?: number };

function show(input: ToastInput, kind: ToastItem["kind"]): void {
  const o = typeof input === "string" ? { message: input } : input;
  useOverlays.setState({ toast: { id: ++seq, kind, message: o.message, action: o.action, duration: o.duration ?? (o.action ? 5000 : 2600) } });
}

/** Kısa bildirim. toast("Kaydedildi"), toast.error("Bağlantı yok"), toast({ message, action: { label: "Geri al", onClick } }). */
export const toast = Object.assign((input: ToastInput) => show(input, "info"), {
  error: (input: ToastInput) => show(input, "error"),
  dismiss: () => useOverlays.setState({ toast: null }),
});
