import { GoogleGenAI } from "@google/genai";
import { Transaction, UserSettings } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY tanımlı değil. .env dosyanı kontrol et.");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.0-flash";

// Yardımcı: İşlemleri ve DÖNEM BİLGİSİNİ özetle
const summarizeContext = (transactions: Transaction[], settings: UserSettings) => {
    // 1. Dönem Hesaplamaları
    const start = new Date(settings.periodStartDate);
    const end = new Date(settings.periodEndDate);
    const now = new Date();

    // Kalan gün
    const diffTime = Math.abs(end.getTime() - now.getTime());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Bakiye Durumu
    const txIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const txExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

    const totalIncome = txIncome + settings.monthlyIncome;
    const totalExpense = txExpense + settings.fixedExpenses;
    const balance = totalIncome - totalExpense;

    // 2. İşlem Detayları
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

export const analyzeFinances = async (transactions: Transaction[], settings: UserSettings): Promise<string> => {
    const summary = summarizeContext(transactions, settings);

    const prompt = `
    Sen "Nova" adında, arkadaş canlısı, samimi ve uzman bir finans asistanısın.
    Aşağıdaki finansal özeti analiz et ve kullanıcıya doğrudan hitap ederek (Sen diliyle) Türkçe bir rapor sun.
    
    KULLANICI VERİLERİ:
    ${summary}

    Lütfen cevabını şu Markdown formatında ve başlıklarda ver:

    ### 📊 Dönem Durumu
    (Kullanıcının aktif dönemindeki durumunu, kalan gününü ve bakiyesini yorumla.)

    ### 💸 Harcama Alışkanlıkları
    (En çok para harcanan yerleri yorumla.)

    ### 💡 Tasarruf Önerileri
    (Bu profile özel 2-3 somut öneri.)

    ### 🎯 Nova'nın Notu
    (Motive edici bir kapanış.)
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { temperature: 0.7 },
        });
        return response.text || "Analiz oluşturulamadı.";
    } catch (error) {
        console.error("Gemini AI Hatası:", error);
        return "Analiz servisine şu an ulaşılamıyor.";
    }
};

export const askFinancialAdvisor = async (transactions: Transaction[], settings: UserSettings, question: string): Promise<string> => {
    const summary = summarizeContext(transactions, settings);

    const prompt = `
    Sen Nova. Kullanıcının samimi finans asistanısın.
    
    BAĞLAM (Kullanıcının Aktif Dönemi ve Verileri):
    ${summary}

    KULLANICININ SORUSU:
    "${question}"

    GÖREV:
    Kullanıcının sorusuna cevap ver.
    1. "Hangi dönemdeyim?", "Durumum ne?", "Ne kadar kaldı?" gibi sorulara yukarıdaki "AKTİF DÖNEM BİLGİLERİ"nden net cevap ver.
    2. Finans dışı sorularda samimi bir arkadaş gibi sohbet et.
    
    Cevabı Markdown formatında ver.
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
