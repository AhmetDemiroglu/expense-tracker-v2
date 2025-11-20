
export type TransactionType = 'income' | 'expense';

export enum Category {
  // Income
  MAAS = 'Maaş',
  FREELANCE = 'Freelance',
  YATIRIM = 'Yatırım',
  EK_GELIR = 'Ek Gelir',
  DIGER_GELIR = 'Diğer Gelir',
  
  // Expense
  GIDA = 'Gıda & Market',
  ULASIM = 'Ulaşım',
  KONUT = 'Konut & Kira',
  FATURA = 'Faturalar',
  EGLENCE = 'Eğlence',
  SAGLIK = 'Sağlık',
  EGITIM = 'Eğitim',
  GIYIM = 'Giyim',
  TEKNOLOJI = 'Teknoloji',
  KREDI_KARTI = 'Kredi Kartı Borcu',
  DIGER_GIDER = 'Diğer Gider'
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
  name: string; // Dönem Adı (Örn: Kasım Bütçesi)
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  monthlyIncome: number;
  fixedExpenses: number;
  isActive?: boolean;
}

export interface UserSettings {
  userId: string;
  periodName?: string; // Aktif dönemin adı
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string;   // YYYY-MM-DD
  monthlyIncome: number; // Sabit Maaş
  fixedExpenses: number; // Kira, faturalar, krediler toplamı
  currency: string;
}

export interface DailyStatus {
  date: string;
  limit: number; // O gün harcanması gereken maksimum tutar
  spent: number; // O gün harcanan
  status: 'success' | 'warning' | 'danger' | 'neutral'; // Limit durumu
  remainingInCycle: number; // Dönem sonuna kalan bütçe
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  dailyLimit: number; // Bugün için hesaplanan limit
  daysRemaining: number; // Kesim tarihine kalan gün
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
