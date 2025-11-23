import { Category } from "./types";

export const INCOME_CATEGORIES = [Category.MAAS, Category.FREELANCE, Category.YATIRIM, Category.DIGER_GELIR];

export const EXPENSE_CATEGORIES = [
    Category.GIDA,
    Category.ULASIM,
    Category.KONUT,
    Category.FATURA,
    Category.SAGLIK,
    Category.EGITIM,
    Category.EGLENCE,
    Category.GIYIM,
    Category.TEKNOLOJI,
    Category.DIGER_GIDER,
];

export const COLORS = {
    income: "#10b981", // emerald-500
    expense: "#ef4444", // red-500
    primary: "#6366f1", // indigo-500
    background: "#1e293b", // slate-800
    text: "#f1f5f9", // slate-100
};

export const PIE_COLORS = [
    "#6366f1", // indigo
    "#ec4899", // pink
    "#10b981", // emerald
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ef4444", // red
    "#14b8a6", // teal
];

export const FINANCIAL_GOALS = [
    { value: "debt_reduction", label: "Borç Kapatma", prompt: "Önceliğin borçları eritmek. Agresif tasarruf ve borç kapama stratejilerine odaklan." },
    { value: "savings", label: "Birikim Yapma (Ev/Araba)", prompt: "Önceliğin nakit biriktirmek. Gereksiz harcamaları kısmaya ve kenara para atmaya odaklan." },
    { value: "investment", label: "Yatırım & Büyüme", prompt: "Önceliğin varlıkları büyütmek. Yatırım fırsatları ve parayı değerlendirme yollarına odaklan." },
    { value: "stability", label: "Finansal Denge", prompt: "Önceliğin ayı rahat çıkarmak. Sürdürülebilir, stressiz bir bütçe yönetimine odaklan." },
] as const;

export const SAVINGS_STYLES = [
    { value: "strict", label: "Sıkı Yönetim (Askeri Disiplin)", prompt: "Tavsiyelerinde çok net ve katı ol. Lüks harcamalara sıfır tolerans göster." },
    { value: "balanced", label: "Dengeli & Sürdürülebilir", prompt: "Gerçekçi tavsiyeler ver. Yaşam kalitesini çok düşürmeden tasarruf öner." },
    { value: "relaxed", label: "Rahat & Esnek", prompt: "Kullanıcıyı çok sıkma. Yumuşak uyarılar ve kolay uygulanabilir küçük değişiklikler öner." },
] as const;

export const RISK_TOLERANCE = [
    { value: "low", label: "Düşük (Garanti)", prompt: "Riskten kaçın. Mevduat, altın gibi güvenli liman mantığıyla konuş." },
    { value: "medium", label: "Orta (Dengeli)", prompt: "Dengeli portföy mantığıyla yaklaş." },
    { value: "high", label: "Yüksek (Büyüme Odaklı)", prompt: "Büyüme odaklı, fırsatları değerlendiren bir dille konuş." },
] as const;
