/* Kayıtlar sekmesi ipucu adımları (P10 bağlar, kimlik "kayitlar"; info simgesi elle açar). */
import { tr } from "@/metin";
import type { TourStep } from "@/ui";

const t = tr.kayitlar.tur;
export const KAYITLAR_TURU: TourStep[] = [
  { target: "kayit-seridi", title: t.seritAdim.baslik, text: t.seritAdim.metin, padding: 6 },
  { target: "kayit-suzgec", title: t.suzgecAdim.baslik, text: t.suzgecAdim.metin, padding: 6 },
  { target: "kayit-liste", title: t.listeAdim.baslik, text: t.listeAdim.metin, padding: 4 },
];
