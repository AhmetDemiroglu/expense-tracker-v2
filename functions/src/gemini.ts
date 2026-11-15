// Gemini REST istemcisi: model zinciri, yedeğe düşme, ham hatayı istemciden saklama.
// Anahtar başlıkta gider (x-goog-api-key), URL'ye yazılmaz: URL günlüğe düşebilir.
import { GEMINI_BASE_URL, MODEL_CHAIN, thinkingLevelFor, type ModelName, type ThinkingLevel } from "./modeller";
import { apiError } from "./hatalar";

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export type Content = { role: "user" | "model"; parts: Part[] };

export type GenerateRequest = {
  systemInstruction: string;
  contents: Content[];
  maxOutputTokens: number;
  thinking: ThinkingLevel;
  /** Verilirse yanıt JSON olur ve bu şemayla kısıtlanır. */
  responseJsonSchema?: Record<string, unknown>;
};

/** Yanıt metnini doğrular, uymuyorsa hata fırlatır (yedek modele düşülür). */
export type Validate<T> = (text: string) => T;

export type Logger = {
  warn: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
};

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export type GeminiDeps = {
  apiKey: string;
  fetch: FetchLike;
  timeoutMs: number;
  logger: Logger;
  models?: readonly ModelName[];
};

export type GenerateResult<T> = { value: T; model: ModelName };

/** Bir denemenin başarısızlık türü: "unavailable" ağ/sunucu, "bad" yanıt içeriği. */
type Failure = { kind: "unavailable" | "bad"; reason: string };

export function buildBody(model: ModelName, req: GenerateRequest): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: req.maxOutputTokens,
    thinkingConfig: { thinkingLevel: thinkingLevelFor(model, req.thinking) },
  };
  if (req.responseJsonSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseJsonSchema = req.responseJsonSchema;
  }
  return {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: req.contents,
    generationConfig,
  };
}

type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
};

/** Yanıttan düşünce olmayan metni çıkarır. Sorun varsa Failure döner. */
export function extractText(data: unknown): { text: string } | Failure {
  const res = (data ?? {}) as GeminiResponse;
  if (res.promptFeedback?.blockReason) {
    return { kind: "bad", reason: `blocked:${res.promptFeedback.blockReason}` };
  }
  const cand = res.candidates?.[0];
  if (!cand) return { kind: "bad", reason: "no-candidate" };
  const finish = cand.finishReason ?? "STOP";
  if (finish !== "STOP") return { kind: "bad", reason: `finish:${finish}` };
  const text = (cand.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) return { kind: "bad", reason: "empty" };
  return { text };
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export async function generate<T>(deps: GeminiDeps, req: GenerateRequest, validate: Validate<T>): Promise<GenerateResult<T>> {
  const models = deps.models ?? MODEL_CHAIN;
  const failures: Failure[] = [];

  for (const model of models) {
    const started = Date.now();
    const failure = await attempt(deps, model, req, validate).catch(
      (e: unknown): Failure => ({ kind: "unavailable", reason: e instanceof Error ? e.name : "error" }),
    );
    if ("value" in failure) {
      deps.logger.info("gemini ok", { model, ms: Date.now() - started, fallback: model !== models[0] });
      return { value: failure.value, model };
    }
    failures.push(failure);
    deps.logger.warn("gemini failed", { model, kind: failure.kind, reason: failure.reason, ms: Date.now() - started });
  }

  // Herhangi bir deneme ağ/sunucu hatasıysa "unavailable", hepsi içerik sorunuysa "bad".
  if (failures.some((f) => f.kind === "unavailable")) throw apiError("AI_UNAVAILABLE");
  throw apiError("AI_BAD_RESPONSE");
}

async function attempt<T>(
  deps: GeminiDeps,
  model: ModelName,
  req: GenerateRequest,
  validate: Validate<T>,
): Promise<{ value: T } | Failure> {
  const res = await deps.fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": deps.apiKey },
    body: JSON.stringify(buildBody(model, req)),
    signal: AbortSignal.timeout(deps.timeoutMs),
  });

  if (!res.ok) {
    // Gövdenin yalnız başı günlüğe; istemciye hiç dönmez.
    const body = (await res.text().catch(() => "")).slice(0, 300);
    return { kind: RETRYABLE_STATUS.has(res.status) ? "unavailable" : "bad", reason: `http:${res.status} ${body}` };
  }

  const extracted = extractText(await res.json());
  if (!("text" in extracted)) return extracted;

  try {
    return { value: validate(extracted.text) };
  } catch (e) {
    return { kind: "bad", reason: `invalid:${e instanceof Error ? e.message.slice(0, 120) : "?"}` };
  }
}
