// Sağlayıcı hata kodlarını Türkçe, anlaşılır hataya çevirir. Ham hata kullanıcıya gitmez. Saf (testli).

import { UygulamaHatasi } from "@/data/hatalar";

function alan(e: unknown, ad: string): unknown {
  return typeof e === "object" && e !== null && ad in e ? (e as Record<string, unknown>)[ad] : undefined;
}

const IPTAL_KODLARI = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
  "auth/redirect-cancelled-by-user",
  "SIGN_IN_CANCELLED",
  "SIGN_IN_CANCELED",
  "12501", // Google Android: kullanıcı vazgeçti
  "1001", // Apple iOS: ASAuthorizationError.canceled
]);

const SAGLAYICI_YOK_KODLARI = new Set([
  "auth/operation-not-allowed",
  "auth/unauthorized-domain",
  "auth/operation-not-supported-in-this-environment",
  "auth/invalid-api-key",
  "auth/app-not-authorized",
  "auth/popup-blocked",
  "auth/web-storage-unsupported",
  "UNIMPLEMENTED",
  "UNAVAILABLE",
]);

export function girisHatasinaCevir(e: unknown): UygulamaHatasi {
  if (e instanceof UygulamaHatasi) return e;
  const code = String(alan(e, "code") ?? "");
  const message = String(alan(e, "message") ?? "");
  if (IPTAL_KODLARI.has(code) || /cancel/i.test(message)) return new UygulamaHatasi("IPTAL", { neden: e });
  switch (code) {
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/missing-password":
      return new UygulamaHatasi("HATALI_GIRIS", { neden: e });
    case "auth/user-disabled":
      return new UygulamaHatasi("HATALI_GIRIS", { neden: e, mesaj: "Bu hesap devre dışı bırakılmış." });
    case "auth/email-already-in-use":
      return new UygulamaHatasi("EPOSTA_KULLANIMDA", { neden: e });
    case "auth/weak-password":
      return new UygulamaHatasi("ZAYIF_PAROLA", { neden: e });
    case "auth/invalid-email":
    case "auth/missing-email":
      return new UygulamaHatasi("GECERSIZ_EPOSTA", { neden: e });
    case "auth/too-many-requests":
      return new UygulamaHatasi("COK_DENEME", { neden: e });
    case "auth/account-exists-with-different-credential":
    case "auth/credential-already-in-use":
      return new UygulamaHatasi("HESAP_FARKLI_YONTEM", { neden: e });
    case "auth/provider-already-linked":
      return new UygulamaHatasi("GECERSIZ", { neden: e, mesaj: "Hesabında zaten parola var. Parola değiştirmeyi kullan." });
    case "auth/network-request-failed":
    case "auth/timeout":
      return new UygulamaHatasi("AG_YOK", { neden: e });
    case "auth/requires-recent-login":
    case "auth/user-token-expired":
    case "auth/user-mismatch":
      return new UygulamaHatasi("YENIDEN_GIRIS", {
        neden: e,
        mesaj: code === "auth/user-mismatch" ? "Aynı hesapla yeniden giriş yapmalısın." : undefined,
      });
    default:
      break;
  }
  if (SAGLAYICI_YOK_KODLARI.has(code) || /not (implemented|available)|GoogleService-Info|no (google|apple)/i.test(message)) {
    return new UygulamaHatasi("SAGLAYICI_YOK", { neden: e });
  }
  return new UygulamaHatasi("BILINMEYEN", { neden: e, mesaj: "Giriş yapılamadı. Yeniden dene." });
}

/** deleteAccount (callable) hataları. Bizim sabit kodumuz details.code içinde. */
export function silmeHatasinaCevir(e: unknown): UygulamaHatasi {
  if (e instanceof UygulamaHatasi) return e;
  const details = alan(e, "details");
  const ozel = typeof details === "object" && details !== null ? String(alan(details, "code") ?? "") : "";
  if (ozel === "REAUTH_REQUIRED") return new UygulamaHatasi("YENIDEN_GIRIS", { neden: e });
  if (ozel === "DELETE_FAILED") return new UygulamaHatasi("SILME_YARIDA", { neden: e });
  if (ozel === "AUTH_REQUIRED") return new UygulamaHatasi("OTURUM_YOK", { neden: e });
  const code = String(alan(e, "code") ?? "").replace(/^functions\//, "");
  if (code === "unavailable" || code === "deadline-exceeded") return new UygulamaHatasi("AG_YOK", { neden: e });
  if (code === "unauthenticated") return new UygulamaHatasi("OTURUM_YOK", { neden: e });
  return new UygulamaHatasi("SILME_YARIDA", { neden: e });
}
