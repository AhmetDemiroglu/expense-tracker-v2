// Gerçek Gemini ile duman testi. Anahtar yoksa atlanır, CI'da çalışmaz.
// Çalıştırma (anahtar yalnız bu komutun ortamında kalır):
//   GEMINI_API_KEY=... npm run test:duman
//   GEMINI_API_KEY=... DUMAN_FIS=/yol/fis.jpg npm run test:duman   (fiş okuma da denenir)
// Amaç: responseJsonSchema ve thinkingLevel alanlarının iki modelde de kabul edildiğini görmek.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generate, type FetchLike } from "../../src/gemini";
import { MODEL_CHAIN, THINKING_BY_OP } from "../../src/modeller";
import { chatSystemPrompt, receiptSystemPrompt, receiptUserText, reportSystemPrompt, reportUserText } from "../../src/promptlar";
import { parseChat, parseReceipt, parseReport, receiptModelSchema, reportModelSchema } from "../../src/semalar";
import { context } from "../unit/yardimci";

const key = process.env.GEMINI_API_KEY;
const fis = process.env.DUMAN_FIS;
const logs: string[] = [];
const deps = (model: (typeof MODEL_CHAIN)[number]) => ({
  apiKey: key ?? "",
  fetch: fetch as unknown as FetchLike,
  timeoutMs: 60_000,
  logger: { info: (m: string, d?: object) => logs.push(`${m} ${JSON.stringify(d)}`), warn: (m: string, d?: object) => logs.push(`${m} ${JSON.stringify(d)}`) },
  models: [model],
});

describe.skipIf(!key)("Gemini duman testi", () => {
  for (const model of MODEL_CHAIN) {
    it(`${model}: rapor şemalı JSON`, async () => {
      const ctx = context() as never;
      const r = await generate(
        deps(model),
        {
          systemInstruction: reportSystemPrompt(ctx),
          contents: [{ role: "user", parts: [{ text: reportUserText(ctx) }] }],
          maxOutputTokens: 3072,
          thinking: THINKING_BY_OP.report,
          responseJsonSchema: reportModelSchema as unknown as Record<string, unknown>,
        },
        (t) => parseReport(t, ["market", "yeme_icme"]),
      ).catch((e) => {
        console.log(logs.join("\n"));
        throw e;
      });
      console.log(model, JSON.stringify(r.value, null, 2));
      expect(r.value.findings.length).toBeGreaterThan(0);
    }, 90_000);

    it(`${model}: sohbet düz metin`, async () => {
      const r = await generate(
        deps(model),
        {
          systemInstruction: chatSystemPrompt("advisor", context() as never),
          contents: [{ role: "user", parts: [{ text: "Bu ay marketi nasıl azaltırım? Bir de hangi hisseyi alayım?" }] }],
          maxOutputTokens: 2048,
          thinking: THINKING_BY_OP.chat,
        },
        parseChat,
      ).catch((e) => {
        console.log(logs.join("\n"));
        throw e;
      });
      console.log(model, r.value.reply);
      expect(r.value.reply).not.toMatch(/[—–]/);
    }, 90_000);

    it.skipIf(!fis)(`${model}: fiş okuma`, async () => {
      const data = readFileSync(fis!).toString("base64");
      const today = new Date().toISOString().slice(0, 10);
      const r = await generate(
        deps(model),
        {
          systemInstruction: receiptSystemPrompt(),
          contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data } }, { text: receiptUserText(today, "Europe/Istanbul") }] }],
          maxOutputTokens: 4096,
          thinking: THINKING_BY_OP.receipt,
          responseJsonSchema: receiptModelSchema as unknown as Record<string, unknown>,
        },
        (t) => parseReceipt(t, today),
      ).catch((e) => {
        console.log(logs.join("\n"));
        throw e;
      });
      console.log(model, JSON.stringify(r.value, null, 2));
    }, 90_000);
  }
});
