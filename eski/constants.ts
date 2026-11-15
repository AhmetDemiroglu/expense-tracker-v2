import { Category } from "./types";

export const INCOME_CATEGORIES = [Category.MAAS, Category.FREELANCE, Category.YATIRIM_GELIRI, Category.KIRA_GELIRI, Category.DIGER_GELIR];

export const EXPENSE_CATEGORIES = [
    // Temel
    Category.MARKET,
    Category.YEME_ICME,
    Category.ULASIM_TOPLU,
    Category.ULASIM_ARAC,
    Category.KIRA_AIDAT,
    Category.FATURA,
    // Yaşam
    Category.GIYIM,
    Category.KOZMETIK,
    Category.SAGLIK,
    Category.SPOR,
    Category.KUAFOR,
    // Ev
    Category.EV_ESYASI,
    Category.BAKIM_ONARIM,
    Category.EGITIM,
    Category.COCUK,
    // Keyif
    Category.TEKNOLOJI,
    Category.ABONELIK,
    Category.EGLENCE,
    Category.TATIL,
    // Finansal
    Category.KREDI_KARTI,
    Category.BORC_ODEME,
    Category.VERGI,
    Category.DIGER_GIDER,
];

export const COLORS = {
    income: "#10b981",
    expense: "#ef4444",
    primary: "#6366f1",
    background: "#1e293b",
    text: "#f1f5f9",
};

export const PIE_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

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
