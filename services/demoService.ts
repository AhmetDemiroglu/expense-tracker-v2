import { v4 as uuidv4 } from "uuid";
import { Transaction, UserSettings, BudgetPeriod } from "../types";

// Tarih oluşturucu yardımcı fonksiyon
const getDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
};

export const seedGuestData = (guestId: string) => {
    const today = new Date();
    const startDate = getDate(15); // 15 gün önce
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

    // 1. AYARLAR (UserSettings Tipiyle Birebir Uyumlu)
    // Düzeltme: 'theme' kaldırıldı. 'financialGoal' vb. eklendi.
    const demoSettings: UserSettings = {
        userId: guestId,
        monthlyIncome: 45000,
        fixedExpenses: 12850,
        periodStartDate: startDate,
        periodEndDate: endDate,
        periodName: "Demo Dönemi",
        currency: "TRY",
        financialGoal: "savings", // Tip tanımında var
        savingsStyle: "balanced", // Tip tanımında var
        riskTolerance: "medium", // Tip tanımında var
    };

    // 2. BÜTÇE DÖNEMİ (BudgetPeriod Tipiyle Birebir Uyumlu)
    // Düzeltme: 'createdAt' kaldırıldı. 'isActive' eklendi.
    const demoPeriod: BudgetPeriod = {
        id: uuidv4(),
        userId: guestId,
        name: "Demo Dönemi",
        startDate: startDate,
        endDate: endDate,
        monthlyIncome: 45000,
        fixedExpenses: 12850,
        isActive: true, // Şu anki aktif dönem olduğunu belirtir
    };

    // 3. İŞLEMLER
    const transactions: Transaction[] = [];

    // Gelir
    transactions.push({
        id: uuidv4(),
        userId: guestId,
        amount: 45000,
        type: "income",
        category: "Maaş",
        description: "Aylık Maaş",
        date: getDate(14),
        createdAt: Date.now(),
    });

    // Giderler
    const expenses = [
        { amt: 12000, cat: "Konut & Kira", desc: "Ev Kirası", day: 14 }, // Kategori isimlerini Enum'a yaklaştırdım
        { amt: 850, cat: "Faturalar", desc: "Elektrik", day: 12 },
        { amt: 1250, cat: "Gıda & Market", desc: "Haftalık Alışveriş", day: 10 },
        { amt: 350, cat: "Ulaşım", desc: "Benzin", day: 8 },
        { amt: 1400, cat: "Eğlence", desc: "Sinema & Yemek", day: 5 },
        { amt: 450, cat: "Giyim", desc: "T-Shirt", day: 2 },
        { amt: 220, cat: "Gıda & Market", desc: "Eksikler", day: 1 },
    ];

    expenses.forEach((exp) => {
        transactions.push({
            id: uuidv4(),
            userId: guestId,
            amount: exp.amt,
            type: "expense",
            category: exp.cat,
            description: exp.desc,
            date: getDate(exp.day),
            createdAt: Date.now(),
        });
    });

    // 4. KAYIT (StorageService anahtarlarıyla uyumlu)
    localStorage.setItem(`settings_${guestId}`, JSON.stringify(demoSettings));
    localStorage.setItem(`periods_${guestId}`, JSON.stringify([demoPeriod]));
    localStorage.setItem(`tx_${guestId}`, JSON.stringify(transactions));

    return true;
};
