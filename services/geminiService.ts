import { GoogleGenAI } from "@google/genai";
import { Transaction, UserSettings } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY tanımlı değil. .env dosyanı kontrol et.");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.5-flash";

// Yardımcı: İşlemleri ve DÖNEM BİLGİSİNİ özetle
const summarizeContext = (transactions: Transaction[], settings: UserSettings, userName: string) => {
    // 1. Dönem Hesaplamaları
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

export const analyzeFinances = async (transactions: Transaction[], settings: UserSettings, userName: string): Promise<string> => {
    const summary = summarizeContext(transactions, settings, userName);

    const prompt = `
    Sen "Nova" adında, kullanıcının (adı: ${userName}) en yakın finansal dostusun.
    Rolün: Samimi, esprili ama yeri geldiğinde net uyarılar yapan, lafı dolandırmayan bir finans koçu.
    Asla robotik veya aşırı resmi konuşma. "Bey/Hanım" gibi ekler kullanma.

    KULLANICI VERİLERİ:
    ${summary}

    GÖREV:
    Aşağıdaki başlıklarda, Markdown formatında kısa ve çarpıcı bir rapor hazırla.
    Her madde kısa, net ve eyleme dönük olmalı. Uzun paragraflardan kaçın.

    ### 📊 Dönem Durumu
    - Mevcut durumu (kalan gün vs bakiye dengesi) 2-3 cümleyle özetle.
    - Durum kritikse 🚨, iyiyse ⭐ emojisiyle başla.

    ### 💸 Harcama Alışkanlıkları
    - En çok harcanan kategorileri yorumla.
    - "Gereksiz" veya "Dikkat çekici" gördüğün bir detay varsa samimiyetle uyar.
    - Maksimum 4 madde.

    ### 💡 Tasarruf Önerileri
    - Genel geçer değil, BU harcamalara özel, somut 2 veya 3 öneri ver.
    - Örnek: "Dışarıda yemeği azalt" yerine "Restoran harcaması X TL olmuş, haftada bir evde yiyerek Y TL cepte kalır" gibi.

    ### 🎯 Nova'nın Notu
    - Motive edici, kısa bir kapanış cümlesi veya günün finansal mottosu.
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

export const askFinancialAdvisor = async (transactions: Transaction[], settings: UserSettings, question: string, userName: string): Promise<string> => {
    const summary = summarizeContext(transactions, settings, userName);

    const prompt = `
    Sen Nova. Kullanıcının (Adı: ${userName}) finansal yol arkadaşısın.
    Tarzın: Samimi, net, çözüm odaklı ve hafif esprili.

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
