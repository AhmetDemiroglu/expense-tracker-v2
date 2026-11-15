/* Giriş ekranı (kapı). Ekran boyuna göre dengeli üç bölge: üstte sloganlı logo, ortada giriş düğmeleri, en altta imza.
   Bölgeler arasındaki boşluk esner: kısa ekranda sıkışır, uzun ekranda açılır. Çok kısa ekranda sayfa kayar.
   Tam ekran karşılama olduğu için içerik zeminin üstünde durur (yerleşim kuralının istisnası). */
import { useMemo } from "react";
import { Play } from "lucide-react";
import { Logo, SeptimusImza } from "@/brand";
import { useOturum } from "@/data";
import { tr } from "@/metin";
import { Button, toast } from "@/ui";
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
    <TamEkran scroll="fit" className="gap-0">
      {/* ÜST: logo. Bölge esner (3 pay), logo boyu ekran yüksekliğine göre 96-184 px. */}
      <div className="flex min-h-32 flex-[3_1_0%] items-center justify-center py-4">
        <div style={{ height: "clamp(96px, 22dvh, 184px)" }}>
          <Logo variant="vertical-slogan" height={184} className="h-full! w-auto!" />
        </div>
      </div>

      {/* ORTA: başlık ve giriş düğmeleri. Büzülmez. */}
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold text-text">{t.baslik}</h1>
          <p className="text-sm text-text-2">{t.alt}</p>
        </div>
        <GirisSecenekleri />
        <div className="flex flex-col items-center gap-1">
          {devam ? (
            <>
              <Button full variant="secondary" icon={<Play size={18} aria-hidden="true" />} disabled={mesgul !== null} onClick={() => misafirDevamEt(devam.guestId)}>
                {t.devam}
              </Button>
              <p className="text-center text-xs text-text-3">{t.devamAlt(devam.islem)}</p>
            </>
          ) : null}
          <Button variant="text" size="sm" disabled={mesgul !== null} onClick={() => void hesapsiz()}>
            {t.hesapsiz}
          </Button>
          <p className="text-center text-xs text-text-3">{t.hesapsizAlt}</p>
        </div>
      </div>

      {/* ALT: imza, güvenli alanın üstünde. Bölge esner (2 pay). */}
      <div className="flex min-h-14 flex-[2_1_0%] items-end justify-center pt-4">
        <SeptimusImza size={18} />
      </div>
    </TamEkran>
  );
}
