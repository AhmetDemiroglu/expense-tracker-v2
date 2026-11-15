/* Girişten sonra: "Bu cihazdaki kayıtları hesabına aktar". Kapıdaki tam ekran adım. */
import { useState } from "react";
import { useOturum, type MisafirOzeti } from "@/data";
import { tr } from "@/metin";
import { Button, Card, NovaSahne, haptic, toast } from "@/ui";
import { hataGoster } from "./hata";
import { TamEkran } from "./TamEkran";

export function AktarimOnerisi({ ozet, bitti }: { ozet: MisafirOzeti; bitti: () => void }) {
  const t = tr.giris.aktarim;
  const [mesgul, setMesgul] = useState(false);

  async function evet() {
    setMesgul(true);
    try {
      const r = await useOturum.getState().misafirdenAktar(ozet.guestId);
      haptic.success();
      toast(t.sonuc(r.eklenen.islem));
      if (r.atlanan > 0) toast(t.atlanan(r.atlanan));
      bitti();
    } catch (e) {
      hataGoster(e);
      setMesgul(false);
    }
  }

  function hayir() {
    useOturum.getState().misafirAktariminiReddet(ozet.guestId);
    bitti();
  }

  return (
    <TamEkran>
      <NovaSahne mood="selam" size={120} title={t.baslik} text={t.metin(ozet.islem, ozet.donem, ozet.duzenli)} />
      <Card variant="solid" className="flex flex-col gap-2">
        <Button size="lg" full loading={mesgul} onClick={() => void evet()}>
          {t.evet}
        </Button>
        <Button size="lg" full variant="secondary" disabled={mesgul} onClick={hayir}>
          {t.hayir}
        </Button>
      </Card>
    </TamEkran>
  );
}
