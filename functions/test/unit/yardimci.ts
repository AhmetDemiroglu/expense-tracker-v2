import { HttpsError } from "firebase-functions/v2/https";

export function codeOf(e: unknown): string | undefined {
  if (e instanceof HttpsError) return (e.details as { code?: string } | undefined)?.code;
  return undefined;
}

export async function expectCode(p: Promise<unknown> | (() => unknown), code: string) {
  try {
    if (typeof p === "function") await p();
    else await p;
  } catch (e) {
    const got = codeOf(e);
    if (got !== code) throw new Error(`beklenen ${code}, gelen ${got ?? String(e)}`);
    return e as HttpsError;
  }
  throw new Error(`beklenen ${code}, hata gelmedi`);
}

/** Geçerli küçük JPEG başlığı (FF D8 FF E0 + JFIF), base64. */
export const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01]).toString("base64");
export const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");

export function context(overrides: Record<string, unknown> = {}) {
  return {
    today: "2026-11-15",
    period: { name: "Kasım", start: "2026-11-01", end: "2026-11-30", remainingDays: 16 },
    totals: {
      plannedIncome: 5_000_000,
      extraIncome: 0,
      planned: 2_000_000,
      discretionary: 1_200_050,
      balance: 1_799_950,
      dailyLimit: 112_496,
      todayRemaining: 50_000,
      savingsRatePercent: 36,
    },
    categories: [
      { key: "market", name: "Market & Pazar", amount: 600_000 },
      { key: "yeme_icme", name: "Yeme & İçme (Restoran vb.)", amount: 300_000 },
    ],
    recurring: [{ name: "Netflix", amount: 22_999, frequency: "monthly" }],
    recent: [{ date: "2026-11-14", categoryName: "Market & Pazar", amount: 45_050, type: "expense", description: "BİM" }],
    ...overrides,
  };
}
