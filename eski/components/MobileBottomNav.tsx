import React from 'react';
import { clsx } from 'clsx'; // Mevcut projende var

type Tab = "dashboard" | "calendar" | "history" | "transactions" | "ai" | "settings";

interface MobileBottomNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {

    // Helper: İkon rengi belirleme
    const getIconClass = (tabName: Tab) =>
        clsx("w-6 h-6 transition-colors", activeTab === tabName ? "text-indigo-400" : "text-slate-500");

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe z-50">
            <div className="flex justify-around items-center h-16 px-2">

                {/* 1. Dashboard */}
                <button onClick={() => onTabChange("dashboard")} className="flex flex-col items-center justify-center w-full h-full">
                    <svg className={getIconClass("dashboard")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="text-[10px] mt-1 text-slate-400">Özet</span>
                </button>

                {/* 2. Takvim */}
                <button onClick={() => onTabChange("calendar")} className="flex flex-col items-center justify-center w-full h-full">
                    <svg className={getIconClass("calendar")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] mt-1 text-slate-400">Takvim</span>
                </button>

                {/* 3. Nova (Ortada, Vurgulu) */}
                <button onClick={() => onTabChange("ai")} className="relative -top-5">
                    <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-950",
                        activeTab === "ai" ? "bg-indigo-600 text-white shadow-indigo-500/50" : "bg-slate-800 text-slate-400")}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                </button>

                {/* 4. İşlemler */}
                <button onClick={() => onTabChange("transactions")} className="flex flex-col items-center justify-center w-full h-full">
                    <svg className={getIconClass("transactions")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-[10px] mt-1 text-slate-400">Kayıtlar</span>
                </button>

                {/* 5. Ayarlar */}
                <button onClick={() => onTabChange("settings")} className="flex flex-col items-center justify-center w-full h-full">
                    <svg className={getIconClass("settings")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] mt-1 text-slate-400">Ayarlar</span>
                </button>
            </div>
        </div>
    );
};