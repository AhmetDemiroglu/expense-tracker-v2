/* Fiş okuma akışı: kaynak seçimi (kamera ya da dosya), okuma sırasında Nova analiz ve iptal, sonuç forma dolar.
   Fiş görseli saklanmaz: okuma biter bitmez referans bırakılır. */
import { useRef, useState } from "react";
import { Camera, FileUp, ScanLine } from "lucide-react";
import { formatAmountInput, type LocalDate } from "@/core";
import { UygulamaHatasi, hataMesaji } from "@/data";
import { tr } from "@/metin";
import { nav } from "@/shell";
import { ai, aiKullanilabilir } from "@/services/ai";
import { fisCek, galeridenSec } from "@/services/kamera";
import { Button, Card, ListRow, NovaAvatar, NovaSahne, Sheet, confirm, haptic, type NovaMood } from "@/ui";
import { fisiFormaCevir, type FisFormu } from "./girdi";

type Durum = { tur: "bos" } | { tur: "okunuyor" } | { tur: "tamam"; f: FisFormu } | { tur: "fisDegil" } | { tur: "hata"; mesaj: string; mood: NovaMood; tekrar: boolean };

interface Props {
  bugun: LocalDate;
  onSonuc: (f: FisFormu) => void;
  /** Alt sayfayı kapatır (giriş önerisinde Ayarlar'a geçmeden önce). */
  kapat: () => void;
}

export function FisBolumu({ bugun, onSonuc, kapat }: Props) {
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });
  const [kaynakAcik, setKaynakAcik] = useState(false);
  const jeton = useRef(0);
  const sonKaynak = useRef<"kamera" | "dosya">("kamera");

  const baslat = async () => {
    if (!aiKullanilabilir()) {
      const git = await confirm({ title: tr.kayitlar.fis.misafir.baslik, text: tr.kayitlar.fis.misafir.metin, confirmLabel: tr.kayitlar.fis.misafir.git, cancelLabel: tr.kayitlar.fis.misafir.kapat });
      if (git) {
        kapat();
        nav.push("ayarlar");
      }
      return;
    }
    setKaynakAcik(true);
  };

  const oku = async (kaynak: "kamera" | "dosya") => {
    sonKaynak.current = kaynak;
    setKaynakAcik(false);
    const benim = ++jeton.current;
    setDurum({ tur: "okunuyor" });
    try {
      const dosya = kaynak === "kamera" ? await fisCek() : await galeridenSec();
      if (benim !== jeton.current) return;
      if (!dosya) {
        setDurum({ tur: "bos" });
        return;
      }
      const sonuc = await ai.fisOku(dosya);
      if (benim !== jeton.current) return;
      if (!sonuc.fisMi) {
        setDurum({ tur: "fisDegil" });
        haptic.warning();
        return;
      }
      const f = fisiFormaCevir(sonuc, bugun, formatAmountInput);
      onSonuc(f);
      haptic.success();
      setDurum({ tur: "tamam", f });
    } catch (e) {
      if (benim !== jeton.current) return;
      if (e instanceof UygulamaHatasi && e.kod === "IPTAL") {
        setDurum({ tur: "bos" });
        return;
      }
      haptic.error();
      const kota = e instanceof UygulamaHatasi && e.kod === "QUOTA_EXCEEDED";
      const tekrar = e instanceof UygulamaHatasi ? e.tekrarDenenebilir : false;
      setDurum({ tur: "hata", mesaj: hataMesaji(e), mood: kota ? "uyari" : "uzgun", tekrar });
    }
  };

  const iptal = () => {
    jeton.current += 1;
    setDurum({ tur: "bos" });
  };

  return (
    <div data-tour="kayit-fis" className="flex flex-col gap-2">
      {durum.tur === "okunuyor" ? (
        <NovaSahne
          surface="solid"
          mood="analiz"
          size={72}
          title={tr.kayitlar.fis.okunuyor}
          text={tr.kayitlar.fis.okunuyorMetin}
          action={
            <Button variant="secondary" size="sm" onClick={iptal}>
              {tr.kayitlar.fis.iptal}
            </Button>
          }
        />
      ) : durum.tur === "hata" ? (
        <NovaSahne
          surface="solid"
          mood={durum.mood}
          size={72}
          title={tr.kayitlar.fis.hata.baslik}
          text={durum.mesaj}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {durum.tekrar ? (
                <Button size="sm" onClick={() => void oku(sonKaynak.current)}>
                  {tr.kayitlar.fis.hata.yeniden}
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={() => setDurum({ tur: "bos" })}>
                {tr.kayitlar.fis.hata.elle}
              </Button>
            </div>
          }
        />
      ) : durum.tur === "fisDegil" ? (
        <NovaSahne
          surface="solid"
          mood="saskin"
          size={72}
          title={tr.kayitlar.fis.fisDegil.baslik}
          text={tr.kayitlar.fis.fisDegil.metin}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setKaynakAcik(true)}>
                {tr.kayitlar.fis.dugme}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDurum({ tur: "bos" })}>
                {tr.kayitlar.fis.hata.elle}
              </Button>
            </div>
          }
        />
      ) : durum.tur === "tamam" ? (
        <Card variant="solid" pad="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <NovaAvatar mood={durum.f.dusukGuven ? "uyari" : "basari"} size={44} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold text-text">{tr.kayitlar.fis.tamam}</span>
              <span className="text-sm text-text-2">{tr.kayitlar.fis.tamamMetin}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setKaynakAcik(true)}>
              {tr.ortak.yenile}
            </Button>
          </div>
          {durum.f.tarihOkunamadi ? <p className="text-sm font-medium text-warn">{tr.kayitlar.fis.tarihYok}</p> : null}
          {durum.f.tutarOkunamadi ? <p className="text-sm font-medium text-warn">{tr.kayitlar.fis.tutarYok}</p> : null}
          {durum.f.dusukGuven ? <p className="text-sm font-medium text-warn">{tr.kayitlar.fis.dusukGuven}</p> : null}
        </Card>
      ) : (
        <Button variant="secondary" full icon={<ScanLine size={20} aria-hidden="true" />} onClick={() => void baslat()}>
          {tr.kayitlar.fis.dugme}
        </Button>
      )}
      <Sheet open={kaynakAcik} onClose={() => setKaynakAcik(false)} title={tr.kayitlar.fis.kaynakBaslik}>
        <div className="flex flex-col pb-2">
          <ListRow icon={<Camera size={22} aria-hidden="true" />} title={tr.kayitlar.fis.kamera} onClick={() => void oku("kamera")} chevron />
          <ListRow icon={<FileUp size={22} aria-hidden="true" />} title={tr.kayitlar.fis.dosya} subtitle={tr.kayitlar.fis.dosyaAlt} onClick={() => void oku("dosya")} chevron />
        </div>
      </Sheet>
    </div>
  );
}
