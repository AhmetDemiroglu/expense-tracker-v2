import React, { useMemo, useState, useEffect } from "react";
import { Transaction, CycleSummary, BudgetPeriod } from "../types";
import { calculateHistorySummaries, fetchBudgetPeriods } from "../services/storageService";

interface HistoryViewProps {
    transactions: Transaction[];
    userId: string;
    onSelectCycle?: (date: Date) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, userId, onSelectCycle }) => {
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (userId) {
                const list = await fetchBudgetPeriods(userId);
                setPeriods(list);
            }
            setLoading(false);
        };
        loadData();
    }, [userId]);

    const summaries = useMemo(() => calculateHistorySummaries(transactions, periods), [transactions, periods]);

    if (loading) {
        return <div className="text-center py-8 text-slate-500">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {summaries.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-2xl border border-slate-700 text-slate-500">
                        <div className="mb-4 text-4xl">📅</div>
                        <p className="font-medium text-white">Henüz kayıtlı bir dönem geçmişi yok.</p>
                        <p className="text-sm mt-2">
                            "Ayarlar &gt; Bütçe Planlaması" kısmından yeni dönemler oluşturdukça
                            <br />
                            veya mevcut dönemler bittikçe burada arşivlenecektir.
                        </p>
                    </div>
                ) : (
                    summaries.map((cycle) => (
                        <div
                            key={cycle.id}
                            onClick={() => {
                                if (onSelectCycle) {
                                    // Dönem başlangıç tarihini parse et
                                    const date = new Date(cycle.startDate);
                                    onSelectCycle(date);
                                }
                            }}
                            className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-indigo-500 hover:bg-slate-700/30 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            {/* Dekoratif Arka Plan */}
                            <div
                                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${
                                    cycle.balance >= 0 ? "from-emerald-500/10" : "from-rose-500/10"
                                } to-transparent rounded-bl-full pointer-events-none`}
                            />

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 relative z-10">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600">DÖNEM RAPORU</span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(cycle.startDate).toLocaleDateString("tr-TR")} - {new Date(cycle.endDate).toLocaleDateString("tr-TR")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {periods.find((p) => p.id === cycle.id)?.name || "İsimsiz Dönem"}
                                        </h3>
                                        <svg className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Tasarruf</p>
                                        <p className={`font-bold text-lg ${cycle.savingsRate > 0 ? "text-emerald-400" : "text-slate-400"}`}>%{cycle.savingsRate.toFixed(1)}</p>
                                    </div>
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg border border-white/5
                                        ${cycle.balance >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                                    >
                                        {cycle.balance >= 0 ? "🤩" : "🥵"}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:gap-8 border-t border-slate-700/50 pt-4 relative z-10">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Toplam Gelir</p>
                                    <p className="text-emerald-400 font-medium text-sm md:text-base">+{cycle.totalIncome.toLocaleString("tr-TR")} ₺</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Toplam Gider</p>
                                    <p className="text-rose-400 font-medium text-sm md:text-base">-{cycle.totalExpense.toLocaleString("tr-TR")} ₺</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Net Kalan</p>
                                    <p className={`font-bold text-sm md:text-base ${cycle.balance >= 0 ? "text-white" : "text-rose-500"}`}>{cycle.balance.toLocaleString("tr-TR")} ₺</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
