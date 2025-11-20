import React, { useState } from "react";
import { Transaction, UserSettings, DailyStatus } from "../types";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, isAfter, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";
import { DayDetailModal } from "./DayDetailModal";

interface CalendarViewProps {
    currentDate: Date;
    onChangeMonth: (date: Date) => void;
    transactions: Transaction[];
    settings: UserSettings;
    onAddTransaction: (date: Date) => void;
    onDeleteTransaction: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, onChangeMonth, transactions, settings, onAddTransaction, onDeleteTransaction }) => {
    const [selectedDay, setSelectedDay] = useState<DailyStatus | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInView = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = monthStart.getDay(); // 0 = Pazar, 1 = Pzt
    const emptyDays = startDay === 0 ? 6 : startDay - 1;

    const getDayData = (day: Date): DailyStatus => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayStart = startOfDay(day);
        const now = new Date();

        // Parse Setting Dates (Inclusive)
        const cycleStart = new Date(settings.periodStartDate);
        const cycleEnd = new Date(settings.periodEndDate);

        // Is this day within the configured period?
        const isWithinCycle = dayStart.getTime() >= startOfDay(cycleStart).getTime() && dayStart.getTime() <= startOfDay(cycleEnd).getTime();

        // 1. O günkü harcamalar
        const dayTransactions = transactions.filter((t) => t.date === dateStr && t.type === "expense");
        const spentToday = dayTransactions.reduce((acc, curr) => acc + curr.amount, 0);

        // Eğer gün dönem dışındaysa sadece harcamayı göster, hesap yapma
        if (!isWithinCycle) {
            return {
                date: dateStr,
                limit: 0,
                spent: spentToday,
                status: "neutral",
                remainingInCycle: 0,
            };
        }

        // 2. Döngü içindeki EK GELİRLER
        const cycleIncomeTransactions = transactions.filter((t) => {
            const tDate = new Date(t.date);
            return t.type === "income" && startOfDay(tDate).getTime() >= startOfDay(cycleStart).getTime() && startOfDay(tDate).getTime() <= startOfDay(cycleEnd).getTime();
        });
        const totalExtraIncome = cycleIncomeTransactions.reduce((acc, t) => acc + t.amount, 0);

        // 3. Toplam Bütçe
        const totalCycleIncome = settings.monthlyIncome + totalExtraIncome;
        const disposableIncome = totalCycleIncome - settings.fixedExpenses;

        // 4. Bugünden ÖNCEKİ harcamalar (Döngü başlangıcından düne kadar)
        const cycleTransactionsBeforeToday = transactions.filter((t) => {
            const tDate = new Date(t.date);
            return t.type === "expense" && startOfDay(tDate).getTime() >= startOfDay(cycleStart).getTime() && startOfDay(tDate).getTime() < dayStart.getTime();
        });
        const spentBeforeToday = cycleTransactionsBeforeToday.reduce((acc, t) => acc + t.amount, 0);

        // 5. Kalan Bütçe
        const remainingBudget = disposableIncome - spentBeforeToday;

        // 6. Kalan Gün Sayısı (Bu günden döngü sonuna kadar, bugün dahil)
        const oneDay = 24 * 60 * 60 * 1000;
        const daysRemaining = Math.floor((startOfDay(cycleEnd).getTime() - dayStart.getTime()) / oneDay) + 1;

        // 7. Günlük Limit Hesaplama
        const dailyLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

        // 8. Durum Belirleme
        let status: DailyStatus["status"] = "neutral";

        if (isAfter(day, now) || !isWithinCycle) {
            status = "neutral";
        } else {
            if (dailyLimit < 0) {
                status = "danger";
            } else {
                if (spentToday > dailyLimit * 1.2) status = "danger";
                else if (spentToday > dailyLimit) status = "warning";
                else status = "success";
            }
        }

        return {
            date: dateStr,
            limit: dailyLimit,
            spent: spentToday,
            status,
            remainingInCycle: remainingBudget - spentToday,
        };
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <button onClick={() => onChangeMonth(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                    ← Önceki Ay
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-white">{format(currentDate, "MMMM yyyy", { locale: tr })}</h2>
                    <p className="text-xs text-slate-500">{settings.periodName ? settings.periodName : "Varsayılan Dönem"}</p>
                </div>
                <button onClick={() => onChangeMonth(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                    Sonraki Ay →
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="grid grid-cols-7 mb-2">
                    {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-slate-500 py-2 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                    {Array.from({ length: emptyDays }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-transparent" />
                    ))}

                    {daysInView.map((day) => {
                        const data = getDayData(day);
                        const isToday = isSameDay(day, new Date());
                        const isFuture = isAfter(day, new Date());
                        const isStart = format(day, "yyyy-MM-dd") === settings.periodStartDate;
                        const isEnd = format(day, "yyyy-MM-dd") === settings.periodEndDate;

                        // Görsel durumlar
                        const showStats = (data.limit !== 0 || data.spent > 0) && !isFuture;
                        const isNegativeLimit = data.limit < 0;

                        return (
                            <div
                                key={day.toISOString()}
                                onClick={() => setSelectedDay(data)}
                                className={clsx(
                                    "aspect-[3/4] md:aspect-square rounded-xl p-1.5 md:p-2 flex flex-col relative border transition-all cursor-pointer",
                                    "hover:bg-slate-700/50 hover:scale-[1.02] active:scale-95",
                                    isToday ? "bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500" : "bg-slate-900/40 border-slate-800",
                                    (isStart || isEnd) && "bg-indigo-500/10 border-indigo-500/30"
                                )}
                            >
                                {/* Date Badge */}
                                <div className="flex flex-col items-start mb-auto w-full">
                                    <div className="flex justify-between w-full">
                                        <span
                                            className={clsx(
                                                "text-xs font-bold rounded-lg w-6 h-6 flex items-center justify-center",
                                                isToday ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 bg-slate-800/50",
                                                (isStart || isEnd) && !isToday && "text-indigo-400 bg-indigo-500/10"
                                            )}
                                        >
                                            {format(day, "d")}
                                        </span>
                                    </div>

                                    {/* Dynamic Period Labels */}
                                    {isStart && (
                                        <div className="w-full bg-indigo-600/20 mt-1 px-1 py-0.5 rounded text-[8px] text-indigo-300 font-bold truncate border border-indigo-500/30">
                                            {settings.periodName ? `${settings.periodName} BAŞI` : "BAŞLA"}
                                        </div>
                                    )}
                                    {isEnd && (
                                        <div className="w-full bg-rose-600/20 mt-1 px-1 py-0.5 rounded text-[8px] text-rose-300 font-bold truncate border border-rose-500/30">
                                            {settings.periodName ? `${settings.periodName} SONU` : "BİTİŞ"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col justify-end gap-0.5 mt-1">
                                    {showStats && (
                                        <>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[9px] text-slate-500 hidden md:block">Limit</span>
                                                <span className={clsx("text-[9px] font-medium", isNegativeLimit ? "text-rose-400" : "text-slate-300")}>{Math.round(data.limit)}</span>
                                            </div>

                                            <div
                                                className={clsx(
                                                    "text-xs md:text-sm font-bold text-right truncate flex items-center justify-end gap-1",
                                                    data.spent > 0 ? (data.status === "danger" ? "text-rose-400" : "text-white") : "text-slate-600"
                                                )}
                                            >
                                                {data.spent > 0 ? `-${Math.round(data.spent)}` : "-"}
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                                                {isNegativeLimit ? (
                                                    <div className="h-full bg-rose-500 w-full opacity-50" />
                                                ) : (
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-500",
                                                            data.status === "success"
                                                                ? "bg-emerald-500"
                                                                : data.status === "warning"
                                                                ? "bg-amber-500"
                                                                : data.status === "danger"
                                                                ? "bg-rose-500"
                                                                : "bg-slate-600"
                                                        )}
                                                        style={{ width: data.limit > 0 ? `${Math.min(100, (data.spent / data.limit) * 100)}%` : "0%" }}
                                                    />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedDay && (
                <DayDetailModal
                    data={selectedDay}
                    transactions={transactions}
                    onClose={() => setSelectedDay(null)}
                    onAddTransaction={() => {
                        onAddTransaction(new Date(selectedDay.date));
                        setSelectedDay(null);
                    }}
                    onDeleteTransaction={onDeleteTransaction}
                />
            )}
        </div>
    );
};
