import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const GLM_API_KEY = import.meta.env.VITE_GLM_API_KEY as string;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

const GLM_URL = "https://api.z.ai/api/paas/v4/layout_parsing";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ==================== PDF TO IMAGE ====================
const convertPdfToBase64Image = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Canvas oluşturulamadı");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport,
        canvas,
    }).promise;

    return canvas.toDataURL("image/jpeg", 0.8);
};

// ==================== FILE TO BASE64 ====================
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// ==================== GLM-OCR API (Raw Text) ====================
const callGlmOcr = async (base64Data: string): Promise<string> => {
    const response = await fetch(GLM_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GLM_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "glm-ocr",
            file: base64Data,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("GLM-OCR API Hatası:", errorData);
        throw new Error(`GLM-OCR API Hatası: ${response.status}`);
    }

    const data = await response.json();
    console.log("GLM-OCR Raw Response:", data);

    const content = data.data?.content || data.result || data.text || JSON.stringify(data);
    return content;
};

// ==================== GROQ PARSER (Text → Structured JSON) ====================
const parseWithGroq = async (ocrText: string): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    const prompt = `Aşağıdaki OCR metni bir alışveriş fişi veya faturasından çıkarılmıştır. Bu metni analiz et ve JSON formatında döndür.

OCR METNİ:
${ocrText}

ZORUNLU JSON FORMATI (sadece bu formatı döndür, başka bir şey yazma):
{
  "amount": 123.45,
  "date": "2025-02-05",
  "description": "Mağaza/Satıcı Adı",
  "category": "Kategori"
}

KURALLAR:
1. amount: Toplam/Total/Genel Toplam tutarını bul. Sadece sayı yaz (TL, ₺ gibi sembolleri kaldır). Türk formatı (1.234,56) ise 1234.56 yap.
2. date: Tarihi YYYY-MM-DD formatında yaz. Bulamazsan bugünün tarihini kullan.
3. description: Fişi KESEN kurumun adını yaz (ürün markası değil). Örn: "BİM", "Migros", "Shell"
4. category: Şu kategorilerden BİRİNİ AYNEN yaz (başka bir şey yazma):
   - "Market & Pazar"
   - "Yeme & İçme (Restoran vb.)"
   - "Toplu Taşıma"
   - "Araç & Yakıt"
   - "Kira & Aidat"
   - "Faturalar"
   - "Giyim & Aksesuar"
   - "Kozmetik & Bakım"
   - "Sağlık & İlaç"
   - "Spor & Üyelik"
   - "Ev Eşyası & Dekorasyon"
   - "Eğitim & Kitap"
   - "Teknoloji & Elektronik"
   - "Abonelikler"
   - "Eğlence & Hobi"
   - "Tatil & Seyahat"
   - "Kredi Kartı Ödemesi"
   - "Vergi & Harçlar"
   - "Diğer Gider"

SADECE JSON DÖNDÜR, BAŞKA HİÇBİR ŞEY YAZMA.`;

    try {
        const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.1,
                max_tokens: 256,
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq API Hatası: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content || "";
        const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();

        console.log("Groq Parsed Result:", cleaned); // Debug için

        const result = JSON.parse(cleaned);

        if (!result.amount || result.amount <= 0) return null;

        return {
            amount: Number(result.amount),
            date: result.date,
            description: result.description || "Bilinmeyen",
            category: result.category || "Diğer",
        };
    } catch (error) {
        console.error("Groq Parse Hatası:", error);
        return null;
    }
};

// ==================== MAIN EXPORT ====================
export const processReceiptFile = async (file: File): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    try {
        let base64Data: string;

        if (file.type === "application/pdf") {
            base64Data = await convertPdfToBase64Image(file);
        } else if (file.type.startsWith("image/")) {
            base64Data = await fileToBase64(file);
        } else {
            throw new Error("Desteklenmeyen dosya formatı.");
        }

        const ocrText = await callGlmOcr(base64Data);

        if (!ocrText || ocrText.length < 10) {
            console.error("OCR boş veya çok kısa metin döndü");
            return null;
        }

        return await parseWithGroq(ocrText);
    } catch (error) {
        console.error("Fiş işleme hatası:", error);
        return null;
    }
};

// ==================== DIRECT BASE64 (for cameraService) ====================
export const parseReceipt = async (base64Image: string): Promise<{ amount: number; date?: string; description: string; category: string } | null> => {
    try {
        const ocrText = await callGlmOcr(base64Image);
        if (!ocrText || ocrText.length < 10) return null;
        return await parseWithGroq(ocrText);
    } catch (error) {
        console.error("Fiş okuma hatası:", error);
        return null;
    }
};
