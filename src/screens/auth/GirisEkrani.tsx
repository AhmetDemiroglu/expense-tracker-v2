/* Giriş ekranı (kapı): sloganlı logo, giriş seçenekleri, "Kaldığın yerden devam et", "Hesapsız dene". */
import { useMemo } from "react";
import { Play, UserRound } from "lucide-react";
import { Logo, SeptimusImza } from "@/brand";
import { useOturum } from "@/data";
import { tr } from "@/metin";
import { Button, Card, toast } from "@/ui";
import { GirisSecenekleri } from "./GirisSecenekleri";
import { devamEdilebilirMisafir, misafirDevamEt } from "./misafirDevam";
import { hataGoster } from "./hata";
import { TamEkran } from "./TamEkran";

export function GirisEkrani() {
  const t = tr.giris.giris;
  const mesgul = useOturum((s) => s.mesgul);
  const devam = useMemo(() => devamEdilebilirMisafir(), []);

  async function hesapsiz() {
    try {
      await useOturum.getState().misafirBasla();
    } catch (e) {
      hataGoster(e);
      toast.error(tr.ortak.hata.genel);
    }
  }

  return (
    <TamEkran>
      <Card className="flex flex-col gap-3">
        <div className="flex justify-center py-1">
          <Logo variant="vertical-slogan" height={120} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">{t.baslik}</h1>
          <p className="text-sm text-text-2">{t.alt}</p>
        </div>
        <GirisSecenekleri />
      </Card>
      <Card variant="solid" className="flex flex-col gap-2">
        {devam ? (
          <Button size="lg" full variant="secondary" icon={<Play size={20} aria-hidden="true" />} disabled={mesgul !== null} onClick={() => misafirDevamEt(devam.guestId)}>
            {t.devam}
          </Button>
        ) : null}
        {devam ? <p className="text-center text-sm text-text-3">{t.devamAlt(devam.islem)}</p> : null}
        <Button size="lg" full variant="text" icon={<UserRound size={20} aria-hidden="true" />} disabled={mesgul !== null} onClick={() => void hesapsiz()}>
          {t.hesapsiz}
        </Button>
        <p className="text-center text-sm text-text-3">{t.hesapsizAlt}</p>
      </Card>
      <div className="flex justify-center pt-1">
        <SeptimusImza size={18} />
      </div>
    </TamEkran>
  );
}
