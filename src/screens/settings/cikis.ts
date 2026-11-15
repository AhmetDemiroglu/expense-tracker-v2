/* Çıkış: onay sorar, oturumu kapatır, kabuğu köke döndürür. Ayarlar alt bilgisinden çağrılır. */
import { hataMesaji, useOturum } from "@/data";
import { tr } from "@/metin";
import { nav } from "@/shell";
import { confirm, toast } from "@/ui";

export async function cikisYap(misafir: boolean): Promise<void> {
  const t = tr.ayarlar.hesap;
  const ok = await confirm({ title: t.cikisOnayBaslik, text: misafir ? t.misafirCikisOnay : t.cikisOnay, confirmLabel: t.cikis, danger: true });
  if (!ok) return;
  try {
    await useOturum.getState().cikis();
    nav.popToRoot();
  } catch (e) {
    toast.error(`${t.cikisHata}: ${hataMesaji(e)}`);
  }
}
