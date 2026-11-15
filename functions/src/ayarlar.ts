// Sunucu sabitleri. Kota ve sınırlar yalnız burada değişir.
// Sözleşme: kaynaklar/havuz/SOZLESMELER.md > "Sunucu uçları".

export const REGION = "europe-west1";

/** Kota günü bu saat dilimine göre hesaplanır (istemcinin saatine bakılmaz). */
export const QUOTA_TIME_ZONE = "Europe/Istanbul";
/** Türkiye 2016'dan beri sabit UTC+3, yaz saati yok. Sıfırlanma zamanı metni için. */
export const QUOTA_TZ_OFFSET = "+03:00";

export type AiOp = "receipt" | "report" | "chat";

/** Kullanıcı başı günlük sınır. */
export const DAILY_LIMITS: Record<AiOp, number> = {
  receipt: 30,
  report: 10,
  chat: 60,
};

/** Kota sayaçlarının koleksiyonu. Doküman kimliği uid. */
export const USAGE_COLLECTION = "ai_usage";

/** Anonim Auth kullanıcısına AI açık mı. Karar: kapalı (misafire AI yok). */
export const ALLOW_ANONYMOUS_AI = false;

/** Tüm istek JSON'u en fazla. */
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
/** Fiş görseli, base64 çözülmüş haliyle en fazla. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Sohbette modele giden en fazla mesaj. */
export const CHAT_HISTORY_LIMIT = 12;
export const CHAT_MESSAGE_MAX_CHARS = 2000;

/** Yanıt üst sınırı (düşünme tokenları dahil sayılır, pay bırakıldı). */
export const MAX_OUTPUT_TOKENS: Record<AiOp, number> = {
  receipt: 4096,
  report: 3072,
  chat: 2048,
};

/** Tek Gemini isteği için zaman aşımı. İki deneme (~50 sn) callable istemcinin varsayılan 70 sn süresinin altında kalır. */
export const GEMINI_TIMEOUT_MS = 25_000;
export const FUNCTION_TIMEOUT_SECONDS = 120;

/** deleteAccount: son giriş bundan eskiyse yeniden doğrulama istenir. */
export const REAUTH_MAX_AGE_SECONDS = 5 * 60;

/** Aynı anda en fazla örnek: maliyet ve kötüye kullanım tavanı. */
export const MAX_INSTANCES = 10;
