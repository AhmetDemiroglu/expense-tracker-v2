import React, { useState, useRef, useEffect } from "react";
import { Transaction, UserSettings, AnalysisReport } from "../types";
import { analyzeFinances, askFinancialAdvisor } from "../services/geminiService";
import ReactMarkdown from "react-markdown";
import { User } from "firebase/auth";
import novaIcon from "../logo/nova.ico";
import novaSleep from "../logo/nova_sleep.ico";
import novaThinking from "../logo/nova_thinking.ico";
import novaWarning from "../logo/nova_warning.ico";
import novaShows from "../logo/nova_shows_analyze.ico";
import novaSad from "../logo/nova_sad.ico";
import novaHappy from "../logo/nova_happy.ico";
import novaSuccess from "../logo/nova_success.ico";
import novaAnalyzePos from "../logo/nova_analyze_positive.ico";
import novaAnalyzeNeg from "../logo/nova_analyze_negative.ico";
import { useToast } from "../context/ToastContext";
import { fetchBudgetPeriods, calculateHistorySummaries } from "../services/storageService";
import { CycleSummary } from "../types";
import { NovaReportCard } from "./NovaReportCard";
import { clsx } from "clsx";
import { usePlatform } from "../hooks/usePlatform";

const getDataSignature = (transactions: Transaction[], settings: UserSettings) => {
    return `${transactions.length}-${transactions[0]?.id || "empty"}-${settings.monthlyIncome}-${settings.fixedExpenses}`;
};

interface AIAdvisorProps {
    transactions: Transaction[];
    userSettings: UserSettings;
    user: User;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ transactions, userSettings, user }) => {
    const { showToast } = useToast();
    const { isNative } = usePlatform();
    const hasData = transactions && transactions.length > 0;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-6 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center shadow-xl shadow-indigo-500/10 animate-pulse">
                    <img src={novaIcon} alt="Nova" className="w-12 h-12 opacity-50" />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-white">Henüz Tanışamadık!</h2>
                    <p className="text-slate-400">
                        Finansal asistanın Nova'nın sana öneriler sunabilmesi için önce birkaç harcama veya gelir eklemelisin.
                    </p>
                </div>
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <p className="text-indigo-300 text-sm">👇 Aşağıdaki <b>(+)</b> butonuyla ilk işlemini ekle.</p>
                </div>
            </div>
        );
    }

    const getUserName = () => {
        if (user.displayName) {
            return user.displayName.split(" ")[0];
        }
        if (user.email) {
            const rawName = user.email.split("@")[0];
            const match = rawName.match(/^([a-zA-ZğüşıöçĞÜŞİÖÇ]+)/);
            if (match && match[0]) {
                return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
            }
            return rawName;
        }
        return "Değerli Kullanıcı";
    };
    const userName = getUserName();
    const currentSignature = getDataSignature(transactions, userSettings);

    const [analysis, setAnalysis] = useState<string | null>(() => {
        return sessionStorage.getItem("nova_analysis");
    });

    const [responseStyle, setResponseStyle] = useState<"short" | "balanced" | "detailed">("balanced");
    const [aiMode, setAiMode] = useState<"advisor" | "tutor">("advisor");
    const [prevPeriodStats, setPrevPeriodStats] = useState<CycleSummary | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [question, setQuestion] = useState("");
    const [staleData, setStaleData] = useState(false);

    const [chatHistory, setChatHistory] = useState<{
        role: "user" | "ai";
        text: string;
        type?: "report" | "text";
        reportData?: AnalysisReport;
    }[]>(() => {
        const saved = sessionStorage.getItem("nova_chat_history");
        return saved ? JSON.parse(saved) : [];
    });

    const chatEndRef = useRef<HTMLDivElement>(null);

    const getNovaMood = () => {
        if (loadingAnalysis || loadingChat) return novaThinking;
        if (staleData) return novaWarning;

        const lastMsg = chatHistory[chatHistory.length - 1];
        if (!lastMsg) return novaSleep;

        if (lastMsg.role === 'ai') {
            const text = lastMsg.text.toLowerCase();

            if (lastMsg.type === 'report') {
                if (text.includes("🚨") || text.includes("dikkat") || text.includes("kritik")) return novaAnalyzeNeg;
                return novaAnalyzePos;
            }

            if (text.includes("üzgünüm") || text.includes("maalesef") || text.includes("kötü haber") || text.includes("risk")) return novaSad;
            if (text.includes("harika") || text.includes("tebrik") || text.includes("süper") || text.includes("başardın")) return novaHappy;
            if (text.includes("tamamdır") || text.includes("hallettim") || text.includes("kaydettim")) return novaSuccess;
            if (text.includes("hesap") || text.includes("yüzde") || text.includes("oran") || text.includes("toplam") || text.match(/\d+/)) return novaShows;

            return novaIcon;
        }

        return novaIcon;
    };
    const currentMood = getNovaMood();

    useEffect(() => {
        const loadHistory = async () => {
            const periods = await fetchBudgetPeriods(user.uid);
            if (periods.length > 0) {
                const summaries = calculateHistorySummaries(transactions, periods);
                const currentStart = new Date(userSettings.periodStartDate).getTime();
                const pastPeriods = summaries
                    .filter(s => new Date(s.endDate).getTime() < currentStart)
                    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

                if (pastPeriods.length > 0) {
                    setPrevPeriodStats(pastPeriods[0]);
                }
            }
        };
        loadHistory();
    }, [user.uid, userSettings.periodStartDate, transactions]);

    useEffect(() => {
        if (analysis) {
            sessionStorage.setItem("nova_analysis", analysis);
        } else {
            sessionStorage.removeItem("nova_analysis");
        }
    }, [analysis]);

    const stats = React.useMemo(() => {
        const txIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
        const txExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
        const totalIncome = txIncome + userSettings.monthlyIncome;
        const totalExpense = txExpense + userSettings.fixedExpenses;

        const endDate = new Date(userSettings.periodEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const displayDays = daysRemaining < 0 ? 0 : daysRemaining;

        const expenses = transactions.filter((t) => t.type === "expense");
        const categoryTotals = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

        return { txIncome, txExpense, totalIncome, totalExpense, displayDays, transactionCount: transactions.length, topCategory };
    }, [transactions, userSettings]);

    const handleQuickPrompt = (promptText: string) => {
        if (loadingChat) return;
        const userQ = promptText;
        setChatHistory((prev) => [...prev, { role: "user", text: userQ }]);
        setLoadingChat(true);

        askFinancialAdvisor(transactions, userSettings, userQ, userName, chatHistory, responseStyle, aiMode)
            .then((response) => setChatHistory((prev) => [...prev, { role: "ai", text: response }]))
            .catch(() => setChatHistory((prev) => [...prev, { role: "ai", text: "Hata oluştu." }]))
            .finally(() => setLoadingChat(false));
    };

    const prevSignatureRef = useRef(currentSignature);

    const hasReport = chatHistory.some(msg => msg.type === "report");

    useEffect(() => {
        if (prevSignatureRef.current !== currentSignature) {
            if (hasReport) {
                setStaleData(true);
            }
            prevSignatureRef.current = currentSignature;
        }
    }, [currentSignature, hasReport]);

    useEffect(() => {
        sessionStorage.setItem("nova_chat_history", JSON.stringify(chatHistory));
    }, [chatHistory]);

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
        setLoadingAnalysis(true);
        try {
            const report = await analyzeFinances(transactions, userSettings, userName, responseStyle, prevPeriodStats);

            if (report) {
                setChatHistory(prev => [...prev, {
                    role: "ai",
                    text: report.periodStatus.summary,
                    type: "report",
                    reportData: report
                }]);
                setStaleData(false);
            } else {
                setChatHistory(prev => [...prev, { role: "ai", text: "Üzgünüm, rapor oluşturulurken teknik bir sorun oluştu.", type: "text" }]);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, { role: "ai", text: "Üzgünüm, analiz servisine ulaşamadım.", type: "text" }]);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || loadingChat) return;

        const userQ = question;
        setQuestion("");
        setChatHistory((prev) => [...prev, { role: "user", text: userQ }]);
        setLoadingChat(true);

        try {
            const response = await askFinancialAdvisor(transactions, userSettings, userQ, userName, chatHistory, responseStyle, aiMode);
            setChatHistory((prev) => [...prev, { role: "ai", text: response }]);
        } catch (error) {
            setChatHistory((prev) => [...prev, { role: "ai", text: "Bağlantı hatası oluştu." }]);
        } finally {
            setLoadingChat(false);
        }
    };

    const handleClearChat = () => {
        if (window.confirm("Tüm konuşma geçmişi ve analiz raporu silinecek. Emin misin?")) {
            setChatHistory([]);
            setStaleData(false);
            sessionStorage.removeItem("nova_chat_history");
        }
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Metin panoya kopyalandı", "success");
        } catch (err) {
            console.error("Kopyalama hatası:", err);
            showToast("Kopyalama başarısız oldu", "error");
        }
    };
    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100dvh-120px)] lg:h-[calc(100vh-140px)] min-h-[500px] pb-8">
            {/* SOL PANEL */}
            <div className={clsx("lg:w-1/3 shrink-0 bg-slate-900/50 rounded-2xl border border-slate-800 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[28vh] lg:max-h-full", isNative && "pb-24")}>
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2 sticky top-0 bg-slate-900/90 backdrop-blur py-1 z-10">
                        <img src={currentMood} alt="Nova" className={`w-10 h-10 transition-all duration-500 drop-shadow-lg ${loadingAnalysis || loadingChat ? "animate-pulse" : "hover:scale-110"}`} />
                        Nova Ne Görüyor?
                    </h3>

                    <div className="space-y-3">
                        {/* Dönem Bilgisi Kartı */}
                        <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-indigo-300 uppercase font-bold">Aktif Dönem</span>
                                <span className="text-xs text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded">{stats.displayDays} Gün Kaldı</span>
                            </div>
                            <p className="text-white font-bold">{userSettings.periodName}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {new Date(userSettings.periodStartDate).toLocaleDateString("tr-TR")} - {new Date(userSettings.periodEndDate).toLocaleDateString("tr-TR")}
                            </p>
                        </div>

                        {/* Mobilde yer kaplamaması için bazı detayları gizleyebiliriz veya scroll içinde bırakabiliriz. 
                            Şu an scroll içinde bıraktım. */}

                        {/* İşlem Sayısı */}
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Analiz Edilen İşlem</span>
                            <span className="text-xl font-bold text-white">{stats.transactionCount} Adet</span>
                        </div>

                        {/* Gelir / Gider */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Toplam Gelir</p>
                                <p className="text-emerald-400 font-bold text-sm">+{stats.totalIncome.toLocaleString()}₺</p>
                                <span className="text-[9px] text-slate-500 block mt-0.5">(Maaş Dahil)</span>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Toplam Gider</p>
                                <p className="text-rose-400 font-bold text-sm">-{stats.totalExpense.toLocaleString()}₺</p>
                                <span className="text-[9px] text-slate-500 block mt-0.5">(Sabitler Dahil)</span>
                            </div>
                        </div>

                        {/* Kategori */}
                        {stats.topCategory && (
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">En Çok Harcama</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-white font-bold text-sm">{stats.topCategory[0]}</p>
                                    <p className="text-rose-400 font-bold text-sm">{stats.topCategory[1].toLocaleString()}₺</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Analiz Butonu */}
                <div className="mt-auto pt-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={loadingAnalysis}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-3 lg:p-4 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loadingAnalysis ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <span className="text-xl">✨</span>
                        )}
                        <span className="text-sm lg:text-base">Analiz Raporu Oluştur</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2 hidden lg:block">Yapay zeka, son işlemlerinizi tarayarak size özel tasarruf önerileri sunar.</p>
                </div>
            </div>

            {/* SAĞ PANEL: Chat & Rapor */}
            <div className="flex-1 lg:w-2/3 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-xl relative min-h-0">

                {/* Chat Header */}
                <div className="p-3 lg:p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
                    {/* SOL: Bütünleşik Nova Başlığı ve Mod Değiştirici */}
                    <button
                        onClick={() => setAiMode(prev => prev === "advisor" ? "tutor" : "advisor")}
                        className="group flex items-center gap-3 transition-all active:scale-95 focus:outline-none"
                    >
                        {/* Logo / Avatar Kısmı */}
                        <div className="relative">
                            <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl
                                ${aiMode === "tutor"
                                    ? "bg-gradient-to-br from-purple-600 to-indigo-600"
                                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                                }`}>
                                <img
                                    src={aiMode === "tutor" ? novaShows : novaIcon}
                                    alt="Mod İkonu"
                                    className="w-6 h-6 lg:w-7 lg:h-7 object-contain drop-shadow-md transform transition-transform duration-500 group-hover:rotate-12"
                                />
                            </div>
                            {/* Online Dot */}
                            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiMode === "tutor" ? "bg-purple-400" : "bg-emerald-400"}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-800 ${aiMode === "tutor" ? "bg-purple-500" : "bg-emerald-500"}`}></span>
                            </span>
                        </div>

                        {/* Metin Kısmı */}
                        <div className="text-left">
                            <h3 className="text-white font-bold text-sm leading-tight group-hover:text-indigo-200 transition-colors">
                                Nova AI
                            </h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${aiMode === "tutor" ? "text-purple-400" : "text-emerald-400"}`}>
                                {aiMode === "tutor" ? "Eğitmen" : "Danışman"}
                            </span>
                        </div>

                        {/* Değiştir İkonu */}
                        <div className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity -ml-1 text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </div>
                    </button>

                    {/* SAĞ: Aksiyonlar */}
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                            {(["short", "balanced", "detailed"] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setResponseStyle(s)}
                                    className={`px-2 py-1 text-[10px] rounded-md transition-all ${responseStyle === s ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-indigo-300"}`}>{s === "short" ? "Kısa" : s === "balanced" ? "Dengeli" : "Detaylı"}
                                </button>
                            ))}
                        </div>

                        {(chatHistory.length > 0 || analysis) && (
                            <button
                                onClick={handleClearChat}
                                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-500/10"
                                title="Sohbeti Temizle"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mesaj Alanı */}
                <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 lg:space-y-6 pb-2 custom-scrollbar bg-slate-900/30">
                    {/* Karşılama / Boş State */}
                    {!analysis && chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <p>Nova seni bekliyor...</p>
                        </div>
                    )}

                    {/* Chat Geçmişi */}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                            {msg.type === "report" && msg.reportData ? (
                                <div className="max-w-[100%] w-full group">
                                    <NovaReportCard data={msg.reportData} transactions={transactions} />
                                    <div className="flex justify-end mt-1">
                                        <button
                                            onClick={() => handleCopy(`DURUM: ${msg.reportData!.periodStatus.summary}...`)}
                                            className="text-[10px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 px-2 py-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            Kopyala
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`relative group max-w-[85%] lg:max-w-[75%] rounded-2xl px-4 py-3 lg:px-5 lg:py-4 shadow-md text-sm lg:text-base ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-700 text-slate-200 rounded-bl-none"}`}>
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    {msg.role === "ai" && (
                                        <button
                                            onClick={() => handleCopy(msg.text)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white bg-slate-800/50 rounded p-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Chat Loading */}
                    {(loadingChat || loadingAnalysis) && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Stale Data Uyarısı */}
                {staleData && !loadingAnalysis && (
                    <div className="absolute bottom-[70px] lg:bottom-[80px] left-0 right-0 z-20 px-4 py-2 animate-fade-in-up">
                        <div className="bg-amber-900/60 backdrop-blur-md border border-amber-500/50 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xl">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-400 text-lg animate-pulse">⚠️</span>
                                <div>
                                    <p className="text-amber-200 text-xs font-bold">Veriler Değişti</p>
                                </div>
                            </div>
                            <button onClick={handleAnalyze} className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg">Yenile</button>
                        </div>
                    </div>
                )}

                {/* Hızlı Soru Butonları */}
                {!loadingChat && !loadingAnalysis && !staleData && (
                    <div className="shrink-0 p-2 flex gap-2 overflow-x-auto custom-scrollbar border-t border-slate-700/50 bg-slate-800/80">
                        <button onClick={() => handleQuickPrompt("Genel durumum nasıl?")} className="whitespace-nowrap bg-slate-700/50 border border-slate-600 text-slate-300 text-[10px] lg:text-xs px-3 py-2 rounded-lg">📊 Durum</button>
                        <button onClick={() => handleQuickPrompt("Tasarruf için ne önerirsin?")} className="whitespace-nowrap bg-slate-700/50 border border-slate-600 text-slate-300 text-[10px] lg:text-xs px-3 py-2 rounded-lg">💡 Tasarruf</button>
                        <button onClick={() => handleQuickPrompt("Dönem sonuna ne kadar kalır?")} className="whitespace-nowrap bg-slate-700/50 border border-slate-600 text-slate-300 text-[10px] lg:text-xs px-3 py-2 rounded-lg">📅 Tahmin</button>
                    </div>
                )}

                {/* Input Alanı */}
                <form onSubmit={handleAsk} className="p-3 lg:p-4 bg-slate-800 border-t border-slate-700 flex gap-2 lg:gap-3 shrink-0">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Bir soru sor..."
                        disabled={loadingChat}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!question.trim() || loadingChat}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 shrink-0"
                    >
                        {loadingChat ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <svg className="w-5 h-5 lg:w-6 lg:h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
