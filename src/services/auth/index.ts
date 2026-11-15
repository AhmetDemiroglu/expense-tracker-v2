// Kimlik: Google ve Apple (native eklenti, web'de popup), e-posta + parola, çıkış, yeniden doğrulama, hesap silme.
// Native giriş skipNativeAuth ile kimlik bilgisini döner; oturum JS SDK'da signInWithCredential ile açılır
// (callable ID token'ı JS SDK'dan ekler: P2 notu).

import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  revokeAccessToken,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { UygulamaHatasi } from "@/data/hatalar";
import { firebaseHazir, fonksiyonlar, kimlikDogrulama } from "../firebase";
import { appleKoduIptalEt, silmeAkisi, type AppleIptalBelirteci, type AppleIptalDurumu } from "./appleIptal";
import { girisHatasinaCevir, silmeHatasinaCevir, webGirisHatasinaCevir } from "./hatalar";

export { girisHatasinaCevir, silmeHatasinaCevir } from "./hatalar";
export { APPLE_IPTAL_UYARISI, type AppleIptalDurumu } from "./appleIptal";

export type Saglayici = "google" | "apple" | "password";

/** Oturum boyunca "yapılandırılmamış" hatası alan sağlayıcı gizlenir (çökme yok). */
const kapali = new Set<Saglayici>();

export function girisSecenekleri(): { google: boolean; apple: boolean; eposta: true } {
  const hazir = firebaseHazir();
  const p = Capacitor.getPlatform();
  const native = Capacitor.isNativePlatform();
  const eklenti = !native || Capacitor.isPluginAvailable("FirebaseAuthentication");
  return {
    google: hazir && eklenti && !kapali.has("google"),
    // Android'de Apple girişi sunulmaz (skipNativeAuth ile desteklenmiyor, plan: iOS ve web).
    apple: hazir && eklenti && (p === "ios" || p === "web") && !kapali.has("apple"),
    eposta: true,
  };
}

function hataVer(saglayici: Saglayici | null, e: unknown, gecenMs?: number): never {
  const h = gecenMs === undefined ? girisHatasinaCevir(e) : webGirisHatasinaCevir(e, gecenMs);
  // Düğme yalnız native'de (eklenti ya da yapılandırma yok) gizlenir. Web'de geçici hata düğmeyi kaybettirmez:
  // kullanıcı mesajı görür ve yeniden dener.
  if (saglayici && h.kod === "SAGLAYICI_YOK" && Capacitor.isNativePlatform()) kapali.add(saglayici);
  throw h;
}

export function saglayiciAdi(u: User): Saglayici {
  const ids = u.providerData.map((p) => p.providerId);
  if (ids.includes("apple.com")) return "apple";
  if (ids.includes("google.com")) return "google";
  return "password";
}

export function oturumuDinle(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(kimlikDogrulama(), cb);
}

export function aktifKullanici(): User | null {
  return firebaseHazir() ? kimlikDogrulama().currentUser : null;
}

interface SaglayiciSonucu {
  credential: AuthCredential;
  /** Apple token iptali için (iOS native: yetkilendirme kodu, web: access token) */
  appleIptal?: AppleIptalBelirteci;
}

async function nativeKimlik(s: "google" | "apple"): Promise<SaglayiciSonucu> {
  if (s === "google") {
    const r = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const c = r.credential;
    if (!c?.idToken) throw new UygulamaHatasi("SAGLAYICI_YOK");
    return { credential: GoogleAuthProvider.credential(c.idToken, c.accessToken ?? null) };
  }
  const r = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const c = r.credential;
  if (!c?.idToken) throw new UygulamaHatasi("SAGLAYICI_YOK");
  const credential = new OAuthProvider("apple.com").credential({ idToken: c.idToken, rawNonce: c.nonce });
  // iOS eklentisi yetkilendirme kodunu verir (access token vermez): iptal kodla yapılır.
  if (c.authorizationCode) return { credential, appleIptal: { tur: "kod", deger: c.authorizationCode } };
  if (c.accessToken) return { credential, appleIptal: { tur: "erisim", deger: c.accessToken } };
  return { credential };
}

function webSaglayici(s: "google" | "apple"): GoogleAuthProvider | OAuthProvider {
  if (s === "google") {
    const g = new GoogleAuthProvider();
    g.setCustomParameters({ prompt: "select_account" });
    return g;
  }
  const a = new OAuthProvider("apple.com");
  a.addScope("email");
  a.addScope("name");
  a.setCustomParameters({ locale: "tr" });
  return a;
}

async function saglayiciIleGir(s: "google" | "apple"): Promise<void> {
  if (!girisSecenekleri()[s]) throw new UygulamaHatasi("SAGLAYICI_YOK");
  const t0 = Date.now();
  try {
    const auth = kimlikDogrulama();
    if (Capacitor.isNativePlatform()) {
      const { credential } = await nativeKimlik(s);
      await signInWithCredential(auth, credential);
    } else {
      // Pencere tıklamanın eşzamanlı yolunda açılır: bu noktadan önce await yok (Safari/iOS engeller).
      await signInWithPopup(auth, webSaglayici(s));
    }
  } catch (e) {
    hataVer(s, e, Capacitor.isNativePlatform() ? undefined : Date.now() - t0);
  }
}

export function googleIleGir(): Promise<void> {
  return saglayiciIleGir("google");
}

export function appleIleGir(): Promise<void> {
  return saglayiciIleGir("apple");
}

export async function epostaIleGir(eposta: string, parola: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(kimlikDogrulama(), eposta.trim(), parola);
  } catch (e) {
    hataVer(null, e);
  }
}

export async function kayitOl(eposta: string, parola: string, ad?: string): Promise<void> {
  try {
    const r = await createUserWithEmailAndPassword(kimlikDogrulama(), eposta.trim(), parola);
    if (ad?.trim()) await updateProfile(r.user, { displayName: ad.trim().slice(0, 40) });
    // Doğrulama e-postası gönderilemese de hesap açıldı: kayıt başarısız sayılmaz.
    await sendEmailVerification(r.user).catch(() => undefined);
  } catch (e) {
    hataVer(null, e);
  }
}

export async function dogrulamaGonder(): Promise<void> {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  try {
    await sendEmailVerification(u);
  } catch (e) {
    hataVer(null, e);
  }
}

export async function sifreSifirla(eposta: string): Promise<void> {
  try {
    await sendPasswordResetEmail(kimlikDogrulama(), eposta.trim());
  } catch (e) {
    const h = girisHatasinaCevir(e);
    // Hesap var mı yok mu bilgisi sızmasın: "kullanıcı yok" başarı gibi davranır.
    if (h.kod === "HATALI_GIRIS") return;
    throw h;
  }
}

/** Kullanıcının e-posta + parola yöntemi var mı (parola değiştir / oluştur seçimi için). */
export function parolaVarMi(u: User): boolean {
  return u.providerData.some((p) => p.providerId === "password");
}

export async function adGuncelle(ad: string): Promise<void> {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  const temiz = ad.trim().slice(0, 40);
  if (!temiz) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Ad boş olamaz." });
  try {
    await updateProfile(u, { displayName: temiz });
  } catch (e) {
    hataVer(null, e);
  }
}

/** E-posta kullanıcısı: mevcut parolayla yeniden doğrulanır, sonra yeni parola yazılır. */
export async function parolaDegistir(mevcut: string, yeni: string): Promise<void> {
  const u = aktifKullanici();
  if (!u?.email) throw new UygulamaHatasi("OTURUM_YOK");
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, mevcut));
    await updatePassword(u, yeni);
  } catch (e) {
    hataVer(null, e);
  }
}

/**
 * Google ya da Apple kullanıcısına e-posta + parola yöntemi ekler (aynı hesap, ikinci giriş yolu).
 * Son giriş eskiyse YENIDEN_GIRIS döner: ekran önce yenidenDogrula() çağırır, sonra tekrar dener.
 */
export async function parolaOlustur(yeni: string): Promise<void> {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  if (!u.email) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Hesabında e-posta adresi yok, parola oluşturulamaz." });
  if (parolaVarMi(u)) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Hesabında zaten parola var. Parola değiştirmeyi kullan." });
  try {
    await linkWithCredential(u, EmailAuthProvider.credential(u.email, yeni));
  } catch (e) {
    hataVer(null, e);
  }
}

/** Doğrulama bağlantısına tıkladıktan sonra: güncel durum. */
export async function epostaDurumunuYenile(): Promise<boolean> {
  const u = aktifKullanici();
  if (!u) return false;
  try {
    await u.reload();
  } catch (e) {
    hataVer(null, e);
  }
  return kimlikDogrulama().currentUser?.emailVerified ?? false;
}

/** Native sağlayıcı oturumu (Google hesap seçici bir dahaki girişte yeniden çıksın) ve Firebase oturumu kapanır. */
export async function cikisYap(): Promise<void> {
  // Native signOut yalnız Google/Apple kullanıcısında: skipNativeAuth ile native oturum yok, çağrı yalnız hesap
  // seçicisini sıfırlar. iOS'ta GoogleService-Info.plist yokken native Auth.auth() NSException ile çöker
  // (.catch yakalayamaz); e-posta kullanıcısında hiç çağrılmaz. Google/Apple girişi plist olmadan zaten açılamaz.
  const u = aktifKullanici();
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("FirebaseAuthentication") && u && saglayiciAdi(u) !== "password") {
    await FirebaseAuthentication.signOut().catch(() => undefined);
  }
  if (firebaseHazir()) await signOut(kimlikDogrulama());
}

/** Hassas işlem öncesi yeniden doğrulama. Apple ise token iptali için token döner. */
export async function yenidenDogrula(parola?: string): Promise<{ appleIptal?: AppleIptalBelirteci }> {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  const s = saglayiciAdi(u);
  try {
    if (s === "password") {
      if (!u.email || !parola) throw new UygulamaHatasi("YENIDEN_GIRIS", { mesaj: "Devam etmek için parolanı gir." });
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, parola));
      return {};
    }
    if (Capacitor.isNativePlatform()) {
      const r = await nativeKimlik(s);
      await reauthenticateWithCredential(u, r.credential);
      return r.appleIptal ? { appleIptal: r.appleIptal } : {};
    }
    const r = await reauthenticateWithPopup(u, webSaglayici(s));
    const token = s === "apple" ? OAuthProvider.credentialFromResult(r)?.accessToken : undefined;
    return token ? { appleIptal: { tur: "erisim", deger: token } } : {};
  } catch (e) {
    hataVer(s === "password" ? null : s, e);
  }
}

export interface SunucuSilmeSonucu {
  transactions: number;
  budget_periods: number;
  recurring_transactions: number;
}

/** Apple token iptali: kod -> Identity Toolkit REST (iOS SDK ile aynı istek), access token -> Firebase JS. */
async function appleIptalEt(b: AppleIptalBelirteci): Promise<void> {
  const auth = kimlikDogrulama();
  if (b.tur === "erisim") {
    await revokeAccessToken(auth, b.deger);
    return;
  }
  const u = auth.currentUser;
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  await appleKoduIptalEt({ apiKey: import.meta.env.VITE_FIREBASE_API_KEY, idToken: await u.getIdToken(), kod: b.deger });
}

export interface HesapSilmeSonucu extends SunucuSilmeSonucu {
  appleIptal: AppleIptalDurumu;
  /** Apple iptali başarısızsa kullanıcıya gösterilecek düz mesaj (silme yine tamamlandı) */
  uyari: string | null;
}

/**
 * Hesap silme (P2 deleteAccount sözleşmesi): yeniden doğrula, Apple token iptali, sunucu silme, çıkış.
 * İptal başarısızsa silme sürer ve `uyari` dolar (gerekçe: appleIptal.ts silmeAkisi).
 */
export async function hesabiKaliciSil(parola?: string): Promise<HesapSilmeSonucu> {
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("OTURUM_YOK");
  const apple = saglayiciAdi(u) === "apple";
  const r = await silmeAkisi<SunucuSilmeSonucu>({
    async yenidenDogrula() {
      const { appleIptal } = await yenidenDogrula(parola);
      return appleIptal ? { apple, belirtec: appleIptal } : { apple };
    },
    iptalEt: appleIptalEt,
    async sunucuSil() {
      try {
        const fn = httpsCallable<Record<string, never>, { deleted?: Partial<SunucuSilmeSonucu> }>(
          fonksiyonlar(),
          "deleteAccount",
          { timeout: 70_000 },
        );
        const res = await fn({});
        const d = res.data.deleted ?? {};
        return {
          transactions: Number(d.transactions ?? 0),
          budget_periods: Number(d.budget_periods ?? 0),
          recurring_transactions: Number(d.recurring_transactions ?? 0),
        };
      } catch (e) {
        throw silmeHatasinaCevir(e);
      }
    },
    cikis: cikisYap,
  });
  return { ...r.sonuc, appleIptal: r.appleIptal, uyari: r.uyari };
}
