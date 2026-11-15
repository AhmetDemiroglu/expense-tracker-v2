// Veri katmanı: store'lar, seçiciler, hata türü. Sözleşme: kaynaklar/havuz/SOZLESMELER.md > Veri katmanı.

export { UygulamaHatasi, hataMesaji, hataMi, type HataKodu } from "./hatalar";
export { useOturum, girisSecenekleri } from "./oturum";
export type { Kullanici, OturumDurumu, Mesgul, SilmeSonucu, AktarimSonucu, MisafirOzeti } from "./oturum";
export { useVeri } from "./veri";
export type { VeriDurumu, YeniIslem, DonemGirdisi, DuzenliGirdisi, AyarYamasi } from "./veri";
export type { AyarDurumu, BozukKayit } from "./depo/tipler";
export {
  useBugun,
  useAktifDonem,
  useButce,
  useOzet,
  useHafta,
  useAy,
  useGun,
  useTakvimAcilisi,
  useKategoriDagilimi,
  useEtkinIslemler,
  useDonemOzetleri,
} from "./turetilmis";
export { useTercihler, type NovaMod, type NovaStil } from "./tercihler";
export { useBaglanti } from "./baglanti";
export { useSohbet, type SohbetMesaji, type SohbetAyari } from "./sohbet";
