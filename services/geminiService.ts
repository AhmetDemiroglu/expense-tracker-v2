import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY tanımlı değil. .env.local dosyanı kontrol et.");
}

const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-2.5-flash";

export const analyzeFinances = async (transactions: Transaction[]): Promise<string> => {
    if (transactions.length === 0) {
        return "Analiz için yeterli veri yok. Lütfen önce birkaç harcama veya gelir ekleyin.";
    }

    const dataSummary = JSON.stringify(
        transactions.map((t) => ({
            date: t.date,
            type: t.type,
            category: t.category,
            amount: t.amount,
            desc: t.description,
        }))
    );

    const prompt = `
    Sen uzman bir finans danışmanısın. Aşağıdaki JSON formatındaki işlem geçmişini analiz et.
    
    Veri:
    ${dataSummary}

    Lütfen Türkçe olarak aşağıdaki konularda kısa, öz ve maddeler halinde bir analiz yap:
    1. **Genel Durum**: Gelir/Gider dengesi nasıl?
    2. **Harcama Alışkanlıkları**: En çok nereye harcama yapılıyor? (Yüzdesel tahminler yap).
    3. **Tasarruf Önerileri**: Bu kişinin harcama alışkanlıklarına göre nerede tasarruf edebileceğine dair 2-3 somut öneri.
    4. **Uyarılar**: Eğer riskli bir durum varsa (örn: gelir giderden azsa) uyar.

    Cevabı Markdown formatında ver.
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });

        return response.text || "Analiz oluşturulamadı.";
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return "Üzgünüm, şu anda yapay zeka servisine ulaşılamıyor. Lütfen API anahtarınızı kontrol edin veya daha sonra tekrar deneyin.";
    }
};

export const askFinancialAdvisor = async (history: Transaction[], question: string): Promise<string> => {
    const context = JSON.stringify(history.slice(-20)); // Last 20 transactions for context

    const prompt = `
    Aşağıda kullanıcının son finansal işlemleri bulunmaktadır:
    ${context}

    Kullanıcının sorusu: "${question}"

    Bu verilere dayanarak, bir finans uzmanı gibi samimi ve yardımsever bir dille Türkçe cevap ver.
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text || "Cevap oluşturulamadı.";
    } catch (error) {
        console.error(error);
        return "Bir hata oluştu.";
    }
};
