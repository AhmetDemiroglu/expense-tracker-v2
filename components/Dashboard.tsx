import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Transaction, DashboardStats, BudgetPeriod, UserSettings } from "../types";
import { PIE_COLORS } from "../constants";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { fetchBudgetPeriods } from "../services/storageService";

interface DashboardProps {
    transactions: Transaction[];
    stats: DashboardStats;
    userId: string;
    userSettings: UserSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, stats, userId, userSettings }) => {
    // State Tanımları
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("active");
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    // Dönemleri Yükle
    useEffect(() => {
        const loadPeriods = async () => {
            const list = await fetchBudgetPeriods(userId);
            setPeriods(list);
        };
        if (userId) loadPeriods();
    }, [userId]);

    // Seçili Dönemin Tarihlerini Belirle
    const selectedRange = useMemo(() => {
        if (selectedPeriodId === "active") {
            // Aktif dönem
            const [sDay, sMonth, sYear] = stats.cycleStartDate.split(".");
            const [eDay, eMonth, eYear] = stats.cycleEndDate.split(".");
            return {
                start: startOfDay(new Date(Number(sYear), Number(sMonth) - 1, Number(sDay))),
                end: endOfDay(new Date(Number(eYear), Number(eMonth) - 1, Number(eDay))),
                label: "Aktif Dönem",
            };
        } else {
            // Geçmiş dönem
            const p = periods.find((x) => x.id === selectedPeriodId);
            if (!p) return null;
            return {
                start: startOfDay(new Date(p.startDate)),
                end: endOfDay(new Date(p.endDate)),
                label: p.name,
            };
        }
    }, [selectedPeriodId, stats, periods]);

    // İşlemleri Filtrele (Dönem + Tür)
    const filteredTransactions = useMemo(() => {
        if (!selectedRange) return [];
        return transactions.filter((t) => {
            const tDate = parseISO(t.date);
            const isDateMatch = isWithinInterval(tDate, { start: selectedRange.start, end: selectedRange.end });
            const isTypeMatch = typeFilter === "all" ? true : t.type === typeFilter;
            return isDateMatch && isTypeMatch;
        });
    }, [transactions, selectedRange, typeFilter]);

    // İstatistikleri Hesapla (Sabit Gelir/Gider Dahil)
    const viewStats = useMemo(() => {
        // A) İşlemlerden gelen toplamlar
        let relevantTransactions = transactions;
        if (selectedRange) {
            relevantTransactions = transactions.filter((t) => {
                const tDate = parseISO(t.date);
                return isWithinInterval(tDate, { start: selectedRange.start, end: selectedRange.end });
            });
        }

        const incomes = relevantTransactions.filter((t) => t.type === "income");
        const expenses = relevantTransactions.filter((t) => t.type === "expense");
        const txIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
        const txExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

        // B) Sabit (Fixed) Tutar Hesabı
        let fixedIncome = 0;
        let fixedExpense = 0;

        if (selectedPeriodId === "active") {
            fixedIncome = userSettings.monthlyIncome;
            fixedExpense = userSettings.fixedExpenses;
        } else {
            const p = periods.find((x) => x.id === selectedPeriodId);
            if (p) {
                fixedIncome = p.monthlyIncome;
                fixedExpense = p.fixedExpenses;
            }
        }

        const totalIncome = txIncome + fixedIncome;
        const totalExpense = txExpense + fixedExpense;

        return {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
            hasFixed: fixedIncome > 0 || fixedExpense > 0,
        };
    }, [transactions, selectedRange, selectedPeriodId, userSettings, periods]);

    // Grafik Verileri (Filtrelenmiş veriye göre)
    const categoryData = useMemo(() => {
        const expenses = filteredTransactions.filter((t) => t.type === "expense");
        const totalExp = expenses.reduce((acc, t) => acc + t.amount, 0);

        const groups: Record<string, number> = {};
        expenses.forEach((t) => {
            groups[t.category] = (groups[t.category] || 0) + t.amount;
        });

        return Object.keys(groups)
            .map((key) => ({
                name: key,
                value: groups[key],
                percentage: totalExp > 0 ? (groups[key] / totalExp) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const groups: Record<string, number> = {};
        sorted.forEach((t) => {
            groups[t.date] = (groups[t.date] || 0) + t.amount;
        });
        return Object.keys(groups).map((date) => ({ date, amount: groups[date] }));
    }, [filteredTransactions]);

    const isNegative = viewStats.balance < 0;

    return (
        <div className="space-y-6">
            {/* Filtre Barı */}
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full md:w-auto relative">
                    <label className="text-sm text-slate-400">Dönem:</label>

                    {/* Custom Dropdown Trigger */}
                    <div className="relative min-w-[240px]">
                        <button
                            onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg p-2.5 flex items-center justify-between hover:border-indigo-500 transition-colors text-left"
                        >
                            <span className="truncate">
                                {selectedPeriodId === "active"
                                    ? `Aktif Dönem (${stats.cycleStartDate} - ${stats.cycleEndDate})`
                                    : periods.find((p) => p.id === selectedPeriodId)
                                        ? `${periods.find((p) => p.id === selectedPeriodId)?.name} (${new Date(periods.find((p) => p.id === selectedPeriodId)!.startDate).toLocaleDateString("tr-TR")}...)`
                                        : "Dönem Seçiniz"}
                            </span>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isPeriodOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isPeriodOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsPeriodOpen(false)}></div>
                                <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="p-1 space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setSelectedPeriodId("active");
                                                setIsPeriodOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPeriodId === "active" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
                                                }`}
                                        >
                                            <span className="font-bold block">Aktif Dönem</span>
                                            <span className="text-xs opacity-70">
                                                {stats.cycleStartDate} - {stats.cycleEndDate}
                                            </span>
                                        </button>

                                        {periods.length > 0 && <div className="my-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />}

                                        {periods.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedPeriodId(p.id);
                                                    setIsPeriodOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPeriodId === p.id ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
                                                    }`}
                                            >
                                                <span className="font-medium block">{p.name}</span>
                                                <span className="text-xs opacity-70">
                                                    {new Date(p.startDate).toLocaleDateString("tr-TR")} - {new Date(p.endDate).toLocaleDateString("tr-TR")}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1">
                    {(["all", "income", "expense"] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === type ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"}`}
                        >
                            {type === "all" ? "Tümü" : type === "income" ? "Gelirler" : "Giderler"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Net Bakiye */}
                <div className={`p-6 rounded-2xl border shadow-sm transition-colors ${isNegative ? "bg-rose-950/30 border-rose-900" : "bg-slate-800 border-slate-700"}`}>
                    <p className={`text-sm font-medium mb-1 ${isNegative ? "text-rose-400" : "text-slate-400"}`}>{selectedRange?.label} Net</p>
                    <h3 className={`text-2xl font-bold ${isNegative ? "text-rose-500" : "text-white"}`}>{viewStats.balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</h3>
                </div>

                {/* Gelir */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm group hover:border-emerald-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-400/80 text-sm font-medium mb-1">Toplam Gelir</p>
                            <h3 className="text-2xl font-bold text-emerald-400">+ {viewStats.income.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</h3>
                            {viewStats.hasFixed && <span className="text-[10px] text-emerald-400/50 block mt-1">(Maaş/Sabit Gelir Dahil)</span>}
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Gider */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm group hover:border-rose-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-rose-400/80 text-sm font-medium mb-1">Toplam Gider</p>
                            <h3 className="text-2xl font-bold text-rose-400">- {viewStats.expense.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</h3>
                            {viewStats.hasFixed && <span className="text-[10px] text-rose-400/50 block mt-1">(Sabit Giderler Dahil)</span>}
                        </div>
                        <div className="p-2 bg-rose-500/10 rounded-lg">
                            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Harcama Dağılımı</h3>
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
                                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f1f5f9" }}
                                            itemStyle={{ color: "#f1f5f9" }}
                                            formatter={(value: number) => `${value.toLocaleString("tr-TR")} ₺`}
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
                            Görüntülenecek harcama yok
                        </div>
                    )}
                </div>

                {/* Trend Chart */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-4">{typeFilter === "income" ? "Gelir Trendi" : "Harcama Trendi"}</h3>
                    {chartData.length > 0 ? (
                        <div className="flex-1 w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}₺`} />
                                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px" }} itemStyle={{ color: "#818cf8" }} />
                                    <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" />
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
