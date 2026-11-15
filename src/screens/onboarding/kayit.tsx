/* P8 kapı kaydı: giriş, karşılama, ilk kurulum. */
import { useOturum, useVeri } from "@/data";
import type { ScreenKayit } from "@/shell";
import { GirisKapisi } from "./GirisKapisi";
import { IlkKurulumEkrani } from "./IlkKurulum";

/* Açılış animasyonu oturum ve veri açılışını bekler (en çok 2,5 sn). */
function acilisHazir(): Promise<void> {
  useOturum.getState().baslat();
  return new Promise((coz) => {
    const bitti = (): boolean => {
      const o = useOturum.getState().durum;
      if (o === "baslatiliyor") return false;
      if (o === "girissiz") return true;
      const v = useVeri.getState().durum;
      return v === "hazir" || v === "hata";
    };
    if (bitti()) return coz();
    const birak: (() => void)[] = [];
    const kontrol = () => {
      if (!bitti()) return;
      birak.forEach((f) => f());
      coz();
    };
    birak.push(useOturum.subscribe(kontrol), useVeri.subscribe(kontrol));
  });
}

export const kayit: ScreenKayit = {
  gate: GirisKapisi,
  ready: acilisHazir,
  screens: { "ilk-kurulum": IlkKurulumEkrani },
};
