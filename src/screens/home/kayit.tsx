/* P5 ekran kaydı: Özet sekmesi ve ortak "donem-sec" alt sayfası. */
import type { ScreenKayit } from "@/shell";
import { DonemSecSayfasi } from "./DonemSecSayfasi";
import { OzetEkrani } from "./OzetEkrani";

export const kayit: ScreenKayit = {
  tabs: { ozet: OzetEkrani },
  sheets: { "donem-sec": DonemSecSayfasi },
};
