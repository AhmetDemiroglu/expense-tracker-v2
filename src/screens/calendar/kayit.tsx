/* P5 ekran kaydı: Takvim sekmesi. */
import type { ScreenKayit } from "@/shell";
import { TakvimEkrani } from "./TakvimEkrani";

export const kayit: ScreenKayit = {
  tabs: { takvim: TakvimEkrani },
};
