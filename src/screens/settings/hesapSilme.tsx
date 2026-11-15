/* Hesap silme akışı: açık onay, e-posta kullanıcısında parola ile yeniden doğrulama (alt sayfa), P4'ün hesabiSil'i.
   Hesap ekranı ve Verilerim ekranı aynı akışı kullanır. */
import { useState, type ReactNode } from "react";
import { hataMesaji, useOturum } from "@/data";
import { tr } from "@/metin";
import { nav } from "@/shell";
import { Button, Field, Sheet, confirm, haptic, toast } from "@/ui";
import { iptalMi } from "../auth/hata";

export function useHesapSilme(): { baslat: () => Promise<void>; sayfa: ReactNode } {
  const t = tr.ayarlar.veriler;
  const k = useOturum((s) => s.kullanici);
  const mesgul = useOturum((s) => s.mesgul);
  const [acik, setAcik] = useState(false);
  const [parola, setParola] = useState("");
  const [hata, setHata] = useState<string | undefined>();
  const misafir = k?.misafir ?? true;

  async function sil(parolaDegeri?: string) {
    try {
      const r = await useOturum.getState().hesabiSil(parolaDegeri);
      haptic.success();
      setAcik(false);
      nav.popToRoot();
      toast(misafir ? t.misafirSilindi : r.uyari ? `${t.silindi(r.islem)} ${r.uyari}` : t.silindi(r.islem));
    } catch (e) {
      if (iptalMi(e)) return;
      if (parolaDegeri !== undefined) setHata(hataMesaji(e));
      else toast.error(hataMesaji(e));
    }
  }

  async function baslat() {
    const ok = await confirm({ title: misafir ? t.misafirOnayBaslik : t.onayBaslik, text: misafir ? t.misafirOnay : t.onay, confirmLabel: t.evetSil, danger: true });
    if (!ok) return;
    if (!misafir && k?.saglayici === "password") {
      setParola("");
      setHata(undefined);
      setAcik(true);
      return;
    }
    await sil();
  }

  const sayfa = (
    <Sheet
      open={acik}
      onClose={() => setAcik(false)}
      title={t.parolaBaslik}
      subtitle={t.parolaMetin}
      footer={
        <Button full size="lg" variant="danger" loading={mesgul === "silme"} onClick={() => void sil(parola)}>
          {t.evetSil}
        </Button>
      }
    >
      <div className="pb-2">
        <Field label={t.parola} type="password" value={parola} onChange={setParola} error={hata} autoFocus onSubmit={() => void sil(parola)} />
      </div>
    </Sheet>
  );

  return { baslat, sayfa };
}
