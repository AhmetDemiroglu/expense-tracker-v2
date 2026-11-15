/* P8 ekran kaydı: Ayarlar yığını, alt sayfalar, profil düğmesi. */
import type { ScreenKayit } from "@/shell";
import { nav } from "@/shell";
import { GirisSayfasi } from "../auth/GirisSayfasi";
import { tembel } from "../tembel";

const AyarlarEkrani = tembel(() => import("./AyarlarEkrani").then((m) => ({ default: m.AyarlarEkrani })));
const DonemFormu = tembel(() => import("./DonemFormu").then((m) => ({ default: m.DonemFormu })));
const DonemlerEkrani = tembel(() => import("./DonemlerEkrani").then((m) => ({ default: m.DonemlerEkrani })));
const DuzenliEkrani = tembel(() => import("./DuzenliEkrani").then((m) => ({ default: m.DuzenliEkrani })));
const DuzenliFormu = tembel(() => import("./DuzenliFormu").then((m) => ({ default: m.DuzenliFormu })));
const GorunumEkrani = tembel(() => import("./GorunumEkrani").then((m) => ({ default: m.GorunumEkrani })));
const HakkindaEkrani = tembel(() => import("./HakkindaEkrani").then((m) => ({ default: m.HakkindaEkrani })));
const HesapEkrani = tembel(() => import("./HesapEkrani").then((m) => ({ default: m.HesapEkrani })));
const NovaProfiliEkrani = tembel(() => import("./NovaProfiliEkrani").then((m) => ({ default: m.NovaProfiliEkrani })));
const VerilerimEkrani = tembel(() => import("./VerilerimEkrani").then((m) => ({ default: m.VerilerimEkrani })));

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
