/* Onay kutusu, toast ve tur çizicisi. App ve Vitrin bir kez yerleştirir. */
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { tr } from "@/metin";
import { useBackLayer } from "./back";
import { Button } from "./Button";
import { cn } from "./cn";
import { haptic } from "./haptics";
import { resolveDialog, useOverlays } from "./overlays";
import { TourHost } from "./tour/TourHost";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  /** Düğmeler (alt satır). */
  actions: ReactNode;
  children?: ReactNode;
}

/** Ortada açılan kutu. Çoğu zaman confirm() yeter; özel içerik gerekiyorsa bu. */
export function Dialog({ open, onClose, title, text, actions, children }: DialogProps) {
  useBackLayer(open, () => {
    onClose();
    return true;
  });
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center px-6" style={{ zIndex: "var(--z-dialog)" }}>
      <div className="f-scrim f-fade" data-show="true" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="f-pop relative flex w-full max-w-sm flex-col gap-2 rounded-card border border-line bg-surface p-5 shadow-(--f-shadow-float)"
      >
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {text ? <p className="text-base text-text-2">{text}</p> : null}
        {children}
        <div className="mt-3 flex gap-3">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

function DialogHost() {
  const req = useOverlays((s) => s.dialogs[0]);
  if (!req) return null;
  const close = (ok: boolean) => resolveDialog(req.id, ok);
  return (
    <Dialog
      key={req.id}
      open
      onClose={() => close(req.kind === "inform")}
      title={req.title}
      text={req.text}
      actions={
        req.kind === "inform" ? (
          <Button full onClick={() => close(true)}>
            {req.confirmLabel ?? tr.ortak.tamam}
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => close(false)}>
              {req.cancelLabel ?? tr.ortak.vazgec}
            </Button>
            <Button
              variant={req.danger ? "danger" : "primary"}
              className="flex-1"
              onClick={() => {
                if (req.danger) haptic.warning();
                close(true);
              }}
            >
              {req.confirmLabel ?? tr.ortak.tamam}
            </Button>
          </>
        )
      }
    />
  );
}

function ToastHost() {
  const item = useOverlays((s) => s.toast);
  useEffect(() => {
    if (!item) return;
    const id = setTimeout(() => {
      if (useOverlays.getState().toast?.id === item.id) useOverlays.setState({ toast: null });
    }, item.duration);
    return () => clearTimeout(id);
  }, [item]);
  if (!item) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 flex justify-center px-4"
      style={{ zIndex: "var(--z-toast)", bottom: "calc(var(--content-bottom) + 12px + var(--kb-h))" }}
    >
      <div
        key={item.id}
        role={item.kind === "error" ? "alert" : "status"}
        className={cn("f-rise pointer-events-auto flex min-h-12 max-w-md items-center gap-3 rounded-pill bg-text px-5 py-2 text-bg shadow-(--f-shadow-float)")}
      >
        {item.kind === "error" ? <AlertCircle size={18} className="shrink-0" aria-hidden="true" /> : null}
        <span className="text-sm font-medium">{item.message}</span>
        {item.action ? (
          <button
            type="button"
            className="-mr-2 min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
            onClick={() => {
              item.action?.onClick();
              useOverlays.setState({ toast: null });
            }}
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function UiHost() {
  return (
    <>
      <DialogHost />
      <ToastHost />
      <TourHost />
    </>
  );
}
