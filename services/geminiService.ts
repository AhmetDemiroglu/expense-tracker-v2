import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY tanımlı değil. .env dosyanı kontrol et.");
}

// Senin kütüphanene uygun client kurulumu
const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.0-flash"; // Hız için flash modeli ideal

// Yardımcı: İşlemleri özetle (Token tasarrufu ve daha net context için)
// JSON yığını yerine anlamlı bir özet çıkarıyoruz.
const summarizeTransactions = (transactions: Transaction[]) => {
    if (transactions.length === 0) return "Henüz hiç işlem verisi yok.";

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Kategori bazlı harcama
    const expenses = transactions.filter((t) => t.type === "expense");
    const categories: Record<string, number> = {};
    expenses.forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    // En çok harcama yapılan 5 kategori
    const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => `- ${name}: ${amount.toLocaleString("tr-TR")} TL`)
        .join("\n");

    // Son 5 işlem (Detay sorarsa diye)
    const lastTransactions = transactions
        .slice(0, 5)
        .map((t) => `${t.date}: ${t.category} (${t.amount} TL) - ${t.description}`)
        .join("\n");

    return `
    ÖZET FİNANSAL VERİLER:
    - Toplam Gelir: ${totalIncome.toLocaleString("tr-TR")} TL
    - Toplam Gider: ${totalExpense.toLocaleString("tr-TR")} TL
    - Net Bakiye: ${balance.toLocaleString("tr-TR")} TL
    - En Çok Harcanan Kategoriler:
    ${topCategories}
    - Son İşlemlerden Örnekler:
    ${lastTransactions}
  `;
};

export const analyzeFinances = async (transactions: Transaction[]): Promise<string> => {
    if (transactions.length === 0) {
        return "Henüz analiz edecek veri bulamadım. Birkaç işlem ekledikten sonra tekrar gel!";
    }

    const summary = summarizeTransactions(transactions);

    const prompt = `
    Sen "Nova" adında, arkadaş canlısı, samimi ve uzman bir finans asistanısın.
    Aşağıdaki finansal özeti analiz et ve kullanıcıya doğrudan hitap ederek (Sen diliyle) Türkçe bir rapor sun.
    
    KULLANICI VERİLERİ:
    ${summary}

    Lütfen cevabını şu Markdown formatında ve başlıklarda ver:

    ### 📊 Genel Durum
    (Kullanıcının mali durumunu 1-2 cümleyle özetle. Durum iyiyse tebrik et, kötüyse cesaret ver.)

    ### 💸 Harcama Alışkanlıkları
    (En çok para harcanan yerleri yorumla. Gereksiz görünen bir yoğunluk varsa nazikçe uyar.)

    ### 💡 Tasarruf Önerileri
    (Bu harcama profiline özel, uygulanabilir 2-3 adet somut tasarruf önerisi ver.)

    ### 🎯 Nova'nın Notu
    (Kısa, motive edici bir kapanış cümlesi.)
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
        console.error("Gemini AI Hatası:", error);
        return "Şu an finansal verilerini analiz edemiyorum. Lütfen internet bağlantını kontrol et.";
    }
};

export const askFinancialAdvisor = async (transactions: Transaction[], question: string): Promise<string> => {
    const summary = summarizeTransactions(transactions);

    const prompt = `
    Sen Nova'sın. Kullanıcının samimi finans asistanısın.
    
    BAĞLAM (Kullanıcının Mevcut Durumu):
    ${summary}

    KULLANICININ SORUSU:
    "${question}"

    GÖREV:
    Kullanıcının sorusuna cevap ver.
    1. Eğer soru finansal verilerle ilgiliyse yukarıdaki bağlamı kullanarak net cevaplar ver.
    2. Eğer soru genel sohbet, hal hatır veya finans dışı bir konuysa; bir arkadaş gibi samimi, esprili ve yardımsever bir dille sohbet et. Asla "ben finans asistanıyım buna cevap veremem" deme. Her şeye cevap ver.
    
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
        return "Bağlantıda küçük bir sorun oldu, tekrar dener misin?";
    }
};
