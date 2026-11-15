/* P8 ekran kaydı: Ayarlar yığını, alt sayfalar, profil düğmesi. */
import type { ScreenKayit } from "@/shell";
import { nav } from "@/shell";
import { GirisSayfasi } from "../auth/GirisSayfasi";
import { AyarlarEkrani } from "./AyarlarEkrani";
import { DonemFormu } from "./DonemFormu";
import { DonemlerEkrani } from "./DonemlerEkrani";
import { DuzenliEkrani } from "./DuzenliEkrani";
import { DuzenliFormu } from "./DuzenliFormu";
import { GorunumEkrani } from "./GorunumEkrani";
import { HakkindaEkrani } from "./HakkindaEkrani";
import { HesapEkrani } from "./HesapEkrani";
import { NovaProfiliEkrani } from "./NovaProfiliEkrani";
import { VerilerimEkrani } from "./VerilerimEkrani";

export const kayit: ScreenKayit = {
  screens: {
    ayarlar: AyarlarEkrani,
    donemler: DonemlerEkrani,
    "duzenli-odemeler": DuzenliEkrani,
    "nova-profili": NovaProfiliEkrani,
    gorunum: GorunumEkrani,
    hesap: HesapEkrani,
    verilerim: VerilerimEkrani,
    hakkinda: HakkindaEkrani,
  },
  sheets: {
    "donem-form": DonemFormu,
    "duzenli-form": DuzenliFormu,
    giris: GirisSayfasi,
  },
  onProfile: () => nav.push("ayarlar"),
};
