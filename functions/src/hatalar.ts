import { HttpsError, type FunctionsErrorCode } from "firebase-functions/v2/https";

// İstemcinin baktığı sabit kodlar. Sözleşme: SOZLESMELER.md > "Hata kodları".
export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_REQUEST"
  | "TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "QUOTA_EXCEEDED"
  | "AI_UNAVAILABLE"
  | "AI_BAD_RESPONSE"
  | "REAUTH_REQUIRED"
  | "DELETE_FAILED";

const TABLE: Record<ApiErrorCode, { http: FunctionsErrorCode; message: string }> = {
  AUTH_REQUIRED: { http: "unauthenticated", message: "Bu özellik için giriş yapmalısın." },
  INVALID_REQUEST: { http: "invalid-argument", message: "İstek geçersiz." },
  TOO_LARGE: { http: "invalid-argument", message: "Dosya çok büyük. Daha küçük bir görsel dene." },
  UNSUPPORTED_FILE: { http: "invalid-argument", message: "Bu dosya türü okunamıyor." },
  QUOTA_EXCEEDED: { http: "resource-exhausted", message: "Bugünlük kullanım hakkın doldu. Yarın yeniden açılır." },
  AI_UNAVAILABLE: { http: "unavailable", message: "Şu an yanıt alınamadı. Biraz sonra yeniden dene." },
  AI_BAD_RESPONSE: { http: "internal", message: "Yanıt okunamadı. Bilgileri elle girebilirsin." },
  REAUTH_REQUIRED: { http: "failed-precondition", message: "Güvenlik için yeniden giriş yapman gerekiyor." },
  DELETE_FAILED: { http: "internal", message: "Hesap silinirken bir sorun oldu. Yeniden dene." },
};

/** İstemciye dönen tek hata biçimi. `details.code` sabit koddur. */
export function apiError(code: ApiErrorCode, extra: Record<string, unknown> = {}): HttpsError {
  const row = TABLE[code];
  return new HttpsError(row.http, row.message, { code, ...extra });
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is HttpsError {
  if (!(e instanceof HttpsError)) return false;
  const details = e.details as { code?: string } | undefined;
  return code ? details?.code === code : typeof details?.code === "string";
}
