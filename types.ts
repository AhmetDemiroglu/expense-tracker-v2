export type TransactionType = "income" | "expense";

export enum Category {
    // Income
    MAAS = "Maaş",
    FREELANCE = "Freelance",
    YATIRIM = "Yatırım",
    EK_GELIR = "Ek Gelir",
    DIGER_GELIR = "Diğer Gelir",

    // Expense
    GIDA = "Gıda & Market",
    ULASIM = "Ulaşım",
    KONUT = "Konut & Kira",
    FATURA = "Faturalar",
    EGLENCE = "Eğlence",
    SAGLIK = "Sağlık",
    EGITIM = "Eğitim",
    GIYIM = "Giyim",
    TEKNOLOJI = "Teknoloji",
    KREDI_KARTI = "Kredi Kartı Borcu",
    DIGER_GIDER = "Diğer Gider",
}

export interface Transaction {
    id: string;
    userId: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: Category | string;
    date: string; // ISO String YYYY-MM-DD
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
