// aiProxy iş mantığı (Firebase'den bağımsız, testte sahte bağımlılıkla çalışır).
import { ALLOW_ANONYMOUS_AI, MAX_OUTPUT_TOKENS } from "./ayarlar";
import { generate, type GeminiDeps } from "./gemini";
import { apiError, isApiError } from "./hatalar";
import type { QuotaStore, Usage } from "./kota";
import { THINKING_BY_OP } from "./modeller";
import {
  chatSystemPrompt,
  receiptSystemPrompt,
  receiptUserText,
  reportSystemPrompt,
  reportUserText,
} from "./promptlar";
import {
  parseChat,
  parseReceipt,
  parseReport,
  receiptModelSchema,
  reportModelSchema,
  type ReceiptResult,
  type ReportResult,
} from "./semalar";
import { parseAiRequest, type ValidatedRequest } from "./sozlesme";

export type Caller = { uid: string; signInProvider?: string } | null;

export type AiDeps = {
  quota: QuotaStore;
  gemini: GeminiDeps;
  now: () => Date;
};

export type AiResponse =
  | (ReceiptResult & { model: string; usage: Usage })
  | (ReportResult & { model: string; usage: Usage })
  | { reply: string; model: string; usage: Usage };

export function requireAiCaller(caller: Caller): { uid: string } {
  if (!caller?.uid) throw apiError("AUTH_REQUIRED");
  if (caller.signInProvider === "anonymous" && !ALLOW_ANONYMOUS_AI) throw apiError("AUTH_REQUIRED");
  return { uid: caller.uid };
}

export async function handleAi(caller: Caller, raw: unknown, deps: AiDeps): Promise<AiResponse> {
  const { uid } = requireAiCaller(caller);
  const req = parseAiRequest(raw);
  const usage = await deps.quota.reserve(uid, req.op, deps.now());
  try {
    return await run(req, usage, deps);
  } catch (e) {
    // Hak yalnız AI'a ulaşılamadıysa iade edilir. AI_BAD_RESPONSE iade edilmez:
    // modeller faturalandı, iade sınırsız tekrar açığı yaratır.
    if (isApiError(e, "AI_BAD_RESPONSE")) throw e;
    await deps.quota.refund(uid, req.op, deps.now());
    if (isApiError(e)) throw e;
    deps.gemini.logger.warn("ai unexpected", { op: req.op, error: e instanceof Error ? e.name : "unknown" });
    throw apiError("AI_UNAVAILABLE");
  }
}

async function run(req: ValidatedRequest, usage: Usage, deps: AiDeps): Promise<AiResponse> {
  switch (req.op) {
    case "receipt": {
      const result = await generate(
        deps.gemini,
        {
          systemInstruction: receiptSystemPrompt(),
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: req.image.mimeType, data: req.image.data } },
                { text: receiptUserText(req.today, req.timeZone) },
              ],
            },
          ],
          maxOutputTokens: MAX_OUTPUT_TOKENS.receipt,
          thinking: THINKING_BY_OP.receipt,
          responseJsonSchema: receiptModelSchema as unknown as Record<string, unknown>,
        },
        (text) => parseReceipt(text, req.today),
      );
      return { ...result.value, model: result.model, usage };
    }
    case "report": {
      const keys = req.context.categories.map((c) => c.key);
      const result = await generate(
        deps.gemini,
        {
          systemInstruction: reportSystemPrompt(req.context),
          contents: [{ role: "user", parts: [{ text: reportUserText(req.context) }] }],
          maxOutputTokens: MAX_OUTPUT_TOKENS.report,
          thinking: THINKING_BY_OP.report,
          responseJsonSchema: reportModelSchema as unknown as Record<string, unknown>,
        },
        (text) => parseReport(text, keys),
      );
      return { ...result.value, model: result.model, usage };
    }
    case "chat": {
      const result = await generate(
        deps.gemini,
        {
          systemInstruction: chatSystemPrompt(req.mode, req.context),
          contents: req.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
          maxOutputTokens: MAX_OUTPUT_TOKENS.chat,
          thinking: THINKING_BY_OP.chat,
          acceptTruncated: true,
        },
        parseChat,
      );
      return { ...result.value, model: result.model, usage };
    }
  }
}
