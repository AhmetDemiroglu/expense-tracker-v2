export type TransactionType = "income" | "expense";

export enum Category {
    // GELİR KALEMLERİ
    MAAS = "Maaş",
    FREELANCE = "Freelance / Ek İş",
    YATIRIM_GELIRI = "Yatırım Geliri",
    KIRA_GELIRI = "Kira Geliri",
    DIGER_GELIR = "Diğer Gelir",

    // GİDER KALEMLERİ - TEMEL
    MARKET = "Market & Pazar",
    YEME_ICME = "Yeme & İçme (Restoran vb.)",
    ULASIM_TOPLU = "Toplu Taşıma",
    ULASIM_ARAC = "Araç & Yakıt",
    KIRA_AIDAT = "Kira & Aidat",
    FATURA = "Faturalar",

    // GİDER KALEMLERİ - YAŞAM & KİŞİSEL
    GIYIM = "Giyim & Aksesuar",
    KOZMETIK = "Kozmetik & Bakım",
    SAGLIK = "Sağlık & İlaç",
    SPOR = "Spor & Üyelik",
    KUAFOR = "Kuaför & Berber",

    // GİDER KALEMLERİ - EV & AİLE
    EV_ESYASI = "Ev Eşyası & Dekorasyon",
    BAKIM_ONARIM = "Tamirat & Tadilat",
    EGITIM = "Eğitim & Kitap",
    COCUK = "Çocuk & Bebek",

    // GİDER KALEMLERİ - KEYİF & TEKNOLOJİ
    TEKNOLOJI = "Teknoloji & Elektronik",
    ABONELIK = "Abonelikler",
    EGLENCE = "Eğlence & Hobi",
    TATIL = "Tatil & Seyahat",

    // FİNANSAL
    KREDI_KARTI = "Kredi Kartı Ödemesi",
    BORC_ODEME = "Borç / Kredi Ödemesi",
    VERGI = "Vergi & Harçlar",
    DIGER_GIDER = "Diğer Gider",
}

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export interface RecurringTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    category: Category | string;
    amount: number;
    description: string;
    frequency: RecurrenceFrequency;
    startDate: string;
    nextDueDate: string;
    isActive: boolean;
    lastProcessedDate?: string;
}
export interface Transaction {
    id: string;
    userId: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: Category | string;
    date: string;
    createdAt: number;
}

export interface BudgetPeriod {
    id: string;
    userId: string;
    name: string;
    startDate: string;
    endDate: string;
    monthlyIncome: number;
    fixedExpenses: number;
    isActive?: boolean;
}

export interface UserSettings {
    userId: string;
    periodName?: string;
    periodStartDate: string;
    periodEndDate: string;
    monthlyIncome: number;
    fixedExpenses: number;
    currency: string;
    financialGoal?: "debt_reduction" | "savings" | "investment" | "stability";
    savingsStyle?: "strict" | "balanced" | "relaxed";
    riskTolerance?: "low" | "medium" | "high";
}

export interface DailyStatus {
    date: string;
    limit: number;
    spent: number;
    status: "success" | "warning" | "danger" | "neutral";
    remainingInCycle: number;
}

export interface DashboardStats {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    dailyLimit: number;
    daysRemaining: number;
    cycleStartDate: string;
    cycleEndDate: string;
}

export interface CycleSummary {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
}

export interface AnalysisReport {
    periodStatus: {
        summary: string;
        mood: "positive" | "critical" | "neutral";
    };
    spendingHabits: {
        items: string[];
    };
    savingsTips: {
        title: string;
        description: string;
        targetCategory?: string;
        suggestedCut?: number;
    }[];
    novaNote: string;
}
