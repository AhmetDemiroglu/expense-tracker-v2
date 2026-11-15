/* Kayıt silme akışı: onay, silme, geri al toast'ı. Liste ve Takvim aynı yolu kullanır. */
import type { Transaction } from "@/core";
import { hataMesaji, useVeri } from "@/data";
import { tr } from "@/metin";
import { sheets } from "@/shell";
import { confirm, haptic, toast } from "@/ui";

/** Silinenleri geri yazar (aynı kimliklerle). */
async function geriAl(silinen: Transaction[]): Promise<void> {
  try {
    await useVeri.getState().islemleriEkle(silinen);
    haptic.light();
  } catch (e) {
    toast.error(hataMesaji(e));
  }
}

export async function kayitlariSil(silinecek: Transaction[], mesaj: string): Promise<boolean> {
  if (silinecek.length === 0) return false;
  try {
    await useVeri.getState().islemleriSil(silinecek.map((t) => t.id));
  } catch (e) {
    toast.error(hataMesaji(e) || tr.kayitlar.silinemedi);
    return false;
  }
  haptic.warning();
  toast({ message: mesaj, action: { label: tr.ortak.geriAl, onClick: () => void geriAl(silinecek) } });
  return true;
}

/** Tek kayıt: taksitliyse seçim sayfası, değilse onay penceresi. */
export async function silmeyiBaslat(id: string): Promise<void> {
  const t = useVeri.getState().islemler.find((x) => x.id === id);
  if (!t) return;
  if (t.installmentGroupId) {
    sheets.open("kayit-sil", { id });
    return;
  }
  const evet = await confirm({ title: tr.kayitlar.silOnay.baslik, text: tr.kayitlar.silOnay.metin, confirmLabel: tr.ortak.sil, cancelLabel: tr.ortak.vazgec, danger: true });
  if (evet) await kayitlariSil([t], tr.kayitlar.silindi);
}
