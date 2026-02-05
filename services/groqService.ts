import { Transaction, UserSettings, CycleSummary, AnalysisReport, RecurringTransaction } from "../types";
import { FINANCIAL_GOALS, SAVINGS_STYLES, RISK_TOLERANCE } from "../constants";
import { parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
    console.error("VITE_GROQ_API_KEY tanımlı değil. .env dosyanı kontrol et.");
}

// ==================== CORE API CALLER ====================
const callGroq = async (messages: { role: string; content: string }[], jsonMode = false, temperature = 0.7): Promise<string> => {
    const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            response_format: jsonMode ? { type: "json_object" } : undefined,
            temperature,
            max_tokens: jsonMode ? 2048 : 4096,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Groq API Hatası:", errorData);
        throw new Error(`Groq API Hatası: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
};

// ==================== HELPER FUNCTIONS ====================
const getStyleInstruction = (style: "short" | "balanced" | "detailed") => {
    switch (style) {
        case "short":
            return "CEVAP STİLİ: Çok kısa, net ve öz ol. Maksimum 3-5 cümle kullan.";
        case "detailed":
            return "CEVAP STİLİ: Detaylı, eğitici ve kapsamlı ol. Neden-sonuç ilişkisiyle ele al.";
        default:
            return "CEVAP STİLİ: Dengeli ol. Ne çok kısa ne çok uzun, tam kararında açıkla.";
    }
};

const getProfileInstructions = (settings: UserSettings) => {
    const goal = FINANCIAL_GOALS.find((g) => g.value === settings.financialGoal)?.prompt || "";
    const style = SAVINGS_STYLES.find((s) => s.value === settings.savingsStyle)?.prompt || "";
    const risk = RISK_TOLERANCE.find((r) => r.value === settings.riskTolerance)?.prompt || "";
    return `KİŞİSELLEŞTİRİLMİŞ KURALLAR: 1. HEDEF: ${goal} 2. ÜSLUP: ${style} 3. RİSK: ${risk}`;
};

const summarizeContext = (transactions: Transaction[], settings: UserSettings, userName: string, recurringTransactions: RecurringTransaction[] = []) => {
    const start = startOfDay(parseISO(settings.periodStartDate));
    const end = endOfDay(parseISO(settings.periodEndDate));
    const now = new Date();

    const activeSubs = recurringTransactions.filter((sub) => sub.isActive && sub.type === "expense");
    const subTotal = activeSubs.reduce((acc, sub) => acc + sub.amount, 0);
    const subList = activeSubs.map((s) => `- ${s.description}: ${s.amount} TL (${s.frequency})`).join("\n");

    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const activePeriodTxs = transactions.filter((t) => {
        const tDate = parseISO(t.date);
        return isWithinInterval(tDate, { start, end });
    });

    const txIncome = activePeriodTxs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const txExpense = activePeriodTxs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = txIncome + settings.monthlyIncome;
    const totalExpense = txExpense + settings.fixedExpenses;
    const balance = totalIncome - totalExpense;

    const expenses = activePeriodTxs.filter((t) => t.type === "expense");
    const categories: Record<string, number> = {};
    expenses.forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .map(([name, amount]) => `- ${name}: ${amount.toLocaleString("tr-TR")} TL`)
        .join("\n");

    const lastTransactions = activePeriodTxs
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map((t) => `${t.date}: ${t.category} (${t.amount} TL) - ${t.description}`)
        .join("\n");

    return `KULLANICI: ${userName} (Samimi hitap et)
DÖNEM: ${settings.periodName} (${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString("tr-TR")})
KALAN GÜN: ${daysRemaining > 0 ? daysRemaining : 0}
TOPLAM GELİR: ${totalIncome.toLocaleString("tr-TR")} TL (Maaş: ${settings.monthlyIncome} + Ek: ${txIncome})
TOPLAM GİDER: ${(totalExpense + subTotal).toLocaleString("tr-TR")} TL (Sabit: ${settings.fixedExpenses} + Abonelik: ${subTotal} + Harcama: ${txExpense})
NET BAKİYE: ${(balance - subTotal).toLocaleString("tr-TR")} TL

ABONELİKLER:
${subList || "Yok"}

EN YÜKSEK KATEGORİLER:
${topCategories || "Yok"}

SON İŞLEMLER:
${lastTransactions || "Yok"}`;
};

// ==================== ANALİZ FONKSİYONU ====================
export const analyzeFinances = async (transactions: Transaction[], settings: UserSettings, userName: string, style: "short" | "balanced" | "detailed" = "balanced", prevStats: CycleSummary | null = null, recurringTransactions: RecurringTransaction[] = []): Promise<AnalysisReport | null> => {
    const summary = summarizeContext(transactions, settings, userName, recurringTransactions);
    const styleInstruction = getStyleInstruction(style);
    const profileInstruction = getProfileInstructions(settings);
    const historyContext = prevStats ? `GEÇMİŞ DÖNEM: ${prevStats.balance} TL Bakiye, %${prevStats.savingsRate} Tasarruf.` : "";

    const systemPrompt = `Sen "Nova", kullanıcının finansal asistanısın. Kullanıcı: ${userName}.
GÖREV: Finansal verileri analiz et ve SADECE JSON formatında yanıt ver.

ZORUNLU JSON ŞEMASI:
{
  "periodStatus": {
    "summary": "Dönem durumunun 2-3 cümlelik özeti",
    "mood": "positive" | "critical" | "neutral"
  },
  "spendingHabits": {
    "items": ["Tespit 1", "Tespit 2", "Tespit 3", "Tespit 4"]
  },
  "savingsTips": [
    {
      "title": "Öneri başlığı",
      "description": "Detaylı açıklama",
      "targetCategory": "Kategori adı",
      "suggestedCut": 15
    }
  ],
  "novaNote": "Kısa, motive edici kapanış notu"
}

${styleInstruction}
${profileInstruction}

KURAL: Sadece JSON döndür. Markdown, açıklama veya başka metin EKLEME.`;

    const userPrompt = `ANALİZ VERİLERİ:\n${summary}\n${historyContext}\n\nYukarıdaki verilere göre JSON raporu hazırla.`;

    try {
        const textResponse = await callGroq(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            true,
            0.2,
        );

        if (!textResponse) return null;

        const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleanedResponse) as AnalysisReport;
    } catch (error) {
        console.error("Groq Analiz Hatası:", error);
        return null;
    }
};

// ==================== SOHBET FONKSİYONU ====================
export const askFinancialAdvisor = async (
    transactions: Transaction[],
    settings: UserSettings,
    question: string,
    userName: string,
    history: { role: "user" | "ai"; text: string }[] = [],
    style: "short" | "balanced" | "detailed" = "balanced",
    mode: "advisor" | "tutor" = "advisor",
    recurringTransactions: RecurringTransaction[] = [],
): Promise<string> => {
    const summary = summarizeContext(transactions, settings, userName, recurringTransactions);
    const styleInstruction = getStyleInstruction(style);
    const profileInstruction = getProfileInstructions(settings);

    const roleDefinition = mode === "tutor" ? `MOD: FİNANS EĞİTMENİ. 5 yaşındaki çocuğa anlatır gibi basit metaforlar kullan. Konuyu kullanıcının MEVCUT VERİLERİNE bağla.` : `MOD: FİNANSAL DANIŞMAN. Samimi, net, çözüm odaklı, hafif esprili tarz.`;

    const historyMessages = history.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
    }));

    const systemPrompt = `${roleDefinition}
${styleInstruction}
${profileInstruction}
BAĞLAM: ${summary}
KURAL: Markdown formatında cevap ver. Kullanıcı zamirleri ("bunu", "şunu") önceki mesajlardan çıkar.`;

    try {
        const response = await callGroq([{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: question }], false, 0.7);

        return response || "Cevap oluşturulamadı.";
    } catch (error) {
        console.error("Groq Sohbet Hatası:", error);
        return "Bağlantı hatası oluştu. Lütfen tekrar deneyin.";
    }
};
