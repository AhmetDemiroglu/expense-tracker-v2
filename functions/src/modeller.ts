// Model adları yalnız bu dosyada. Birincil hata verirse ya da RECITATION, SAFETY, boş yanıt,
// şemaya uymayan yanıt gelirse sıradaki modele düşülür.
// Kaynak: kaynaklar/03-gemini-model-secimi.md (2026-11-15).

export const MODEL_CHAIN = ["gemini-3.5-flash-lite", "gemini-3.8-flash"] as const;
export type ModelName = (typeof MODEL_CHAIN)[number];

export type ThinkingLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";

/**
 * Model başına desteklenen düşünme düzeyleri.
 * Belge (aistudio.google.com/docs/thinking, 2026-11-15): 3.5 Flash-Lite minimal/low/medium/high,
 * 3.8 Flash low/medium/high (minimal yok). Desteklenmeyen düzey 400 döner.
 */
const SUPPORTED_THINKING: Record<ModelName, readonly ThinkingLevel[]> = {
  "gemini-3.5-flash-lite": ["MINIMAL", "LOW", "MEDIUM", "HIGH"],
  "gemini-3.8-flash": ["LOW", "MEDIUM", "HIGH"],
};

const ORDER: ThinkingLevel[] = ["MINIMAL", "LOW", "MEDIUM", "HIGH"];

/** İstenen düzey modelde yoksa bir üst desteklenen düzeyi verir. */
export function thinkingLevelFor(model: ModelName, wanted: ThinkingLevel): ThinkingLevel {
  const supported = SUPPORTED_THINKING[model];
  if (supported.includes(wanted)) return wanted;
  const start = ORDER.indexOf(wanted);
  for (let i = start + 1; i < ORDER.length; i++) {
    if (supported.includes(ORDER[i])) return ORDER[i];
  }
  return supported[supported.length - 1];
}

/** İşlem başına istenen düşünme düzeyi. Düşük tutulur: hız ve maliyet. */
export const THINKING_BY_OP = {
  receipt: "LOW",
  report: "LOW",
  chat: "MINIMAL",
} as const satisfies Record<string, ThinkingLevel>;

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
