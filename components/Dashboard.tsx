import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Transaction, DashboardStats, BudgetPeriod, UserSettings, RecurringTransaction } from "../types";
import { PIE_COLORS } from "../constants";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { fetchBudgetPeriods } from "../services/storageService";
interface DashboardProps {
    transactions: Transaction[];
    stats: DashboardStats;
    userId: string;
    userSettings: UserSettings;
    recurringTransactions: RecurringTransaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, stats, userId, userSettings, recurringTransactions }) => {
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("active");
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    useEffect(() => {
        const loadPeriods = async () => {
            const list = await fetchBudgetPeriods(userId);
            setPeriods(list);
        };
        if (userId) loadPeriods();
    }, [userId]);

    const selectedRange = useMemo(() => {
        let start: Date;
        let end: Date;
        let label = "";

        if (selectedPeriodId === "active") {
            start = startOfDay(parseISO(userSettings.periodStartDate));
            end = endOfDay(parseISO(userSettings.periodEndDate));
            label = "Aktif Dönem";
        } else {
            const p = periods.find((x) => x.id === selectedPeriodId);
            if (!p) return null;

            start = startOfDay(parseISO(p.startDate));
            end = endOfDay(parseISO(p.endDate));
            label = p.name;
        }

        return { start, end, label };
    }, [selectedPeriodId, userSettings, periods]);

    const filteredTransactions = useMemo(() => {
        if (!selectedRange) return [];

        return transactions.filter((t) => {
            const tDate = parseISO(t.date);
            const isDateMatch = isWithinInterval(tDate, { start: selectedRange.start, end: selectedRange.end });
            const isTypeMatch = typeFilter === "all" ? true : t.type === typeFilter;
            return isDateMatch && isTypeMatch;
        });
    }, [transactions, selectedRange, typeFilter]);

    const filteredPeriodList = useMemo(() => {
        return periods.filter(p => {
            return p.startDate !== userSettings.periodStartDate;
        });
    }, [periods, userSettings]);

    const viewStats = useMemo(() => {
        if (!selectedRange) return { income: 0, expense: 0, balance: 0, hasFixed: false, fixedExpenseTotal: 0, subscriptionTotal: 0, actualIncomeTotal: 0, actualExpenseTotal: 0, fixedIncomeTotal: 0, daysRemaining: 0 };
        const relevantTransactions = transactions.filter((t) => {
            const tDate = parseISO(t.date);
            return isWithinInterval(tDate, { start: selectedRange.start, end: selectedRange.end });
        });

        const txIncome = relevantTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
        const txExpense = relevantTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

        let fixedIncome = 0;
        let fixedExpense = 0;
        let subscriptionTotal = 0;

        if (selectedPeriodId === "active") {
            fixedIncome = userSettings.monthlyIncome;
            fixedExpense = userSettings.fixedExpenses;

            subscriptionTotal = recurringTransactions
                .filter(sub => sub.isActive && sub.type === "expense")
                .reduce((acc, sub) => acc + sub.amount, 0);
        } else {
            const p = periods.find((x) => x.id === selectedPeriodId);
            if (p) {
                fixedIncome = p.monthlyIncome;
                fixedExpense = p.fixedExpenses;
                subscriptionTotal = 0;
            }
        }

        const totalIncome = txIncome + fixedIncome;
        const totalExpense = txExpense + fixedExpense + subscriptionTotal;

        const now = new Date();
        const diffTime = (selectedRange?.end.getTime() || 0) - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
            hasFixed: fixedIncome > 0 || fixedExpense > 0 || subscriptionTotal > 0 || txExpense > 0,

            fixedExpenseTotal: fixedExpense,
            subscriptionTotal: subscriptionTotal,
            actualExpenseTotal: txExpense,

            fixedIncomeTotal: fixedIncome || 0,
            actualIncomeTotal: txIncome || 0,

            daysRemaining: daysRemaining
        };
    }, [transactions, selectedRange, selectedPeriodId, userSettings, periods, recurringTransactions]);

    const categoryData = useMemo(() => {
        const targetType = typeFilter === "all" ? "expense" : typeFilter;
        const filtered = filteredTransactions.filter((t) => t.type === targetType);

        const groups: Record<string, number> = {};
        filtered.forEach((t) => {
            groups[t.category] = (groups[t.category] || 0) + t.amount;
        });

        if (typeFilter === "income" && selectedPeriodId === "active" && userSettings.monthlyIncome > 0) {
            groups["Maaş / Sabit Gelir"] = (groups["Maaş / Sabit Gelir"] || 0) + userSettings.monthlyIncome;
        }

        const total = Object.values(groups).reduce((acc, val) => acc + val, 0);

        return Object.keys(groups)
            .map((key) => ({
                name: key,
                value: groups[key],
                percentage: total > 0 ? (groups[key] / total) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions, typeFilter, selectedPeriodId, userSettings.monthlyIncome]);

    const chartData = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const groups: Record<string, number> = {};
        sorted.forEach((t) => {
            groups[t.date] = (groups[t.date] || 0) + t.amount;
        });
        return Object.keys(groups).map((date) => ({ date, amount: groups[date] }));
    }, [filteredTransactions]);

    const isNegative = viewStats.balance < 0;

    const dailyBudget = useMemo(() => {
        if (viewStats.daysRemaining <= 0) return 0;
        return viewStats.balance / viewStats.daysRemaining;
    }, [viewStats]);

    const todayStats = useMemo(() => {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const todayTransactions = transactions.filter(t => t.date === todayStr);
        const todayExpense = todayTransactions
            .filter(t => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);

        const remaining = dailyBudget - todayExpense;
        const percentage = dailyBudget > 0 ? (todayExpense / dailyBudget) * 100 : 0;

        return {
            expense: todayExpense,
            remaining: remaining,
            percentage: Math.min(percentage, 100),
            transactionCount: todayTransactions.filter(t => t.type === "expense").length
        };
    }, [transactions, dailyBudget]);

    const [animatedBalance, setAnimatedBalance] = useState(0);
    const [animatedDaily, setAnimatedDaily] = useState(0);
    const [animatedIncome, setAnimatedIncome] = useState(0);
    const [animatedExpense, setAnimatedExpense] = useState(0);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        const targetBalance = viewStats.balance;
        const targetDaily = dailyBudget;
        const targetIncome = viewStats.income;
        const targetExpense = viewStats.expense;
        const duration = 1500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setAnimatedBalance(eased * targetBalance);
            setAnimatedDaily(eased * targetDaily);
            setAnimatedIncome(eased * targetIncome);
            setAnimatedExpense(eased * targetExpense);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
            }
        };

        setIsAnimating(true);
        requestAnimationFrame(animate);
    }, [viewStats.balance, viewStats.income, viewStats.expense, dailyBudget]);

    const bannerStatus = useMemo(() => {
        const balance = viewStats.balance;
        const daily = dailyBudget;

        const periodDays = Math.ceil(
            (new Date(userSettings.periodEndDate).getTime() - new Date(userSettings.periodStartDate).getTime())
            / (1000 * 60 * 60 * 24)
        );
        const idealDaily = viewStats.income / periodDays;

        const ratio = idealDaily > 0 ? daily / idealDaily : 0;

        if (balance < 0) {
            return { type: "negative" as const, message: "Bütçe aşımı", hint: "Harcamaları gözden geçir" };
        }
        if (ratio < 0.3) {
            return { type: "tight" as const, message: "Kısıtlı bütçe", hint: "Dikkatli harca" };
        }
        if (ratio < 0.7) {
            return { type: "good" as const, message: "Dengeli gidiyorsun", hint: "Tempoyu koru" };
        }
        return { type: "great" as const, message: "İyi gidiyorsun", hint: "Böyle devam" };
    }, [viewStats.balance, viewStats.income, dailyBudget, userSettings]);

    const [gradientPos, setGradientPos] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setGradientPos(prev => (prev + 0.5) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div
                className={`relative overflow-hidden rounded-2xl border shadow-xl mb-6 ${bannerStatus.type === "negative" ? "border-rose-500/30"
                    : bannerStatus.type === "tight" ? "border-amber-500/20"
                        : bannerStatus.type === "great" ? "border-emerald-500/20"
                            : "border-slate-700"
                    }`}
                style={{
                    background: bannerStatus.type === "negative"
                        ? `linear-gradient(${gradientPos}deg, rgba(76,5,25,0.8), rgba(15,23,42,1), rgba(76,5,25,0.6))`
                        : bannerStatus.type === "tight"
                            ? `linear-gradient(${gradientPos}deg, rgba(69,26,3,0.5), rgba(15,23,42,1), rgba(69,26,3,0.4))`
                            : bannerStatus.type === "great"
                                ? `linear-gradient(${gradientPos}deg, rgba(6,78,59,0.3), rgba(15,23,42,1), rgba(6,78,59,0.2))`
                                : `linear-gradient(${gradientPos}deg, rgba(30,41,59,1), rgba(15,23,42,1), rgba(30,41,59,0.8))`
                }}
            >
                {/* Subtle glow - sadece tek bir yumuşak ışık */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 ${bannerStatus.type === "negative" ? "bg-rose-500"
                    : bannerStatus.type === "tight" ? "bg-amber-500"
                        : "bg-indigo-500"
                    }`} />

                <div className="relative z-10 p-5">
                    {/* Üst Satır: Dönem + Kalan Gün */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-400 font-medium">
                                {userSettings.periodName || "Aktif Dönem"}
                            </span>
                        </div>

                        <div className={`px-2.5 py-1 animate-fade-in-up rounded-lg text-xs font-semibold ${viewStats.daysRemaining > 0
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                            }`}>
                            {viewStats.daysRemaining > 0 ? `${viewStats.daysRemaining} gün kaldı` : "Dönem tamamlandı"}
                        </div>
                    </div>

                    {/* Ana İçerik: Bakiye + Günlük */}
                    <div className="flex items-end justify-between gap-4">
                        {/* Net Bakiye */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                                </svg>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                                    Net Bakiye
                                </p>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-black tracking-tight tabular-nums ${viewStats.balance >= 0 ? "text-white" : "text-rose-400"
                                    } ${isAnimating ? "animate-pulse" : ""}`}>
                                    {animatedBalance < 0 && "-"}
                                    {Math.abs(animatedBalance).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-lg text-slate-500 font-medium">₺</span>
                            </div>
                        </div>

                        {/* Sağ: Günlük Bütçe */}
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 mb-1 justify-end">
                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                                    Günlük
                                </p>
                            </div>
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className={`text-2xl font-bold tabular-nums ${dailyBudget < 0 ? "text-rose-400"
                                    : dailyBudget < 100 ? "text-amber-400"
                                        : "text-indigo-400"
                                    } ${isAnimating ? "animate-pulse" : ""}`}>
                                    {animatedDaily < 0 && "-"}
                                    {Math.abs(animatedDaily).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-sm text-slate-500">₺</span>
                            </div>
                        </div>
                    </div>

                    {/* Alt: Durum Mesajı */}
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 animate-pulse rounded-full ${bannerStatus.type === "negative" ? "bg-rose-500"
                                    : bannerStatus.type === "tight" ? "bg-amber-500"
                                        : bannerStatus.type === "good" ? "bg-indigo-500"
                                            : "bg-emerald-500"
                                    }`} />
                                <span className="text-sm text-slate-300">{bannerStatus.message}</span>
                                <span className="text-xs text-slate-500">· {bannerStatus.hint}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bugün Özeti */}
            {selectedPeriodId === "active" && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                    {/* Sol: Icon */}
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            <circle cx="12" cy="15" r="2" fill="currentColor" />
                        </svg>
                    </div>

                    {/* Orta: Bilgi */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-400">Bugün</span>
                            <span className="text-[10px] text-slate-500">
                                {todayStats.transactionCount > 0 ? `${todayStats.transactionCount} işlem` : "İşlem yok"}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${todayStats.percentage > 100 ? "bg-rose-500"
                                    : todayStats.percentage > 75 ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                style={{ width: `${Math.min(todayStats.percentage, 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                                Harcanan: <span className="text-white font-semibold">{todayStats.expense.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                            </span>
                            <span className={`font-semibold ${todayStats.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {todayStats.remaining >= 0 ? "Kalan" : "Aşım"}: {Math.abs(todayStats.remaining).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </span>
                        </div>
                    </div>
                </div>
            )}


            {/* Filtre Barı */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                {/* Üst: Dönem Seçici */}
                <div className="relative">
                    <button
                        onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                        className="w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-xl p-3 flex items-center justify-between hover:border-indigo-500/50 transition-all active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Dönem</p>
                                <p className="text-sm font-medium text-white truncate max-w-[200px]">
                                    {selectedPeriodId === "active"
                                        ? (userSettings.periodName || "Aktif Dönem")
                                        : periods.find((p) => p.id === selectedPeriodId)?.name || "Dönem Seçiniz"}
                                </p>
                            </div>
                        </div>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isPeriodOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isPeriodOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsPeriodOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar">
                                <div className="p-2 space-y-1">
                                    {/* Aktif Dönem */}
                                    <button
                                        onClick={() => { setSelectedPeriodId("active"); setIsPeriodOpen(false); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-[0.98] ${selectedPeriodId === "active" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedPeriodId === "active" ? "bg-white/20" : "bg-slate-600"}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="font-semibold block">{userSettings.periodName || "Aktif Dönem"}</span>
                                                <span className="text-xs opacity-70">
                                                    {new Date(userSettings.periodStartDate).toLocaleDateString("tr-TR")} - {new Date(userSettings.periodEndDate).toLocaleDateString("tr-TR")}
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {filteredPeriodList.length > 0 && <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />}

                                    {/* Geçmiş Dönemler */}
                                    {filteredPeriodList.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedPeriodId(p.id); setIsPeriodOpen(false); }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-[0.98] ${selectedPeriodId === p.id ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedPeriodId === p.id ? "bg-white/20" : "bg-slate-600"}`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-medium block">{p.name}</span>
                                                    <span className="text-xs opacity-70">
                                                        {new Date(p.startDate).toLocaleDateString("tr-TR")} - {new Date(p.endDate).toLocaleDateString("tr-TR")}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Alt: İşlem Tipi Filtreleri */}
                <div className="flex bg-slate-900/80 rounded-xl p-1.5 gap-1">
                    {([
                        { key: "all", label: "Tümü", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                        { key: "income", label: "Gelirler", icon: "M12 4v16m8-8H4" },
                        { key: "expense", label: "Giderler", icon: "M20 12H4" }
                    ] as const).map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setTypeFilter(item.key)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${typeFilter === item.key
                                ? item.key === "income"
                                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                                    : item.key === "expense"
                                        ? "bg-rose-500/20 text-rose-400 shadow-sm"
                                        : "bg-slate-700 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Net Bakiye */}
                <div className={`p-6 rounded-2xl border shadow-sm transition-colors ${isNegative ? "bg-rose-950/30 border-rose-900" : "bg-slate-800 border-slate-700"}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className={`text-sm font-medium ${isNegative ? "text-rose-400" : "text-slate-400"}`}>
                                    {selectedRange?.label} Net
                                </p>
                            </div>
                            <h3 className={`text-2xl font-bold tabular-nums ${isNegative ? "text-rose-500" : "text-white"} ${isAnimating ? "animate-pulse" : ""}`}>
                                {animatedBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </h3>
                        </div>
                        <div className={`p-2 rounded-lg ${isNegative ? "bg-rose-500/10" : "bg-indigo-500/10"}`}>
                            <svg className={`w-6 h-6 ${isNegative ? "text-rose-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Gelir */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm group hover:border-emerald-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-400/80 text-sm font-medium mb-1">Toplam Gelir</p>
                            <h3 className={`text-2xl font-bold text-emerald-400 tabular-nums ${isAnimating ? "animate-pulse" : ""}`}>
                                + {animatedIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </h3>

                            {/* Gelir Detayları */}
                            {viewStats.hasFixed && (
                                <div className="mt-2 space-y-0.5 border-l-2 border-emerald-500/20 pl-2">

                                    {/* 1. Sabit Gelir */}
                                    {viewStats.fixedIncomeTotal > 0 && (
                                        <div className="flex justify-between w-full min-w-[120px] text-[10px] text-slate-400">
                                            <span>Maaş/Sabit:</span>
                                            <span>{viewStats.fixedIncomeTotal.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    )}

                                    {/* 2. Ek Gelirler */}
                                    {viewStats.actualIncomeTotal > 0 && (
                                        <div className="flex justify-between w-full min-w-[120px] text-[10px] text-slate-400">
                                            <span>Ek Gelirler:</span>
                                            <span>{viewStats.actualIncomeTotal.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                    </div>
                </div>

                {/* Gider */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm group hover:border-rose-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-rose-400/80 text-sm font-medium mb-1">Toplam Gider</p>
                            <h3 className={`text-2xl font-bold text-rose-400 tabular-nums ${isAnimating ? "animate-pulse" : ""}`}>
                                - {animatedExpense.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </h3>
                            {/* Sabit ve Abonelik Detayı */}
                            {viewStats.hasFixed && (
                                <div className="mt-2 space-y-0.5 border-l-2 border-rose-500/20 pl-2">

                                    {/* 1. Sabit Giderler */}
                                    {viewStats.fixedExpenseTotal > 0 && (
                                        <div className="flex justify-between w-full min-w-[120px] text-[10px] text-slate-400">
                                            <span>Sabit Gider:</span>
                                            <span>{viewStats.fixedExpenseTotal.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    )}

                                    {/* 2. Abonelikler */}
                                    {viewStats.subscriptionTotal > 0 && (
                                        <div className="flex justify-between w-full min-w-[120px] text-[10px] text-slate-400">
                                            <span>Abonelikler:</span>
                                            <span>{viewStats.subscriptionTotal.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    )}

                                    {/* 3. Günlük Harcamalar */}
                                    {viewStats.actualExpenseTotal > 0 && (
                                        <div className="flex justify-between w-full min-w-[120px] text-[10px] text-slate-400">
                                            <span>Harcamalar:</span>
                                            <span>{viewStats.actualExpenseTotal.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-rose-500/10 rounded-lg">
                            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-3">
                        {typeFilter === "income" ? "Gelir Dağılımı" : "Harcama Dağılımı"}
                    </h3>
                    {categoryData.length > 0 ? (
                        <div className="flex flex-col md:flex-row gap-8 h-full">
                            <div className="flex-1 min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 shadow-xl">
                                                            <p className="text-sm font-semibold text-white mb-1">{data.name}</p>
                                                            <p className="text-lg font-bold text-indigo-400">{data.value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
                                                            <p className="text-xs text-slate-500 mt-1">%{data.percentage.toFixed(1)} oranında</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[250px] pr-2 space-y-3">
                                {categoryData.map((cat, index) => (
                                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{cat.name}</p>
                                                <p className="text-xs text-slate-500">%{cat.percentage.toFixed(1)}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-300">{cat.value.toLocaleString("tr-TR")} ₺</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                </svg>
                            </div>
                            {typeFilter === "income" ? "Görüntülenecek gelir yok" : "Görüntülenecek harcama yok"}
                        </div>
                    )}
                </div>

                {/* Trend Chart */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-3">
                        {typeFilter === "income" ? "Gelir Trendi" : typeFilter === "expense" ? "Harcama Trendi" : "İşlem Trendi"}
                    </h3>
                    {chartData.length > 0 ? (
                        <div className="flex-1 w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={typeFilter === "income" ? "#10b981" : typeFilter === "expense" ? "#f43f5e" : "#6366f1"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={typeFilter === "income" ? "#10b981" : typeFilter === "expense" ? "#f43f5e" : "#6366f1"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickMargin={10}
                                        tickFormatter={(date) => new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}₺`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px" }}
                                        itemStyle={{ color: typeFilter === "income" ? "#10b981" : typeFilter === "expense" ? "#f43f5e" : "#818cf8" }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString("tr-TR")}
                                        formatter={(value: number) => [`${value.toLocaleString("tr-TR")} ₺`, "Tutar"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke={typeFilter === "income" ? "#10b981" : typeFilter === "expense" ? "#f43f5e" : "#6366f1"}
                                        fillOpacity={1}
                                        fill="url(#colorAmount)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
                    )}
                </div>
            </div>
        </div>
    );
};
