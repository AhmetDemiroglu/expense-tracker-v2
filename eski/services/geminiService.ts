import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, UserSettings, CycleSummary, AnalysisReport, RecurringTransaction } from "../types";
import { FINANCIAL_GOALS, SAVINGS_STYLES, RISK_TOLERANCE } from "../constants";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

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

const summarizeContext = (transactions: Transaction[], settings: UserSettings, userName: string, recurringTransactions: RecurringTransaction[] = []) => {
    const start = startOfDay(parseISO(settings.periodStartDate));
    const end = endOfDay(parseISO(settings.periodEndDate));
    const now = new Date();

    const activeSubs = recurringTransactions.filter((sub) => sub.isActive && sub.type === "expense");
    const subTotal = activeSubs.reduce((acc, sub) => acc + sub.amount, 0);
    const subList = activeSubs.map((s) => `- ${s.description}: ${s.amount} TL (${s.frequency})`).join("\n");

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const filterEndDate = new Date(end);
    filterEndDate.setHours(23, 59, 59, 999);

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
        .map((t) => `${t.date}: ${t.category} (${t.amount} TL) - Açıklama: ${t.description}`)
        .join("\n");

    return `
    KULLANICI PROFİLİ:
    - İsim: ${userName}
    - HİTAP KURALI: Resmiyet yasak. Samimi, arkadaş canlısı ol. Kullanıcıya ${userName} ile hitap edebilirsin. Canımlı cicimli aşırı samimiyete gerek yok, ${userName} ile doğrudan hitap yeterli.
    
    AKTİF DÖNEM ANALİZİ (DİKKAT: Sadece bu aralıktaki verileri görüyorsun):
    - Dönem: ${settings.periodName} (${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString("tr-TR")})
    - Kalan Süre: ${daysRemaining > 0 ? daysRemaining + " gün" : "Dönem bitti"}
    
    FİNANSAL DURUM (Sadece Bu Dönem):
    - Sabit Gelir (Maaş vb.): ${settings.monthlyIncome.toLocaleString("tr-TR")} TL
    - Eklenen Ek Gelirler: ${txIncome.toLocaleString("tr-TR")} TL
    - TOPLAM GELİR: ${totalIncome.toLocaleString("tr-TR")} TL
    
    - Kesinleşmiş (Borç, taksit veya o aya özel çıkacağı kesin olan tek seferlik) Giderler: ${settings.fixedExpenses.toLocaleString("tr-TR")} TL
    - Abonelikler & Düzenli Ödemeler: ${subTotal.toLocaleString("tr-TR")} TL
    - Yapılan Harcamalar: ${txExpense.toLocaleString("tr-TR")} TL
    - TOPLAM GİDER: ${(totalExpense + subTotal).toLocaleString("tr-TR")} TL
    
    - NET KALAN BAKİYE: ${(balance - subTotal).toLocaleString("tr-TR")} TL (Eksiye düştüyse uyar)

    ABONELİKLER VE DÜZENLİ ÖDEMELER (Gelecek Yükümlülükler):
    ${subList || "Yok"}

    HARCAMA DETAYLARI (Gerçekleşen):
    - En Yüksek Kategoriler:
    ${topCategories}
    
    - Son İşlemler (Marka/Yer Analizi İçin):
    ${lastTransactions}
  `;
};

export const analyzeFinances = async (transactions: Transaction[], settings: UserSettings, userName: string, style: "short" | "balanced" | "detailed" = "balanced", prevStats: CycleSummary | null = null, recurringTransactions: RecurringTransaction[] = []): Promise<AnalysisReport | null> => {
    const summary = summarizeContext(transactions, settings, userName, recurringTransactions);
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
    history: { role: "user" | "ai"; text: string }[] = [],
    style: "short" | "balanced" | "detailed" = "balanced",
    mode: "advisor" | "tutor" = "advisor",
    recurringTransactions: RecurringTransaction[] = [],
): Promise<string> => {
    const summary = summarizeContext(transactions, settings, userName, recurringTransactions);
    const styleInstruction = getStyleInstruction(style);
    const profileInstruction = getProfileInstructions(settings);

    let roleDefinition = "";
    if (mode === "tutor") {
        roleDefinition = `
        MOD: FİNANS EĞİTMENİ (TUTOR MODE) 🎓
        Sen bir Finans Profesörüsün ama 5 yaşındaki bir çocuğa anlatır gibi basit ve metaforlarla konuşuyorsun.
        
        GÖREVLERİN:
        1. Kullanıcının sorduğu finansal terimi veya konuyu (Örn: Enflasyon, Bileşik Faiz, Borsa) en basit haliyle açıkla.
        2. Mutlaka günlük hayattan bir benzetme/metafor kullan.
        3. EN ÖNEMLİSİ: Konuyu anlattıktan sonra, kullanıcının MEVCUT VERİLERİNE bağla. 
           (Örn: "Enflasyon canavarı parayı yer, senin de geçen ay Market harcaman artmış, bu yüzden...")
        `;
    } else {
        roleDefinition = `
        MOD: FİNANSAL DANIŞMAN (ADVISOR MODE) 💼
        Sen Nova. Kullanıcının finansal yol arkadaşısın. Tarzın: Samimi, net, çözüm odaklı ve hafif esprili.
        `;
    }

    const recentHistory = history.map((msg) => `${msg.role === "user" ? "KULLANICI" : "NOVA"}: ${msg.text}`).join("\n");

    const prompt = `
    ${roleDefinition}
    
    ${styleInstruction}
    ${profileInstruction}

    BAĞLAM (Kullanıcının Verileri):
    ${summary}

    ÖNCEKİ KONUŞMALAR (Hafıza):
    ${recentHistory}

    KULLANICININ YENİ SORUSU:
    "${question}"

    KURALLAR:
    1. Cevabı Markdown olarak ver.
    2. Önceki konuşmalara referans verebilirsin (Örn: "Az önce bahsettiğim gibi...").
    3. Kullanıcı zamir kullanırsa (Örn: "O ne demek?", "Bunu nasıl yaparım?") önceki konuşmadan bağlamı çıkar.
  `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        return response.text || "Cevap oluşturulamadı.";
    } catch (error) {
        console.error(error);
        return "Bağlantıda sorun oluştu.";
    }
};

const receiptSchema = {
    type: Type.OBJECT,
    properties: {
        amount: {
            type: Type.NUMBER,
            description: "Fişin genel toplam tutarı.",
        },
        date: {
            type: Type.STRING,
            description: "Fiş tarihi (YYYY-MM-DD formatında).",
        },
        description: {
            type: Type.STRING,
            description: "Satıcının adı veya kısa işlem açıklaması.",
        },
        category: {
            type: Type.STRING,
            description: "Harcamanın kategorisi (Gıda, Ulaşım, Giyim, Sağlık, Eğlence, Fatura vb.).",
        },
    },
    required: ["amount", "description", "category"],
} as const;

const convertPdfToImage = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            await page.render(renderContext as any).promise;
            return canvas.toDataURL("image/jpeg", 0.8);
        }
        throw new Error("Canvas context oluşturulamadı.");
    } catch (error) {
        console.error("PDF -> Resim Çevrim Hatası (Detaylı):", error);
        throw error;
    }
};

export const processReceiptFile = async (file: File): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    try {
        let base64Image = "";

        if (file.type === "application/pdf") {
            base64Image = await convertPdfToImage(file);
        } else if (file.type.startsWith("image/")) {
            base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });
        } else {
            throw new Error("Desteklenmeyen dosya formatı.");
        }
        return await parseReceipt(base64Image);
    } catch (error) {
        console.error("Dosya işleme hatası:", error);
        return null;
    }
};

export const parseReceipt = async (base64Image: string): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    let mimeType = "image/jpeg";
    let dataPart = base64Image;

    if (base64Image.startsWith("data:")) {
        const [meta, data] = base64Image.split(",");
        const match = meta.match(/data:(.*?);base64/);
        if (match?.[1]) mimeType = match[1];
        dataPart = data;
    }

    const prompt = `
        GÖREV: Bu görsel bir alışveriş fişi veya hizmet faturasıdır. Görseli analiz et ve aşağıdaki JSON şemasına uygun veriyi çıkar.

        KURALLAR:
        1. Tutar (amount): 
        - Belgedeki "Total", "Genel Toplam", "Ödenecek Tutar" veya "Grand Total" değerini bul.
        - "TRY", "TL", "$", "€" gibi para birimi simgelerini VE harfleri temizle. SADECE sayı döndür.
        - Ondalık ayracı olarak nokta (.) kullan.
        
        2. Tarih (date): 
        - "November 20, 2025", "20.11.2025" gibi formatları algıla.
        - Mutlaka "YYYY-MM-DD" formatına çevir.
        - Tarih yoksa bugünün tarihini kullan.

        3. Açıklama (description):
        - DİKKAT: Görselde birden fazla marka olabilir (Örn: Ürün etiketi vs.). Sen sadece FİŞİ KESEN KURUMU bul.
        - Genelde "A.Ş.", "LTD. ŞTİ.", "Mağazacılık" gibi ibareler içeren veya belgenin EN ÜSTÜNDE ORTADA yer alan ismi al.
        - Örn: "BİM Birleşik Mağazalar", "Migros", "Shell".
        - Asla ürün markasını (Örn: Coca Cola, AC&Co) satıcı olarak yazma.

        4. Kategori (category):
        - Harcamanın türüne göre şu kategorilerden birini seç: "Gıda & Market", "Yeme & İçme", "Ulaşım", "Giyim", "Ev & Yaşam", "Teknoloji", "Eğlence", "Sağlık", "Eğitim", "Faturalar", "Diğer".
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: dataPart } }],
                },
            ],
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: receiptSchema,
            },
        });

        const textResponse = response.text;

        if (!textResponse) return null;
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Fiş okuma hatası (API):", error);
        return null;
    }
};
