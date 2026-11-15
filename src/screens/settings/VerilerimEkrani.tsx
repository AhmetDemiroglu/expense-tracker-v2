/* Verilerim: CSV dışa aktar, hesabı sil (yeniden doğrulama + açık onay + P4 akışı), misafirde cihazdaki veriyi sil. */
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { hataMesaji, useBugun, useEtkinIslemler, useOturum } from "@/data";
import { tr } from "@/metin";
import { Screen } from "@/shell";
import { Button, Section, toast } from "@/ui";
import { islemleriDisaAktar } from "@/services/disaAktar";
import { iptalMi } from "../auth/hata";
import { useHesapSilme } from "./hesapSilme";

export function VerilerimEkrani() {
  const t = tr.ayarlar.veriler;
  const k = useOturum((s) => s.kullanici);
  const mesgul = useOturum((s) => s.mesgul);
  const islemler = useEtkinIslemler();
  const bugun = useBugun();
  const [aktariyor, setAktariyor] = useState(false);
  const silme = useHesapSilme();

  if (!k) return null;
  const misafir = k.misafir;

  async function disaAktar() {
    if (islemler.length === 0) {
      toast(t.kayitYok);
      return;
    }
    setAktariyor(true);
    try {
      const s = await islemleriDisaAktar(islemler, bugun);
      if (s === "paylasildi") toast(t.paylasildi);
      else if (s === "indirildi") toast(t.indirildi);
    } catch (e) {
      if (!iptalMi(e)) toast.error(hataMesaji(e));
    } finally {
      setAktariyor(false);
    }
  }

  return (
    <Screen title={t.baslik}>
      <Section title={t.disaAktarBaslik} variant="solid">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-2">{t.disaAktarMetin}</p>
          <Button variant="secondary" icon={<Download size={18} aria-hidden="true" />} loading={aktariyor} onClick={() => void disaAktar()}>
            {t.disaAktar}
          </Button>
        </div>
      </Section>
      <Section title={misafir ? t.misafirSilBaslik : t.silBaslik} variant="solid">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-2">{misafir ? t.misafirSilMetin : t.silMetin}</p>
          <Button variant="danger" icon={<Trash2 size={18} aria-hidden="true" />} loading={mesgul === "silme"} disabled={mesgul !== null} onClick={() => void silme.baslat()}>
            {misafir ? t.misafirSil : t.sil}
          </Button>
        </div>
      </Section>
      {silme.sayfa}
    </Screen>
  );
}
