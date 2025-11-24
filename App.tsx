import React, { useEffect, useState, Suspense } from "react";
import { Transaction, DashboardStats, UserSettings } from "./types";
import { fetchTransactions, addTransaction, deleteTransaction, deleteGuestTransaction, saveUserSettings, getUserSettings } from "./services/storageService";
import { logout, subscribeToAuth, createGuestUser } from "./services/authService";
const Dashboard = React.lazy(() => import("./components/Dashboard").then((module) => ({ default: module.Dashboard })));
const TransactionList = React.lazy(() => import("./components/TransactionList").then((module) => ({ default: module.TransactionList })));
import { TransactionForm } from "./components/TransactionForm";
const AIAdvisor = React.lazy(() => import("./components/AIAdvisor").then((module) => ({ default: module.AIAdvisor })));
import { CalendarView } from "./components/CalendarView";
const BudgetPlanner = React.lazy(() => import("./components/BudgetPlanner").then((module) => ({ default: module.BudgetPlanner })));
import { AuthModal } from "./components/AuthModal";
const HistoryView = React.lazy(() => import("./components/HistoryView").then((module) => ({ default: module.HistoryView })));
import { Sidebar } from "./components/Sidebar";
import { User } from "firebase/auth";
import logo1 from "./logo/logo1.png";
import { AccountSettings } from "./components/AccountSettings";
import { NovaProfileSettings } from "./components/NovaProfileSettings";
import { startOfDay, differenceInCalendarDays, parseISO } from "date-fns";
import { clsx } from "clsx";
import { usePlatform } from "./hooks/usePlatform";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { useAndroidBack } from "./hooks/useAndroidBack";

type Tab = "dashboard" | "calendar" | "history" | "transactions" | "ai" | "settings";

const App: React.FC = () => {
    const { isNative } = usePlatform();
    const [user, setUser] = useState<User | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formInitialDate, setFormInitialDate] = useState<Date | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    useAndroidBack({
        isFormOpen,
        setIsFormOpen,
        activeTab,
        setActiveTab
    });

    // Auth Listener
    useEffect(() => {
        const unsubscribe = subscribeToAuth(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await loadUserData(currentUser.uid);
            } else {
                const guestId = localStorage.getItem("active_guest");
                if (guestId && !user) {
                    // Guest logic handled separately
                } else if (user && !user.uid.startsWith("guest_")) {
                    setUser(null);
                    setTransactions([]);
                    setUserSettings(null);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const guestId = localStorage.getItem("active_guest");
        if (guestId && !user) {
            const guestUser = createGuestUser(guestId);
            setUser(guestUser);
            loadUserData(guestId);
        }
    }, []);

    const loadUserData = async (uid: string) => {
        setLoading(true);
        const [txs, settings] = await Promise.all([fetchTransactions(uid), getUserSettings(uid)]);
        setTransactions(txs);
        setUserSettings(settings);

        if (!settings) {
            setActiveTab("settings");
        }
        setLoading(false);
    };

    const stats: DashboardStats = React.useMemo(() => {
        if (!userSettings)
            return {
                totalIncome: 0,
                totalExpense: 0,
                balance: 0,
                dailyLimit: 0,
                daysRemaining: 0,
                cycleStartDate: "",
                cycleEndDate: "",
            };

        const start = new Date(userSettings.periodStartDate);
        const end = new Date(userSettings.periodEndDate);
        const now = new Date();
        const todayStart = startOfDay(now);

        const cycleTxs = transactions.filter((t) => {
            const tDate = parseISO(t.date);
            return tDate >= startOfDay(start) && tDate <= end;
        });

        const txExpense = cycleTxs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
        const txIncome = cycleTxs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);

        const totalIncome = txIncome + userSettings.monthlyIncome;
        const totalExpense = txExpense + userSettings.fixedExpenses;
        const balance = totalIncome - totalExpense;

        const txExpenseBeforeToday = cycleTxs.filter((t) => t.type === "expense" && parseISO(t.date) < todayStart).reduce((acc, t) => acc + t.amount, 0);
        const disposableIncome = totalIncome - userSettings.fixedExpenses;

        const budgetAtStartOfDay = disposableIncome - txExpenseBeforeToday;

        let daysRemaining = differenceInCalendarDays(end, now) + 1;

        if (daysRemaining < 0) daysRemaining = 0;
        if (now < start) {
            daysRemaining = differenceInCalendarDays(end, start) + 1;
        }

        const safeDays = daysRemaining === 0 ? 1 : daysRemaining;
        const dailyLimit = budgetAtStartOfDay / safeDays;

        return {
            totalIncome,
            totalExpense,
            balance,
            dailyLimit,
            daysRemaining,
            cycleStartDate: start.toLocaleDateString("tr-TR"),
            cycleEndDate: end.toLocaleDateString("tr-TR"),
        };
    }, [transactions, userSettings]);

    const handleAddTransaction = async (newTx: Omit<Transaction, "userId" | "createdAt">) => {
        if (!user) return;
        const { id, ...txData } = newTx;
        const txWithUser = { ...txData, userId: user.uid, createdAt: Date.now() };
        const added = await addTransaction(txWithUser);
        setTransactions((prev) => [added, ...prev]);
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!user) return;
        if (window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
            if (user.uid.startsWith("guest_")) {
                const newList = deleteGuestTransaction(user.uid, id, transactions);
                setTransactions(newList);
            } else {
                await deleteTransaction(id);
                setTransactions((prev) => prev.filter((t) => t.id !== id));
            }
        }
    };

    const handleAuthSuccess = (isGuest?: boolean, guestId?: string) => {
        if (isGuest && guestId) {
            const guest = createGuestUser(guestId);
            setUser(guest);
            loadUserData(guestId);
        }
    };

    const handleLogout = async () => {
        if (user?.uid.startsWith("guest_")) {
            localStorage.removeItem("active_guest");
            setUser(null);
            setTransactions([]);
            setUserSettings(null);
        } else {
            await logout();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) {
        return <AuthModal onLoginSuccess={handleAuthSuccess} />;
    }

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden pt-safe">
            {/* Sidebar */}
            {!isNative && (
                <Sidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    user={user}
                    userSettings={userSettings}
                    transactions={transactions}
                    onLogout={handleLogout}
                    onDateSelect={(date) => {
                        setCurrentDate(date);
                        setActiveTab("calendar");
                    }}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <div className={clsx("flex-1 flex flex-col min-w-0 transition-all duration-300", !isNative && "md:pl-64")}>
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 bg-slate-300">
                            <img src={logo1} alt="Fintel Logo" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex flex-col justify-center leading-tight font-mono">
                            <span className="text-sm tracking-tight">FINTEL</span>
                            <span className="text-[10px] text-slate-400 antialiased">Akıllı finans asistanınız</span>
                        </div>
                    </div>
                    {!isNative && (
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 p-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                </header>

                {/* Content Scrollable Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {/* Top Bar with Stats (Desktop) */}
                    <div className="hidden md:flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white capitalize">
                                {activeTab === "ai"
                                    ? "Nova AI"
                                    : activeTab === "calendar"
                                        ? "Takvim Yönetimi"
                                        : activeTab === "settings"
                                            ? "Ayarlar"
                                            : activeTab === "dashboard"
                                                ? "Genel Bakış"
                                                : activeTab === "history"
                                                    ? "Dönem Geçmişi"
                                                    : "İşlem Listesi"}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {activeTab === "ai"
                                    ? "Akıllı finans asistanın Nova burada. Harcamalarını analiz eder, sorularını yanıtlar ve sana özel öneriler üretir."
                                    : activeTab === "calendar"
                                        ? "Harcamalarını gün gün takip edebilir, belirli tarihlere hızlıca işlem ekleyebilirsin."
                                        : activeTab === "settings"
                                            ? "Aylık bütçeni, sabit giderlerini ve finansal hedeflerini burada belirle. Nova buna göre hesaplamalarını optimize eder."
                                            : activeTab === "dashboard"
                                                ? "Finansal durumunun hızlı bir özeti burada. Bugünkü limitin ve dönem performansın tamamen senin kontrolünde."
                                                : activeTab === "history"
                                                    ? "Geçmiş dönem performansını analiz ederek bütçe alışkanlıklarını daha iyi yönetebilirsin."
                                                    : "Tüm gelir ve gider kayıtların burada listeleniyor. Dilersen düzenleyebilir veya silebilirsin."}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Limit göstergesi sadece Dashboard/Calendar'da kalsın */}
                            {userSettings && (activeTab === "dashboard" || activeTab === "calendar") && (
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-slate-500">Bugünkü Limit</span>
                                    <span className={`text-xl font-bold ${stats.dailyLimit < 0 ? "text-rose-500" : stats.dailyLimit < 100 ? "text-amber-400" : "text-emerald-400"}`}>
                                        {Math.round(stats.dailyLimit)} ₺
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setFormInitialDate(undefined);
                                    setIsFormOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                İşlem Ekle
                            </button>
                        </div>
                    </div>

                    {/* Mobile Add Button (Floating) */}
                    <button
                        onClick={() => {
                            setFormInitialDate(undefined);
                            setIsFormOpen(true);
                        }}
                        className={clsx(
                            "md:hidden fixed right-6 z-40 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform",
                            isNative ? "bottom-24" : "bottom-6"
                        )}                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    {/* Tab Content */}
                    <div className="pb-20 md:pb-0">
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                </div>
                            }
                        >
                            {activeTab === "settings" && (
                                <div className="animate-fade-in max-w-4xl mx-auto space-y-6 pb-12">
                                    {/* 1. BÖLÜM: Bütçe Planlaması */}
                                    <details className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden" open>
                                        <summary className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                                Bütçe Planlaması
                                            </h2>
                                            <svg
                                                className="w-6 h-6 text-slate-400 transform group-open:rotate-180 transition-transform duration-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </summary>
                                        <div className="p-6 border-t border-slate-800 animate-fade-in">
                                            <BudgetPlanner
                                                userId={user.uid}
                                                currentSettings={userSettings}
                                                onSave={(newSettings) => {
                                                    setUserSettings(newSettings);
                                                }}
                                            />
                                        </div>
                                    </details>
                                    {/* 2. BÖLÜM: Nova Profil Ayarları */}
                                    <details className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-visible">
                                        <summary className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-800/50 hover:bg-slate-800 transition-colors rounded-2xl group-open:rounded-b-none">
                                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                                Nova Profili & Kişiselleştirme
                                            </h2>
                                            <svg className="w-6 h-6 text-slate-400 transform group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </summary>
                                        <div className="p-6 border-t border-slate-800 animate-fade-in">
                                            {userSettings && (
                                                <NovaProfileSettings
                                                    userId={user.uid}
                                                    currentSettings={userSettings}
                                                    onSave={(newSettings) => setUserSettings(newSettings)}
                                                />
                                            )}
                                        </div>
                                    </details>

                                    {/* 3.BÖLÜM: Hesap Güvenliği */}
                                    <details className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                        <summary className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                                                Hesap Güvenliği
                                            </h2>
                                            <svg
                                                className="w-6 h-6 text-slate-400 transform group-open:rotate-180 transition-transform duration-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </summary>
                                        <div className="p-6 border-t border-slate-800 animate-fade-in">
                                            <AccountSettings user={user} />
                                        </div>
                                    </details>
                                </div>
                            )}

                            {activeTab === "dashboard" && userSettings && (
                                <div className="animate-fade-in space-y-6">
                                    {/* Motivation Banner */}
                                    <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="text-indigo-200 text-sm font-medium mb-1">
                                                Aktif Dönem:{" "}
                                                <span className="text-white font-bold">
                                                    {stats.cycleStartDate} - {stats.cycleEndDate}
                                                </span>
                                            </p>
                                            <p className="text-white font-bold text-lg md:text-xl">
                                                Dönem bitişine <span className="text-indigo-400">{stats.daysRemaining} gün</span> kaldı.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl ${stats.balance >= 0 ? "bg-indigo-600" : "bg-rose-600"}`}>
                                                {stats.balance >= 0 ? "🎯" : "🚨"}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Kalan Bütçe</p>
                                                <p className={`font-bold ${stats.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{stats.balance.toLocaleString()} ₺</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Dashboard transactions={transactions} stats={stats} userId={user.uid} userSettings={userSettings} />
                                </div>
                            )}

                            {activeTab === "calendar" && userSettings && (
                                <div className="animate-fade-in max-w-4xl mx-auto">
                                    <CalendarView
                                        currentDate={currentDate}
                                        onChangeMonth={setCurrentDate}
                                        transactions={transactions}
                                        settings={userSettings}
                                        onAddTransaction={(date) => {
                                            setFormInitialDate(date);
                                            setIsFormOpen(true);
                                        }}
                                        onDeleteTransaction={handleDeleteTransaction}
                                    />
                                </div>
                            )}

                            {activeTab === "history" && userSettings && (
                                <div className="animate-fade-in max-w-4xl mx-auto">
                                    <HistoryView
                                        transactions={transactions}
                                        userId={user.uid}
                                        onSelectCycle={(startDate) => {
                                            setCurrentDate(startDate);
                                            setActiveTab("calendar");
                                        }}
                                    />
                                </div>
                            )}

                            {activeTab === "transactions" && (
                                <div className="animate-fade-in max-w-4xl mx-auto">
                                    <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
                                </div>
                            )}

                            {activeTab === "ai" && userSettings && (
                                <div className="animate-fade-in h-[calc(100vh-200px)] min-h-[500px]">
                                    <AIAdvisor transactions={transactions} userSettings={userSettings} user={user} />
                                </div>
                            )}
                        </Suspense>
                    </div>
                </main>
            </div>

            {/* Native Bottom Navigation */}
            {isNative && (
                <MobileBottomNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            )}

            {/* Transaction Form Modal */}
            {isFormOpen && (
                <TransactionForm
                    onAdd={handleAddTransaction}
                    onClose={() => {
                        setIsFormOpen(false);
                        setFormInitialDate(undefined);
                    }}
                    initialDate={formInitialDate}
                />
            )}
        </div>
    );
};

export default App;
