import React, { useMemo, useState, useEffect } from "react";
import { Transaction, BudgetPeriod } from "../types";
import { format, parseISO, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { fetchBudgetPeriods } from "../services/storageService";

interface TransactionListProps {
    transactions: Transaction[];
    userId: string;
    onDelete: (id: string) => void;
}

const getGroupTitle = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Bugün";
    if (isYesterday(date)) return "Dün";
    return format(date, "d MMMM yyyy, EEEE", { locale: tr });
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, userId, onDelete }) => {
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [loading, setLoading] = useState(true);

    const [expandedPeriodIds, setExpandedPeriodIds] = useState<string[]>([]);

    useEffect(() => {
        const loadPeriods = async () => {
            if (userId) {
                const list = await fetchBudgetPeriods(userId);
                const sortedPeriods = list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                setPeriods(sortedPeriods);

                if (sortedPeriods.length > 0) {
                    setExpandedPeriodIds([sortedPeriods[0].id]);
                }
            }
            setLoading(false);
        };
        loadPeriods();
    }, [userId]);

    const groupedData = useMemo(() => {
        if (transactions.length === 0) return [];

        const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const processedTxIds = new Set<string>();

        const hierarchy = periods.map(period => {
            const periodStart = startOfDay(new Date(period.startDate));
            const periodEnd = endOfDay(new Date(period.endDate));

            const periodTxs = sortedTxs.filter(t => {
                const tDate = parseISO(t.date);
                const isIn = isWithinInterval(tDate, { start: periodStart, end: periodEnd });
                if (isIn) processedTxIds.add(t.id);
                return isIn;
            });

            const income = periodTxs.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
            const expense = periodTxs.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

            const days: Record<string, Transaction[]> = {};
            periodTxs.forEach(t => {
                if (!days[t.date]) days[t.date] = [];
                days[t.date].push(t);
            });

            return {
                period,
                days,
                summary: { income, expense, net: income - expense, count: periodTxs.length }
            };
        });

        const orphanTxs = sortedTxs.filter(t => !processedTxIds.has(t.id));
        if (orphanTxs.length > 0) {
            const days: Record<string, Transaction[]> = {};
            orphanTxs.forEach(t => {
                if (!days[t.date]) days[t.date] = [];
                days[t.date].push(t);
            });

            hierarchy.push({
                period: { id: "orphans", name: "Dönem Dışı / Geçmiş", startDate: "", endDate: "", userId, monthlyIncome: 0, fixedExpenses: 0 },
                days,
                summary: {
                    income: orphanTxs.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0),
                    expense: orphanTxs.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0),
                    net: 0,
                    count: orphanTxs.length
                }
            });
        }

        return hierarchy.filter(h => h.summary.count > 0);

    }, [transactions, periods, userId]);

    const togglePeriod = (id: string) => {
        setExpandedPeriodIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    if (loading) return <div className="text-center py-10 text-slate-500">Yükleniyor...</div>;

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-fade-in">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="font-medium">Henüz işlem kaydı bulunmuyor.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-24">
            {groupedData.map(({ period, days, summary }) => {
                const isExpanded = expandedPeriodIds.includes(period.id);

                return (
                    <div key={period.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in-up">
                        <div
                            onClick={() => togglePeriod(period.id)}
                            className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${isExpanded ? "bg-slate-800" : "hover:bg-slate-800/50"}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner border border-white/5 ${isExpanded ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-700/50 text-slate-400"}`}>
                                    {isExpanded ? "📂" : "📁"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm md:text-base">{period.name}</h3>
                                    <div className="flex gap-2 text-[10px] md:text-xs text-slate-400 mt-0.5">
                                        <span className="text-emerald-400/80">+{summary.income.toLocaleString("tr-TR")}</span>
                                        <span className="text-rose-400/80">-{summary.expense.toLocaleString("tr-TR")}</span>
                                        <span className="w-px h-3 bg-slate-600 self-center"></span>
                                        <span>{summary.count} İşlem</span>
                                    </div>
                                </div>
                            </div>

                            <svg
                                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-800 bg-slate-900/30 p-2 md:p-4 space-y-6">
                                {Object.keys(days).map((date) => {
                                    const groupTxs = days[date];
                                    const dailyTotal = groupTxs.reduce((acc, curr) => curr.type === "income" ? acc + curr.amount : acc - curr.amount, 0);

                                    return (
                                        <div key={date}>
                                            <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur py-2 mb-2 flex justify-between items-end border-b border-slate-800/50 px-2 rounded-lg">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    {getGroupTitle(date)}
                                                </h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dailyTotal >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {dailyTotal >= 0 ? '+' : ''}{dailyTotal.toLocaleString("tr-TR")} ₺
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {groupTxs.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="group relative p-3 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-between hover:border-slate-600 transition-all active:scale-[0.99]"
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${t.type === "income"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : "bg-rose-500/10 text-rose-400"
                                                                }`}>
                                                                {t.type === "income"
                                                                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                                                }
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-white text-sm truncate">{t.category}</p>
                                                                {t.description && <p className="text-[10px] text-slate-400 truncate">{t.description}</p>}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 pl-2">
                                                            <span className={`font-bold text-sm ${t.type === "income" ? "text-emerald-400" : "text-white"}`}>
                                                                {t.type === "income" ? "+" : "-"}{t.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};