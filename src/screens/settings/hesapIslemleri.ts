/* GEÇİCİ (P4 sağlayınca silinir, ISTEKLER satırı): ad güncelleme, parola değiştirme ve oluşturma.
   firebase/auth doğrudan burada; ekranlar yalnız bu üç fonksiyonu çağırır. */
import { EmailAuthProvider, linkWithCredential, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { UygulamaHatasi, useOturum } from "@/data";
import { aktifKullanici, girisHatasinaCevir } from "@/services/auth";

function kullanici() {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  return u;
}

async function yenile(): Promise<void> {
  await useOturum.getState().epostaDurumunuYenile();
}

export async function adGuncelle(ad: string): Promise<void> {
  try {
    await updateProfile(kullanici(), { displayName: ad.trim().slice(0, 40) });
    await yenile();
  } catch (e) {
    throw girisHatasinaCevir(e);
  }
}

export async function parolaDegistir(mevcut: string, yeni: string): Promise<void> {
  const u = kullanici();
  if (!u.email) throw new UygulamaHatasi("OTURUM_YOK");
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, mevcut));
    await updatePassword(u, yeni);
  } catch (e) {
    throw girisHatasinaCevir(e);
  }
}

/** Google ya da Apple ile girmiş kullanıcıya e-posta + parola yöntemi ekler. */
export async function parolaOlustur(yeni: string): Promise<void> {
  const u = kullanici();
  if (!u.email) throw new UygulamaHatasi("OTURUM_YOK", { mesaj: "Hesabında e-posta adresi yok." });
  try {
    await linkWithCredential(u, EmailAuthProvider.credential(u.email, yeni));
    await yenile();
  } catch (e) {
    throw girisHatasinaCevir(e);
  }
}
