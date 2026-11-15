/* Kabuğu saran kapı: açılış kararı. Karar mantığı kapi.ts içinde (saf, testli). */
import { useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { useOturum, useVeri } from "@/data";
import { tr } from "@/metin";
import { Button, EmptyState, Skeleton, toast } from "@/ui";
import { AktarimOnerisi } from "../auth/AktarimOnerisi";
import { GirisEkrani } from "../auth/GirisEkrani";
import { TamEkran } from "../auth/TamEkran";
import { IlkKurulumKapisi } from "./IlkKurulum";
import { kapiAdimi } from "./kapi";
import { useOnay } from "./onay";
import { OnayEkrani } from "./OnayEkrani";

/* GEÇİCİ (ISTEKLER): kabukta kimse çağırmıyor. baslat() tekrar çağrıda zararsız. */
function useKabukBaglantilari() {
  useEffect(() => {
    useOturum.getState().baslat();
  }, []);
  const hata = useVeri((s) => s.sonYazimHatasi);
  useEffect(() => {
    if (!hata) return;
    toast.error(hata.mesaj);
    useVeri.getState().yazimHatasiniTemizle();
  }, [hata]);
}

export function GirisKapisi({ children }: { children: ReactNode }) {
  useKabukBaglantilari();
  const oturum = useOturum((s) => s.durum);
  const uid = useOturum((s) => s.kullanici?.uid ?? null);
  const veri = useVeri((s) => s.durum);
  const ayar = useVeri((s) => s.ayarDurumu);
  const onayTamam = useOnay((s) => s.tamam);
  const [kabukUid, setKabukUid] = useState<string | null>(null);
  const [aktarimKapali, setAktarimKapali] = useState<string | null>(null);
  const [yenilemeSayisi, setYenilemeSayisi] = useState(0);

  /* Aktarım önerisi tepki vermez (P4): geçişte ve veri hazır olunca bir kez değerlendirilir. */
  const hazir = oturum === "hesap" && veri === "hazir" && ayar !== "bilinmiyor";
  const ozet = hazir && uid !== aktarimKapali ? useOturum.getState().aktarilabilirMisafir() : null;

  const kabukAcildi = kabukUid !== null && kabukUid === uid;
  const adim = kapiAdimi({ oturum, veri, ayar, onayTamam, aktarimBekliyor: ozet !== null, kabukAcildi });

  /* Render sırasında eşitlenir (efekt değil): kabuk açıldı bilgisi bir sonraki çizimde hazır. */
  if (adim === "kabuk" && uid && kabukUid !== uid) setKabukUid(uid);
  if ((adim === "giris" || adim === "onay") && kabukUid !== null) setKabukUid(null);

  switch (adim) {
    case "bekle":
      return <TamEkran scroll={false}>{null}</TamEkran>;
    case "onay":
      return <OnayEkrani />;
    case "giris":
      return <GirisEkrani />;
    case "veri-yukleniyor":
      return (
        <TamEkran scroll={false}>
          <div className="flex flex-1 flex-col justify-center gap-3" role="status" aria-label={tr.giris.yukleniyor}>
            <Skeleton h={120} radius={20} />
            <Skeleton h={72} radius={20} />
            <Skeleton h={72} radius={20} />
          </div>
        </TamEkran>
      );
    case "veri-hata":
      return (
        <TamEkran>
          <div className="my-auto flex flex-col gap-3">
            <EmptyState
              mood="uzgun"
              title={tr.giris.yuklemeHatasi.baslik}
              text={useVeri.getState().hata?.mesaj ?? tr.ortak.hata.genel}
              action={
                <div className="flex flex-col gap-2">
                  <Button
                    full
                    onClick={() => {
                      setYenilemeSayisi((n) => n + 1);
                      void useVeri.getState().yenile();
                    }}
                  >
                    {tr.giris.yuklemeHatasi.tekrar}
                  </Button>
                  <Button full variant="secondary" onClick={() => void useOturum.getState().cikis()}>
                    {tr.giris.yuklemeHatasi.cikis}
                  </Button>
                </div>
              }
            />
            <span className="sr-only">{yenilemeSayisi}</span>
          </div>
        </TamEkran>
      );
    case "baglanti":
      return (
        <TamEkran>
          <div className="my-auto flex flex-col gap-3">
            <EmptyState
              mood="uyku"
              title={tr.giris.bekleniyor.baslik}
              text={tr.giris.bekleniyor.metin}
              action={
                <Button full icon={<WifiOff size={18} aria-hidden="true" />} onClick={() => void useVeri.getState().yenile()}>
                  {tr.giris.bekleniyor.tekrar}
                </Button>
              }
            />
          </div>
        </TamEkran>
      );
    case "aktarim":
      return ozet ? <AktarimOnerisi ozet={ozet} bitti={() => setAktarimKapali(uid)} /> : null;
    case "kurulum":
      return <IlkKurulumKapisi />;
    case "kabuk":
      return <>{children}</>;
  }
}
