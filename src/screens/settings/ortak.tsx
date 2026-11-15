/* Ayarlar ekranlarının ortak parçaları. */
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/ui";

/** Tek seçimli satır: başlık, alt metin, seçiliyse onay işareti. Gerçek radio. */
export function SecimSatiri({ ad, baslik, alt, secili, onSec, icon }: { ad: string; baslik: string; alt?: string; secili: boolean; onSec: () => void; icon?: ReactNode }) {
  return (
    <label className="pressable flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">
      <input type="radio" name={ad} className="sr-only" checked={secili} onChange={onSec} />
      {icon ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-2 text-text-2">{icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium text-text">{baslik}</span>
        {alt ? <span className="text-sm text-text-3">{alt}</span> : null}
      </span>
      <span aria-hidden="true" className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", secili ? "border-accent bg-accent text-on-accent" : "border-text-3")}>
        {secili ? <Check size={14} strokeWidth={3} /> : null}
      </span>
    </label>
  );
}

export function Ayirac() {
  return <div className="mx-3 h-px bg-line" aria-hidden="true" />;
}
