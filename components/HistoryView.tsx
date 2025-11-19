
import React, { useMemo } from 'react';
import { Transaction, UserSettings, CycleSummary } from '../types';
import { calculateHistorySummaries } from '../services/storageService';

interface HistoryViewProps {
    transactions: Transaction[];
    settings: UserSettings;
    onSelectCycle?: (date: Date) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, settings, onSelectCycle }) => {
    const summaries = useMemo(() => calculateHistorySummaries(transactions, settings), [transactions, settings]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white hidden md:block">Dönem Geçmişi</h2>
                <p className="text-slate-400 text-sm">Önceki ayların performansını incele</p>
            </div>

            <div className="grid gap-4">
                {summaries.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-2xl border border-slate-700 text-slate-500">
                        <p>Henüz tamamlanmış veya aktif bir dönem verisi bulunmuyor.</p>
                    </div>
                ) : (
                    summaries.map(cycle => (
                        <div 
                            key={cycle.id} 
                            onClick={() => {
                                if (onSelectCycle) {
                                    const [day, month, year] = cycle.startDate.split('.');
                                    const date = new Date(Number(year), Number(month) - 1, Number(day));
                                    onSelectCycle(date);
                                }
                            }}
                            className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-indigo-500 hover:bg-slate-700/30 transition-all cursor-pointer group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded">DÖNEM</span>
                                        <p className="text-sm text-slate-400 font-medium group-hover:text-indigo-300 transition-colors">
                                            Detayları Gör →
                                        </p>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mt-1">{cycle.startDate} - {cycle.endDate}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Tasarruf Oranı</p>
                                        <p className={`font-bold ${cycle.savingsRate > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            %{cycle.savingsRate.toFixed(1)}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg
                                        ${cycle.balance >= 0 ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/20 text-rose-400 shadow-rose-500/10'}`}>
                                        {cycle.balance >= 0 ? '👍' : '👎'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 md:gap-8 border-t border-slate-700 pt-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Toplam Gelir</p>
                                    <p className="text-emerald-400 font-semibold text-sm md:text-base">+{cycle.totalIncome.toLocaleString('tr-TR')} ₺</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Toplam Gider</p>
                                    <p className="text-rose-400 font-semibold text-sm md:text-base">-{cycle.totalExpense.toLocaleString('tr-TR')} ₺</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Kalan (Net)</p>
                                    <p className={`font-bold text-sm md:text-base ${cycle.balance >= 0 ? 'text-white' : 'text-rose-500'}`}>
                                        {cycle.balance.toLocaleString('tr-TR')} ₺
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
