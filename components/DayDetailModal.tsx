import React from "react";
import { Transaction, DailyStatus } from "../types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface DayDetailModalProps {
    data: DailyStatus;
    transactions: Transaction[];
    onClose: () => void;
    onAddTransaction: () => void;
    onDeleteTransaction: (id: string) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ data, transactions, onClose, onAddTransaction, onDeleteTransaction }) => {
    const dayTxs = transactions.filter((t) => t.date === data.date);
    const dateObj = new Date(data.date);
    const isNegativeLimit = data.limit < 0;
    const variance = data.limit - data.spent; // Pozitifse tasarruf, negatifse aşım

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header with Status Color */}
                <div
                    className={`p-6 border-b flex justify-between items-center ${
                        data.status === "success"
                            ? "bg-emerald-900/20 border-emerald-900/50"
                            : data.status === "warning"
                            ? "bg-amber-900/20 border-amber-900/50"
                            : data.status === "danger"
                            ? "bg-rose-900/20 border-rose-900/50"
                            : "bg-slate-800 border-slate-700"
                    }`}
                >
                    <div>
                        <h2 className="text-2xl font-bold text-white">{format(dateObj, "d MMMM yyyy", { locale: tr })}</h2>
                        <p className="text-slate-400 text-sm uppercase tracking-wide font-semibold opacity-80">{format(dateObj, "EEEE", { locale: tr })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 rounded-full hover:bg-black/40 text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Main Stats Card */}
                <div className="p-6 grid grid-cols-2 gap-4 bg-slate-800/50">
                    <div className={`p-4 rounded-xl border ${isNegativeLimit ? "bg-rose-950/30 border-rose-900/50" : "bg-slate-800 border-slate-700"}`}>
                        <p className={`text-xs font-bold uppercase mb-1 ${isNegativeLimit ? "text-rose-400" : "text-slate-500"}`}>{isNegativeLimit ? "Açık (Borç)" : "Günlük Limit"}</p>
                        <p className={`text-2xl font-bold ${isNegativeLimit ? "text-rose-500" : "text-white"}`}>{Math.round(data.limit).toLocaleString("tr-TR")} ₺</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Gerçekleşen Harcama</p>
                        <p className={`text-2xl font-bold ${data.spent > 0 ? "text-white" : "text-slate-400"}`}>{data.spent.toLocaleString("tr-TR")} ₺</p>
                    </div>
                </div>

                {/* Status Message Banner */}
                <div className="px-6 pb-2">
                    <div
                        className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium ${
                            data.status === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : data.status === "warning"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : data.status === "danger"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-slate-800 text-slate-400"
                        }`}
                    >
                        {data.status === "success" && (
                            <>
                                <span className="text-lg">🎉</span>
                                <span>
                                    Harika! Limitin altında kalarak <strong>{Math.round(variance).toLocaleString()} ₺</strong> tasarruf ettin.
                                </span>
                            </>
                        )}
                        {data.status === "warning" && (
                            <>
                                <span className="text-lg">⚠️</span>
                                <span>Dikkat! Limite çok yaklaştın.</span>
                            </>
                        )}
                        {data.status === "danger" && (
                            <>
                                <span className="text-lg">🚨</span>
                                <span>
                                    Limit aşıldı! Bütçeden <strong>{Math.abs(Math.round(variance)).toLocaleString()} ₺</strong> fazla harcadın.
                                </span>
                            </>
                        )}
                        {data.status === "neutral" && <span>Henüz işlem yok.</span>}
                    </div>
                </div>

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Günün İşlemleri</h3>
                    {dayTxs.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                            <p>Bugün için kayıtlı işlem yok.</p>
                        </div>
                    ) : (
                        dayTxs.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ${
                                            t.type === "income" ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10" : "bg-rose-500/20 text-rose-400 shadow-rose-500/10"
                                        }`}
                                    >
                                        {t.type === "income" ? "↓" : "↑"}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{t.category}</p>
                                        <p className="text-xs text-slate-400">{t.description || "Açıklama yok"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`font-bold ${t.type === "income" ? "text-emerald-400" : "text-white"}`}>
                                        {t.type === "income" ? "+" : "-"}
                                        {t.amount.toLocaleString("tr-TR")} ₺
                                    </span>
                                    <button
                                        onClick={() => onDeleteTransaction(t.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={onAddTransaction}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Bu Güne İşlem Ekle
                    </button>
                </div>
            </div>
        </div>
    );
};
