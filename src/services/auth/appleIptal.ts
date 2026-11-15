// Apple ile Giriş token iptali (App Store 5.1.1(v): hesap silinirken iptal şart). Saf parçalar testli.
//
// Kaynaktan doğrulanan (2026-11-15, node_modules ve ios/App/Pods):
// - @capacitor-firebase/authentication iOS `revokeAccessToken` native `Auth.auth().revokeToken(withAuthorizationCode:)`
//   çağırır. O da `_currentUser?.internalGetToken` ile native oturumdaki kullanıcıya bakar. skipNativeAuth: true
//   olduğu için native kullanıcı YOK: completion hiç çağrılmaz, söz sonsuza dek bekler. Kullanılmaz.
// - Firebase JS `revokeAccessToken` yalnız `tokenType: "ACCESS_TOKEN"` gönderir. Native iOS Apple girişi access
//   token değil `authorizationCode` verir: JS yolu iOS'ta yanlış tür olur. Yalnız web popup'ında (access token) kullanılır.
// - iOS SDK aynı uca (`/v2/accounts:revokeToken`) `providerId: apple.com`, `tokenType: AUTHORIZATION_CODE` (3),
//   `token: kod`, `idToken` ile gider. Biz bu isteği JS'deki Firebase oturumunun ID token'ıyla kendimiz atarız.
// Ön koşul (konsol): Firebase > Authentication > Apple > "OAuth code flow configuration": Team ID, Key ID, .p8 özel anahtar.

export type AppleIptalBelirteci = { tur: "kod"; deger: string } | { tur: "erisim"; deger: string };

export type AppleIptalDurumu = "yapildi" | "basarisiz" | "gerekmedi";

export const APPLE_IPTAL_UYARISI =
  "Hesabın silindi. Apple ile Giriş bağlantısı kaldırılamadı: iPhone Ayarlar > Apple Kimliği > Apple ile Giriş bölümünden Fintel'i kaldırabilirsin.";

const UC = "https://identitytoolkit.googleapis.com/v2/accounts:revokeToken";

/** iOS SDK'nın RevokeTokenRequest'iyle aynı gövde (tokenType 3 = AUTHORIZATION_CODE). */
export function appleKodIptalIstegi(apiKey: string, idToken: string, kod: string): { url: string; init: RequestInit } {
  return {
    url: `${UC}?key=${encodeURIComponent(apiKey)}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "apple.com", tokenType: "AUTHORIZATION_CODE", token: kod, idToken }),
    },
  };
}

/** Yetkilendirme koduyla iptal (native iOS). 15 sn zaman aşımı. Başarısızsa fırlatır. */
export async function appleKoduIptalEt(
  args: { apiKey: string; idToken: string; kod: string },
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const { url, init } = appleKodIptalIstegi(args.apiKey, args.idToken, args.kod);
  const ac = new AbortController();
  const zaman = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetchFn(url, { ...init, signal: ac.signal });
    if (!r.ok) throw new Error(`revokeToken ${r.status}`);
  } finally {
    clearTimeout(zaman);
  }
}

export interface SilmeAdimlari<S> {
  /** Yeniden doğrular; Apple ise iptal belirtecini döner */
  yenidenDogrula(): Promise<{ apple: boolean; belirtec?: AppleIptalBelirteci }>;
  iptalEt(b: AppleIptalBelirteci): Promise<void>;
  sunucuSil(): Promise<S>;
  cikis(): Promise<void>;
}

/**
 * Silme sırası: yeniden doğrula -> Apple iptali -> deleteAccount -> çıkış.
 * İptal SİLMEDEN ÖNCE yapılır (Firebase oturumunun ID token'ı gerekir).
 * İptal başarısızsa silme DURMAZ: kullanıcının silme hakkı engellenmez (App Store hesap silme şartı), veri yine
 * silinir; kullanıcıya bağlantıyı Apple ayarlarından kaldırma yolu düz mesajla söylenir (`uyari`).
 */
export async function silmeAkisi<S>(
  a: SilmeAdimlari<S>,
): Promise<{ sonuc: S; appleIptal: AppleIptalDurumu; uyari: string | null }> {
  const { apple, belirtec } = await a.yenidenDogrula();
  let appleIptal: AppleIptalDurumu = "gerekmedi";
  if (apple) {
    if (!belirtec) appleIptal = "basarisiz";
    else {
      try {
        await a.iptalEt(belirtec);
        appleIptal = "yapildi";
      } catch {
        appleIptal = "basarisiz";
      }
    }
  }
  const sonuc = await a.sunucuSil();
  await a.cikis().catch(() => undefined);
  return { sonuc, appleIptal, uyari: appleIptal === "basarisiz" ? APPLE_IPTAL_UYARISI : null };
}
