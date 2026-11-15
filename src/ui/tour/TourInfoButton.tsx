import { Info } from "lucide-react";
import { tr } from "@/metin";
import { IconButton } from "../Button";
import { startTour, type TourStep } from "./store";

/** Info simgesi: turu elle açar ("bir kez gösterildi" kaydına bakmaz). */
export function TourInfoButton({ id, steps, className }: { id: string; steps: readonly TourStep[]; className?: string }) {
  return (
    <IconButton label={tr.ortak.tur.ipucu} className={className} onClick={() => startTour(id, steps)}>
      <Info size={20} aria-hidden="true" />
    </IconButton>
  );
}
