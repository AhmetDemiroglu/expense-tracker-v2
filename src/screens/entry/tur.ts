/* İlk kayıt turu adımları (P10 bağlar, kimlik "ilk-kayit"). Hedefler: data-tour. */
import { tr } from "@/metin";
import type { TourStep } from "@/ui";

const t = tr.kayitlar;
export const ILK_KAYIT_TURU: TourStep[] = [
  { target: "kayit-hizli", title: t.turAdimlari.hizli.baslik, text: t.turAdimlari.hizli.metin },
  { target: "kayit-tutar", title: t.turAdimlari.tutar.baslik, text: t.turAdimlari.tutar.metin },
  { target: "kayit-kategori", title: t.turAdimlari.kategori.baslik, text: t.turAdimlari.kategori.metin },
  { target: "kayit-fis", title: t.turAdimlari.fis.baslik, text: t.turAdimlari.fis.metin },
  { target: "kayit-kaydet", title: t.turAdimlari.kaydet.baslik, text: t.turAdimlari.kaydet.metin },
];
