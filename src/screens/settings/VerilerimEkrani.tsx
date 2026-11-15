/* Verilerim: CSV dışa aktar, hesabı sil (yeniden doğrulama + açık onay + P4 akışı), misafirde cihazdaki veriyi sil. */
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { hataMesaji, useBugun, useEtkinIslemler, useOturum } from "@/data";
import { tr } from "@/metin";
import { Screen, nav } from "@/shell";
import { Button, Field, Section, Sheet, confirm, haptic, toast } from "@/ui";
import { islemleriDisaAktar } from "@/services/disaAktar";
import { iptalMi } from "../auth/hata";

export function VerilerimEkrani() {
  const t = tr.ayarlar.veriler;
  const k = useOturum((s) => s.kullanici);
  const mesgul = useOturum((s) => s.mesgul);
  const islemler = useEtkinIslemler();
  const bugun = useBugun();
  const [aktariyor, setAktariyor] = useState(false);
  const [parolaAcik, setParolaAcik] = useState(false);
  const [parola, setParola] = useState("");
  const [parolaHata, setParolaHata] = useState<string | undefined>();

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

  async function silmeyiBaslat() {
    const ok = await confirm({
      title: misafir ? t.misafirOnayBaslik : t.onayBaslik,
      text: misafir ? t.misafirOnay : t.onay,
      confirmLabel: t.evetSil,
      danger: true,
    });
    if (!ok) return;
    if (!misafir && k?.saglayici === "password") {
      setParola("");
      setParolaHata(undefined);
      setParolaAcik(true);
      return;
    }
    await sil();
  }

  async function sil(parolaDegeri?: string) {
    try {
      const r = await useOturum.getState().hesabiSil(parolaDegeri);
      haptic.success();
      setParolaAcik(false);
      nav.popToRoot();
      toast(misafir ? t.misafirSilindi : t.silindi(r.islem));
    } catch (e) {
      if (iptalMi(e)) return;
      if (parolaAcik) setParolaHata(hataMesaji(e));
      else toast.error(hataMesaji(e));
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
          <Button variant="danger" icon={<Trash2 size={18} aria-hidden="true" />} loading={mesgul === "silme"} disabled={mesgul !== null} onClick={() => void silmeyiBaslat()}>
            {misafir ? t.misafirSil : t.sil}
          </Button>
        </div>
      </Section>
      <Sheet
        open={parolaAcik}
        onClose={() => setParolaAcik(false)}
        title={t.parolaBaslik}
        subtitle={t.parolaMetin}
        footer={
          <Button full size="lg" variant="danger" loading={mesgul === "silme"} onClick={() => void sil(parola)}>
            {t.evetSil}
          </Button>
        }
      >
        <div className="pb-2">
          <Field label={t.parola} type="password" value={parola} onChange={setParola} error={parolaHata} autoFocus onSubmit={() => void sil(parola)} />
        </div>
      </Sheet>
    </Screen>
  );
}
