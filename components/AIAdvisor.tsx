import React, { useState, useRef, useEffect } from "react";
import { Transaction, UserSettings } from "../types";
import { analyzeFinances, askFinancialAdvisor } from "../services/geminiService";
import ReactMarkdown from "react-markdown";

interface AIAdvisorProps {
    transactions: Transaction[];
    userSettings: UserSettings;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ transactions, userSettings }) => {
    const [analysis, setAnalysis] = useState<string | null>(() => {
        return sessionStorage.getItem("nova_analysis");
    });

    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState("");

    const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>(() => {
        const saved = sessionStorage.getItem("nova_chat_history");
        return saved ? JSON.parse(saved) : [];
    });
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (analysis) {
            sessionStorage.setItem("nova_analysis", analysis);
        } else {
            sessionStorage.removeItem("nova_analysis");
        }
    }, [analysis]);

    useEffect(() => {
        sessionStorage.setItem("nova_chat_history", JSON.stringify(chatHistory));
    }, [chatHistory]);

    // Otomatik scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, analysis]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, analysis]);

    // --- İSTATİSTİKLER ---
    // 1. İşlem Toplamları
    const txIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const txExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

    // 2. Genel Toplam (Sabitler Dahil)
    const totalIncome = txIncome + userSettings.monthlyIncome;
    const totalExpense = txExpense + userSettings.fixedExpenses;

    // 3. Dönem Bilgisi
    const endDate = new Date(userSettings.periodEndDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const displayDays = daysRemaining < 0 ? 0 : daysRemaining;

    const transactionCount = transactions.length;

    // 4. Kategori Analizi
    const expenses = transactions.filter((t) => t.type === "expense");
    const categoryTotals = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysis(null);
        try {
            const result = await analyzeFinances(transactions, userSettings);
            setAnalysis(result);
        } catch (error) {
            setAnalysis("Üzgünüm, şu an analiz yapamıyorum. Lütfen daha sonra tekrar dene.");
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || loading) return;

        const userQ = question;
        setQuestion("");
        setChatHistory((prev) => [...prev, { role: "user", text: userQ }]);
        setLoading(true);

        try {
            const response = await askFinancialAdvisor(transactions, userSettings, userQ);
            setChatHistory((prev) => [...prev, { role: "ai", text: response }]);
        } catch (error) {
            setChatHistory((prev) => [...prev, { role: "ai", text: "Bağlantı hatası oluştu." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[550px]">
            {/* SOL PANEL */}
            <div className="lg:w-1/3 bg-slate-900/50 rounded-2xl border border-slate-800 p-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <span className="text-2xl">🤖</span> Nova Ne Görüyor?
                    </h3>

                    <div className="space-y-3">
                        {/* Dönem Bilgisi Kartı */}
                        <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-indigo-300 uppercase font-bold">Aktif Dönem</span>
                                <span className="text-xs text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded">{displayDays} Gün Kaldı</span>
                            </div>
                            <p className="text-white font-bold">{userSettings.periodName}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {new Date(userSettings.periodStartDate).toLocaleDateString("tr-TR")} - {new Date(userSettings.periodEndDate).toLocaleDateString("tr-TR")}
                            </p>
                        </div>

                        {/* İşlem Sayısı */}
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Analiz Edilen İşlem</span>
                            <span className="text-xl font-bold text-white">{transactionCount} Adet</span>
                        </div>

                        {/* Gelir / Gider (Sabitler Dahil) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Toplam Gelir</p>
                                <p className="text-emerald-400 font-bold text-sm">+{totalIncome.toLocaleString()}₺</p>
                                <span className="text-[9px] text-slate-500 block mt-0.5">(Maaş Dahil)</span>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Toplam Gider</p>
                                <p className="text-rose-400 font-bold text-sm">-{totalExpense.toLocaleString()}₺</p>
                                <span className="text-[9px] text-slate-500 block mt-0.5">(Sabitler Dahil)</span>
                            </div>
                        </div>

                        {/* Kategori */}
                        {topCategory && (
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">En Çok Harcama</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-white font-bold text-sm">{topCategory[0]}</p>
                                    <p className="text-rose-400 font-bold text-sm">{topCategory[1].toLocaleString()}₺</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-4 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && !question ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        ) : (
                            <span className="text-xl">✨</span>
                        )}
                        Genel Analiz Raporu Oluştur
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-3">Yapay zeka, son işlemlerinizi tarayarak size özel tasarruf önerileri sunar.</p>
                </div>
            </div>

            {/* SAĞ PANEL: Chat & Rapor */}
            <div className="lg:w-2/3 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-xl">
                {/* Mesaj Alanı */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-900/30">
                    {/* Karşılama / Boş State */}
                    {!analysis && chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                            </svg>
                            <p>Bir soru sor veya analiz başlat...</p>
                        </div>
                    )}

                    {/* Analiz Raporu (Varsa en üstte gösterilir) */}
                    {analysis && (
                        <div className="animate-fade-in-up">
                            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-6 shadow-lg">
                                <h4 className="text-indigo-300 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                                    Finansal Durum Raporu
                                </h4>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Geçmişi */}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-md ${
                                    msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-700 text-slate-200 rounded-bl-none"
                                }`}
                            >
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator (Chat için) */}
                    {loading && question === "" && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-slate-700 rounded-2xl rounded-bl-none px-5 py-4 flex gap-1 items-center">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Input Alanı */}
                <form onSubmit={handleAsk} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Örn: Gelecek ay nasıl tasarruf edebilirim?"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!question.trim() || loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12 h-12"
                    >
                        <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};
