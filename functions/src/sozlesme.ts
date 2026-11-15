// İstek şemaları (zod). Sözleşme: kaynaklar/havuz/SOZLESMELER.md > "Sunucu uçları".
import { z } from "zod";
import {
  CHAT_HISTORY_LIMIT,
  CHAT_MESSAGE_MAX_CHARS,
  MAX_IMAGE_BYTES,
  MAX_REQUEST_BYTES,
} from "./ayarlar";
import { apiError } from "./hatalar";

const MAX_KURUS = 100_000_000_000; // 1 milyar TL, kuruş

export const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidLocalDate, "geçersiz tarih");

export function isValidLocalDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}

const timeZone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "geçersiz saat dilimi");

const kurus = z.number().int().min(-MAX_KURUS).max(MAX_KURUS);
const kurusPositive = z.number().int().min(0).max(MAX_KURUS);
const shortText = (max: number) => z.string().max(max);

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

/** base64 metninden çözülmüş bayt sayısı. */
export function base64DecodedBytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Dosyanın ilk baytları bildirilen türle uyuşuyor mu. */
export function sniffImage(bytes: Uint8Array, mimeType: ImageMimeType): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  switch (mimeType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/heic":
    case "image/heif":
      return ascii(4, 8) === "ftyp";
  }
}

const imageSchema = z.object({
  mimeType: z.string(),
  data: z.string(),
});

export const receiptRequest = z.object({
  op: z.literal("receipt"),
  image: imageSchema,
  today: localDate,
  timeZone,
});

const financeContext = z.object({
  userName: shortText(40).optional(),
  today: localDate,
  period: z.object({
    name: shortText(80),
    start: localDate,
    end: localDate,
    remainingDays: z.number().int().min(0).max(400),
  }),
  totals: z.object({
    plannedIncome: kurus,
    extraIncome: kurus,
    planned: kurus,
    discretionary: kurus,
    balance: kurus,
    dailyLimit: kurus.nullable(),
    todayRemaining: kurus.nullable(),
    savingsRatePercent: z.number().int().min(-1000).max(100).nullable(),
  }),
  categories: z
    .array(z.object({ key: shortText(40), name: shortText(80), amount: kurusPositive }))
    .max(30),
  recurring: z
    .array(
      z.object({
        name: shortText(80),
        amount: kurusPositive,
        frequency: z.enum(["weekly", "monthly", "yearly"]),
      }),
    )
    .max(30),
  recent: z
    .array(
      z.object({
        date: localDate,
        categoryName: shortText(80),
        amount: kurusPositive,
        type: z.enum(["income", "expense"]),
        description: shortText(80),
      }),
    )
    .max(30),
  previousPeriod: z
    .object({
      name: shortText(80),
      balance: kurus,
      savingsRatePercent: z.number().int().min(-1000).max(100).nullable(),
    })
    .optional(),
  profile: z
    .object({
      goal: z.enum(["debt_reduction", "savings", "investment", "stability"]).optional(),
      savingsStyle: z.enum(["strict", "balanced", "relaxed"]).optional(),
      risk: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
  style: z.enum(["short", "balanced", "detailed"]).optional(),
});
export type FinanceContext = z.infer<typeof financeContext>;

export const reportRequest = z.object({
  op: z.literal("report"),
  context: financeContext,
});

const chatMessage = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(CHAT_MESSAGE_MAX_CHARS),
});
export type ChatMessage = z.infer<typeof chatMessage>;

export const chatRequest = z.object({
  op: z.literal("chat"),
  mode: z.enum(["advisor", "tutor"]),
  context: financeContext.optional(),
  // Uzun geçmiş reddedilmez, son N mesaj alınır. Üst sınır yalnız kötüye kullanıma karşı.
  messages: z.array(chatMessage).min(1).max(200),
});

export const aiRequest = z.discriminatedUnion("op", [receiptRequest, reportRequest, chatRequest]);
export type AiRequest = z.infer<typeof aiRequest>;
export type ReceiptRequest = z.infer<typeof receiptRequest>;
export type ReportRequest = z.infer<typeof reportRequest>;
export type ChatRequest = z.infer<typeof chatRequest>;

export type ValidatedReceipt = Omit<ReceiptRequest, "image"> & {
  image: { mimeType: ImageMimeType; data: string };
};
export type ValidatedRequest = ValidatedReceipt | ReportRequest | ChatRequest;

/**
 * Ham callable verisini doğrular. Hata durumunda istemciye yalnız sabit kod döner,
 * zod ayrıntısı dönmez (iç yapıyı sızdırmamak için `issues` yalnız yol listesi).
 */
export function parseAiRequest(raw: unknown): ValidatedRequest {
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(raw ?? null));
  } catch {
    throw apiError("INVALID_REQUEST");
  }
  if (size > MAX_REQUEST_BYTES) throw apiError("TOO_LARGE");

  const result = aiRequest.safeParse(raw);
  if (!result.success) {
    throw apiError("INVALID_REQUEST", {
      fields: result.error.issues.slice(0, 5).map((i) => i.path.join(".")),
    });
  }
  const req = result.data;

  if (req.op === "chat") {
    const messages = req.messages.slice(-CHAT_HISTORY_LIMIT);
    if (messages[messages.length - 1].role !== "user") {
      throw apiError("INVALID_REQUEST", { fields: ["messages"] });
    }
    return { ...req, messages };
  }

  if (req.op === "receipt") {
    const { mimeType, data } = req.image;
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw apiError("UNSUPPORTED_FILE");
    }
    if (data.length === 0 || data.length % 4 !== 0 || !BASE64_RE.test(data)) {
      throw apiError("INVALID_REQUEST", { fields: ["image.data"] });
    }
    if (base64DecodedBytes(data) > MAX_IMAGE_BYTES) throw apiError("TOO_LARGE");
    const head = Buffer.from(data.slice(0, 24), "base64");
    if (!sniffImage(head, mimeType as ImageMimeType)) throw apiError("UNSUPPORTED_FILE");
    return { ...req, image: { mimeType: mimeType as ImageMimeType, data } };
  }

  if (req.context.period.start > req.context.period.end) {
    throw apiError("INVALID_REQUEST", { fields: ["context.period"] });
  }
  return req;
}
