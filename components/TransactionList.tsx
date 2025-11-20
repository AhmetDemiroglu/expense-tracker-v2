import React from "react";
import { Transaction } from "../types";

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                </svg>
                <p>Henüz işlem kaydı bulunmuyor.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map((t) => (
                <div key={t.id} className="group bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === "income" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                        >
                            {t.type === "income" ? "↓" : "↑"}
                        </div>
                        <div>
                            <h4 className="font-medium text-white">{t.category}</h4>
                            <p className="text-sm text-slate-400">{t.description || t.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className={`font-bold ${t.type === "income" ? "text-emerald-400" : "text-white"}`}>
                            {t.type === "income" ? "+" : "-"} {t.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                        </span>
                        <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 transition-all p-2" title="Sil">
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
            ))}
        </div>
    );
};
