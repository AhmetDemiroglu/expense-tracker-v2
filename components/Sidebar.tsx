import React, { useMemo } from "react";
import { User } from "firebase/auth";
import { UserSettings, Transaction } from "../types";
import { calculateHistorySummaries } from "../services/storageService";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import logo1 from "../logo/logo1.png";

type Tab = "dashboard" | "calendar" | "history" | "transactions" | "ai" | "settings";

interface SidebarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    user: User;
    userSettings: UserSettings | null;
    transactions: Transaction[];
    onLogout: () => void;
    onDateSelect: (date: Date) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, user, userSettings, transactions, onLogout, onDateSelect, isOpen, onClose }) => {
    // Geçmiş dönemleri hesapla
    const historyCycles = useMemo(() => {
        if (!userSettings) return [];
        return calculateHistorySummaries(transactions, userSettings);
    }, [transactions, userSettings]);

    const menuItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
        {
            id: "dashboard",
            label: "Genel Bakış",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                </svg>
            ),
        },
        {
            id: "calendar",
            label: "Takvim & Detay",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            id: "history",
            label: "Dönem Geçmişi",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: "transactions",
            label: "Tüm İşlemler",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                </svg>
            ),
        },
        {
            id: "ai",
            label: "Nova AI",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
        },
        {
            id: "settings",
            label: "Ayarlar",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ];

    const sidebarClasses = `fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    }`;

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={onClose} />}

            <div className={sidebarClasses}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center mt-1 gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 bg-slate-300">
                            <img src={logo1} alt="Fintel Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex flex-col justify-center gap-0">
                            FINTEL
                            <span className="text-[10px] text-slate-400 font-mono antialiased">Akıllı finans asistanınız</span>
                            {user.isAnonymous && <span className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold">Misafir Modu</span>}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                        <nav className="px-3 space-y-1">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onTabChange(item.id);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                        activeTab === item.id ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                                    }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </nav>

                        {/* Past Cycles Section */}
                        {historyCycles.length > 0 && (
                            <div className="mt-8 px-3">
                                <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Geçmiş Dönemler</h3>
                                <div className="space-y-1">
                                    {historyCycles.map((cycle) => (
                                        <button
                                            key={cycle.id}
                                            onClick={() => {
                                                onTabChange("calendar");
                                                // Parse start date string to Date object
                                                const [day, month, year] = cycle.startDate.split(".");
                                                const date = new Date(Number(year), Number(month) - 1, Number(day));
                                                onDateSelect(date);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors group"
                                        >
                                            <span>{cycle.startDate}</span>
                                            <span className={`w-2 h-2 rounded-full ${cycle.balance >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">{user.email ? user.email[0].toUpperCase() : "M"}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user.isAnonymous ? "Misafir Kullanıcı" : user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
