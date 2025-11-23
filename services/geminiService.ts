import { GoogleGenAI } from "@google/genai";
import { Transaction, UserSettings, CycleSummary, AnalysisReport } from "../types";
import { FINANCIAL_GOALS, SAVINGS_STYLES, RISK_TOLERANCE } from "../constants";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY tanımlı değil. .env dosyanı kontrol et.");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.5-flash";

const analysisSchema = {
    type: "OBJECT",
    properties: {
        periodStatus: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING", description: "Dönem durumunun 2-3 cümlelik özeti." },
                mood: { type: "STRING", enum: ["positive", "critical", "neutral"], description: "Durumun genel havası." },
            },
            required: ["summary", "mood"],
        },
        spendingHabits: {
            type: "OBJECT",
            properties: {
                items: { type: "ARRAY", items: { type: "STRING" }, description: "Harcama alışkanlıkları ile ilgili en fazla 4 tespit." },
            },
            required: ["items"],
        },
        savingsTips: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING", description: "Önerinin kısa başlığı (Örn: Kahve Molası)." },
                    description: { type: "STRING", description: "Önerinin detaylı açıklaması." },
                    targetCategory: { type: "STRING", description: "Bu öneri hangi harcama kategorisiyle ilgili? (Kullanıcının veri setindeki kategori ismini kullanmaya çalış)." },
                    suggestedCut: { type: "NUMBER", description: "Bu harcamada yüzde kaç kısıntı öneriyorsun? (Örn: 15 için 15 yaz)." },
                },
                required: ["title", "description"],
            },
            description: "Bu verilere özel somut 2-3 tasarruf önerisi.",
        },
        novaNote: { type: "STRING", description: "Kısa, motive edici kapanış notu." },
    },
    required: ["periodStatus", "spendingHabits", "savingsTips", "novaNote"],
};

const getStyleInstruction = (style: "short" | "balanced" | "detailed") => {
    switch (style) {
        case "short":
            return "CEVAP STİLİ: Çok kısa, net ve öz ol. Maksimum 3-5 cümle kullan. Detaylara boğma.";
        case "detailed":
            return "CEVAP STİLİ: Detaylı, eğitici ve kapsamlı ol. Konuyu neden-sonuç ilişkisiyle ele al.";
        case "balanced":
        default:
            return "CEVAP STİLİ: Dengeli ol. Ne çok kısa ne çok uzun, tam kararında ve anlaşılır açıkla.";
    }
};

const getProfileInstructions = (settings: UserSettings) => {
    const goal = FINANCIAL_GOALS.find((g) => g.value === settings.financialGoal)?.prompt || "";
    const style = SAVINGS_STYLES.find((s) => s.value === settings.savingsStyle)?.prompt || "";
    const risk = RISK_TOLERANCE.find((r) => r.value === settings.riskTolerance)?.prompt || "";

    return `
    KİŞİSELLEŞTİRİLMİŞ DAVRANIŞ KURALLARI (BUNLARA KESİN UY):
    1. HEDEF ODAĞI: ${goal}
    2. ÜSLUP/TARZ: ${style}
    3. RİSK YAKLAŞIMI: ${risk}
    `;
};

const summarizeContext = (transactions: Transaction[], settings: UserSettings, userName: string) => {
    const start = new Date(settings.periodStartDate);
    const end = new Date(settings.periodEndDate);
    const now = new Date();

    const diffTime = Math.abs(end.getTime() - now.getTime());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const txIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const txExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

    const totalIncome = txIncome + settings.monthlyIncome;
    const totalExpense = txExpense + settings.fixedExpenses;
    const balance = totalIncome - totalExpense;

    const expenses = transactions.filter((t) => t.type === "expense");
    const categories: Record<string, number> = {};
    expenses.forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => `- ${name}: ${amount.toLocaleString("tr-TR")} TL`)
        .join("\n");

    const lastTransactions = transactions
        .slice(0, 5)
        .map((t) => `${t.date}: ${t.category} (${t.amount} TL) - ${t.description}`)
        .join("\n");

    return `
    KULLANICI PROFİLİ:
    - İsim: ${userName}
    - HİTAP KURALI: Kullanıcıya ASLA "Bey", "Hanım" veya "Sayın" diye hitap etme. Sadece ismiyle hitap et.
    - TON: Çok samimi, esprili ve yakın bir arkadaş gibi konuş. Resmiyet kesinlikle yasak.
    
    AKTİF DÖNEM BİLGİLERİ (Kullanıcının Bütçe Çerçevesi):
    - Dönem Adı: ${settings.periodName}
    - Tarih Aralığı: ${settings.periodStartDate} ile ${settings.periodEndDate} arasında.
    - Dönem Bitişine Kalan Süre: ${daysRemaining} Gün (Bugün: ${now.toLocaleDateString("tr-TR")})
    - Sabit Gelir (Maaş vb.): ${settings.monthlyIncome.toLocaleString("tr-TR")} TL
    - Sabit Giderler (Kira, fatura vb.): ${settings.fixedExpenses.toLocaleString("tr-TR")} TL
    
    FİNANSAL DURUM (Sabitler + İşlemler Dahil):
    - Toplam Gelir: ${totalIncome.toLocaleString("tr-TR")} TL
    - Toplam Gider: ${totalExpense.toLocaleString("tr-TR")} TL
    - NET BAKİYE (Cepte Kalan): ${balance.toLocaleString("tr-TR")} TL
    
    HARCAMA DETAYLARI:
    - En Çok Harcanan Kategoriler:
    ${topCategories}
    - Son İşlemler:
    ${lastTransactions}
  `;
};

export const analyzeFinances = async (
    transactions: Transaction[],
    settings: UserSettings,
    userName: string,
    style: "short" | "balanced" | "detailed" = "balanced",
    prevStats: CycleSummary | null = null
): Promise<AnalysisReport | null> => {
    const summary = summarizeContext(transactions, settings, userName);
    const styleInstruction = getStyleInstruction(style);
    const profileInstruction = getProfileInstructions(settings);

    let historyContext = "";
    if (prevStats) {
        historyContext = `GEÇMİŞ DÖNEM: ${prevStats.balance} TL Bakiye, %${prevStats.savingsRate} Tasarruf. Kıyasla.`;
    }

    const prompt = `
    Sen "Nova". Kullanıcı: ${userName}.
    GÖREV: Verilen finansal verileri analiz et ve JSON formatında raporla.
    
    ${styleInstruction}
    ${profileInstruction}

    VERİLER:
    ${summary}
    ${historyContext}
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });

        const textResponse = response.text || null;
        if (!textResponse) return null;
        return JSON.parse(textResponse) as AnalysisReport;
    } catch (error) {
        console.error("Gemini AI Hatası:", error);
        return null;
    }
};

export const askFinancialAdvisor = async (
    transactions: Transaction[],
    settings: UserSettings,
    question: string,
    userName: string,
    style: "short" | "balanced" | "detailed" = "balanced"
): Promise<string> => {
    const summary = summarizeContext(transactions, settings, userName);
    const styleInstruction = getStyleInstruction(style);
    const profileInstruction = getProfileInstructions(settings);

    const prompt = `
    Sen Nova. Kullanıcının (Adı: ${userName}) finansal yol arkadaşısın.
    Tarzın: Samimi, net, çözüm odaklı ve hafif esprili.
    
    ${styleInstruction}
    ${profileInstruction}

    BAĞLAM (Kullanıcının Verileri):
    ${summary}

    KULLANICININ SORUSU:
    "${question}"

    KURALLAR:
    1. Veri Soruları: "Ne kadar kaldı?", "Durumum ne?" gibi sorularda, yukarıdaki verileri kullanarak KESİN rakamlarla konuş. Yuvarlama yapma.
    2. Tavsiye Soruları: Kısa, uygulanabilir ve motive edici cevaplar ver.
    3. Finans Dışı: "Ben sadece finansal konulara bakıyorum ama senin için bir istisna yapabilirim..." gibi esprili bir dille konuyu finansa bağlamaya çalış veya kısa kes.
    4. Format: Cevabı Markdown olarak ver. Önemli yerleri **kalın** yaz.
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text || "Cevap oluşturulamadı.";
    } catch (error) {
        console.error(error);
        return "Bağlantıda sorun oluştu.";
    }
};

const receiptSchema = {
    type: "OBJECT",
    properties: {
        amount: { type: "NUMBER", description: "Fişin genel toplam tutarı." },
        date: { type: "STRING", description: "Fiş tarihi (YYYY-MM-DD formatında)." },
        description: { type: "STRING", description: "Satıcının adı veya kısa işlem açıklaması." },
        category: { type: "STRING", description: "Harcamanın kategorisi (Gıda, Ulaşım, Giyim, Sağlık, Eğlence, Fatura vb.)." },
    },
    required: ["amount", "description", "category"],
};

export const parseReceipt = async (base64Image: string): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    const prompt = `
    GÖREV: Bu fiş görselini analiz et ve aşağıdaki bilgileri çıkar.
    1. Tarih: DD-MM-YYYY formatında olmalı. Eğer yıl yoksa mevcut yılı (2025) kullan.
    2. Kategori: Harcamanın türüne göre genel bir kategori belirle (Türkçe).
    3. Tutar: İndirimler düşülmüş ÖDENECEK GENEL TOPLAM.
    4. Açıklama: İşyeri adı.
    `;

    try {
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: receiptSchema,
            },
        });

        const textResponse = response.text || null;
        if (!textResponse) return null;

        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Fiş okuma hatası:", error);
        return null;
    }
};
