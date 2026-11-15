import React from "react";
import { AnalysisReport, Transaction } from "../types";

interface NovaReportCardProps {
    data: AnalysisReport;
    transactions: Transaction[]; // EKLENDİ
}

export const NovaReportCard: React.FC<NovaReportCardProps> = ({ data, transactions }) => {
    const { periodStatus, spendingHabits, savingsTips, novaNote } = data;

    // Mood Style Logic (Aynı)
    const moodColors = {
        positive: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
        critical: "from-rose-500/20 to-orange-500/20 border-rose-500/30 text-rose-300",
        neutral: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30 text-indigo-300",
    };
    const moodIcon = { positive: "⭐", critical: "🚨", neutral: "📊" };
    const currentStyle = moodColors[periodStatus.mood] || moodColors.neutral;

    // YENİ: Kategori bazlı harcama hesaplayıcı
    const getCategorySpend = (categoryName?: string) => {
        if (!categoryName) return 0;
        // Basit bir eşleşme yapıyoruz (küçük harf duyarlı)
        return transactions
            .filter(t => t.type === "expense" && t.category.toLowerCase().includes(categoryName.toLowerCase()))
            .reduce((acc, t) => acc + t.amount, 0);
    };

    return (
        <div className="space-y-3 w-full animate-fade-in-up">
            {/* 1. ÖZET KARTI */}
            <div className={`bg-gradient-to-br ${currentStyle} border rounded-2xl p-4 relative overflow-hidden`}>
                <div className="flex items-start gap-3 relative z-10">
                    <span className="text-2xl bg-slate-900/50 rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                        {moodIcon[periodStatus.mood]}
                    </span>
                    <div>
                        <h4 className="font-bold text-sm uppercase opacity-80 tracking-wider mb-1">Dönem Durumu</h4>
                        <p className="text-sm font-medium text-slate-200 leading-relaxed">{periodStatus.summary}</p>
                    </div>
                </div>
            </div>

            {/* 2. HARCAMA ALIŞKANLIKLARI */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Tespitler
                </h4>
                <ul className="space-y-2">
                    {spendingHabits.items.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 3. AKSİYON ODAKLI TASARRUF ÖNERİLERİ */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase ml-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Aksiyon Planı
                </h4>

                {savingsTips.map((tip, idx) => {
                    const currentSpend = tip.targetCategory ? getCategorySpend(tip.targetCategory) : 0;
                    const potentialSave = (currentSpend > 0 && tip.suggestedCut)
                        ? (currentSpend * tip.suggestedCut) / 100
                        : 0;

                    return (
                        <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                                <h5 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                                    {tip.title}
                                </h5>
                                {potentialSave > 0 && (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                                        +{potentialSave.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}₺ Potansiyel
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                                {tip.description}
                            </p>

                            {/* Data Fusion Bar */}
                            {currentSpend > 0 && tip.suggestedCut && (
                                <div className="bg-slate-900 rounded-lg px-3 pt-3 pb-1 mt-2">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wider">
                                        <span>Şu Anki Harcama</span>
                                        <span className="text-emerald-500">Hedeflenen</span>
                                    </div>

                                    <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                                        <div className="absolute top-0 left-0 h-full w-full bg-slate-600" />
                                        <div
                                            className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-1000"
                                            style={{ width: `${100 - tip.suggestedCut}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-white font-mono">{currentSpend.toLocaleString()}₺</span>
                                        <span className="text-emerald-400 font-mono font-bold">
                                            {(currentSpend - potentialSave).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}₺
                                        </span>
                                    </div>

                                    <p className="text-[9px] text-slate-500 mt-1 text-center border-t border-slate-800 pt-1">
                                        Bu kalemde %{tip.suggestedCut} tasarruf yaparsan <span className="text-emerald-400">{potentialSave.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}₺</span> cebinde kalır.
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 4. NOVA NOTU (Aynı) */}
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3 mt-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-lg shrink-0">🎯</div>
                <p className="text-xs text-indigo-200 italic">"{novaNote}"</p>
            </div>
        </div>
    );
};