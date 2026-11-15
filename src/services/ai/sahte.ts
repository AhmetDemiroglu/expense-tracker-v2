// Geliştirme sağlayıcısı: VITE_AI_SAHTE=1 iken sunucuya gidilmez. Yanıtlar sunucunun ham biçimindedir
// (aynı doğrulayıcıdan geçer), böylece ekranlar gerçek akışla çalışır.

import type { FinanceContext } from "./sema";

const SINIR = { receipt: 30, report: 10, chat: 60 } as const;
const sayac = { receipt: 0, report: 0, chat: 0 };

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function kullanim(op: keyof typeof SINIR) {
  sayac[op] += 1;
  return { op, used: sayac[op], limit: SINIR[op] };
}

export async function sahteFis(today: string): Promise<unknown> {
  await bekle(900);
  return {
    isReceipt: true,
    merchant: "Örnek Market",
    date: today,
    total: 34_750,
    vat: 3_159,
    categoryKey: "market",
    items: [
      { name: "Süt 1 L", amount: 4_250, quantity: 2 },
      { name: "Ekmek", amount: 1_500, quantity: 1 },
      { name: "Peynir", amount: 18_500, quantity: 1 },
      { name: "Domates", amount: 6_250, quantity: 1 },
    ],
    confidence: 0.92,
    model: "sahte",
    usage: kullanim("receipt"),
  };
}

export async function sahteRapor(ctx: FinanceContext): Promise<unknown> {
  await bekle(1100);
  const ilk = ctx.categories[0];
  const iyi = ctx.totals.balance >= 0;
  return {
    status: {
      summary: iyi
        ? `${ctx.period.name} dönemi iyi gidiyor. Kalan ${ctx.period.remainingDays} günde planına sadık kalırsan dönemi artıda kapatırsın.`
        : `${ctx.period.name} döneminde harcamalar planın üstünde. Kalan günlerde günlük limite dikkat etmen gerekiyor.`,
      mood: iyi ? "positive" : "critical",
    },
    findings: [
      ilk ? `En çok harcama ${ilk.name} kategorisinde.` : "Bu dönem henüz harcama yok.",
      "Düzenli ödemeler dönem başında bütçeden ayrıldı.",
    ],
    suggestions: ilk
      ? [
          {
            title: `${ilk.name} için haftalık sınır koy`,
            description: "Haftalık bir tavan belirlemek dönem sonunu rahatlatır.",
            categoryKey: ilk.key,
            suggestedCutPercent: 10,
          },
        ]
      : [{ title: "İlk kaydını ekle", description: "Harcamalarını girdikçe öneriler netleşir.", categoryKey: null, suggestedCutPercent: null }],
    note: "Bu bir örnek rapordur.",
    model: "sahte",
    usage: kullanim("report"),
  };
}

export async function sahteSohbet(son: string): Promise<unknown> {
  await bekle(800);
  return {
    reply: `Bu örnek bir yanıt. Sorun: "${son.slice(0, 80)}". Sunucu bağlanınca Nova gerçek yanıt verecek.\n- Günlük limitini Özet ekranında görebilirsin.\n- **Düzenli ödemeler** dönem başında ayrılır.`,
    model: "sahte",
    usage: kullanim("chat"),
  };
}

export function sahteKota() {
  return {
    receipt: { kullanilan: sayac.receipt, sinir: SINIR.receipt },
    report: { kullanilan: sayac.report, sinir: SINIR.report },
    chat: { kullanilan: sayac.chat, sinir: SINIR.chat },
  };
}
