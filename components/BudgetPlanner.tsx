import React, { useState, useEffect } from "react";
import { UserSettings, BudgetPeriod } from "../types";
import { saveUserSettings, fetchBudgetPeriods, saveBudgetPeriod, deleteBudgetPeriod } from "../services/storageService";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../context/ToastContext";
interface BudgetPlannerProps {
    userId: string;
    currentSettings: UserSettings | null;
    onSave: (settings: UserSettings) => void;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ userId, currentSettings, onSave }) => {
    const { showToast } = useToast();
    const todayStr = new Date().toISOString().split("T")[0];
    const nextMonthStr = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0];

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [periodName, setPeriodName] = useState("");
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(nextMonthStr);
    const [income, setIncome] = useState("");
    const [fixedExpenses, setFixedExpenses] = useState("");

    // List State
    const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            loadPeriods();
        }
    }, [userId]);

    // Edit moduna geçince formu doldur
    useEffect(() => {
        if (editingId) {
            const p = periods.find((x) => x.id === editingId);
            if (p) {
                setPeriodName(p.name);
                setStartDate(p.startDate);
                setEndDate(p.endDate);
                setIncome(p.monthlyIncome.toString());
                setFixedExpenses(p.fixedExpenses.toString());
            }
        }
    }, [editingId, periods]);

    const loadPeriods = async () => {
        try {
            const list = await fetchBudgetPeriods(userId);
            setPeriods(list);
        } catch (error) {
            console.error("Dönemler yüklenirken hata:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!periodName.trim()) {
            showToast("Lütfen dönem için bir isim giriniz.", "warning");
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            showToast("Bitiş tarihi başlangıç tarihinden önce olamaz.", "warning");
            return;
        }

        setLoading(true);

        try {
            const newPeriod: BudgetPeriod = {
                id: editingId || uuidv4(),
                userId,
                name: periodName,
                startDate,
                endDate,
                monthlyIncome: parseFloat(income) || 0,
                fixedExpenses: parseFloat(fixedExpenses) || 0,
            };

            await saveBudgetPeriod(newPeriod);

            if (editingId && currentSettings) {
                const originalPeriod = periods.find((x) => x.id === editingId);
                const isCurrentlyActive =
                    originalPeriod &&
                    currentSettings.periodName === originalPeriod.name &&
                    currentSettings.periodStartDate === originalPeriod.startDate;

                if (isCurrentlyActive) {
                    const updatedSettings: UserSettings = {
                        ...currentSettings,
                        periodName: newPeriod.name,
                        periodStartDate: newPeriod.startDate,
                        periodEndDate: newPeriod.endDate,
                        monthlyIncome: newPeriod.monthlyIncome,
                        fixedExpenses: newPeriod.fixedExpenses,
                    };

                    await saveUserSettings(updatedSettings);
                    onSave(updatedSettings);
                }
            }

            await loadPeriods();

            showToast(editingId ? "Dönem başarıyla güncellendi." : "Yeni dönem listeye eklendi.", "success");
            resetForm();
        } catch (error) {
            console.error("Kaydetme hatası:", error);
            showToast("Dönem kaydedilirken bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setPeriodName("");
        setStartDate(todayStr);
        setEndDate(nextMonthStr);
        setIncome("");
        setFixedExpenses("");
    };

    const handleEdit = (p: BudgetPeriod) => {
        setEditingId(p.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleActivate = async (p: BudgetPeriod) => {
        setLoading(true);
        try {
            const settings: UserSettings = {
                userId,
                periodName: p.name,
                periodStartDate: p.startDate,
                periodEndDate: p.endDate,
                monthlyIncome: p.monthlyIncome,
                fixedExpenses: p.fixedExpenses,
                currency: "TRY",
            };

            await saveUserSettings(settings);
            onSave(settings);
            await loadPeriods();

            showToast(`${p.name} dönemi aktif edildi.`, "success");
        } catch (error) {
            showToast("Aktifleştirme başarısız oldu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bu dönem kaydını silmek istediğinize emin misiniz?")) {
            try {
                await deleteBudgetPeriod(userId, id);
                await loadPeriods();
                if (editingId === id) resetForm();
                showToast("Dönem silindi.", "info");
            } catch (error) {
                showToast("Silme işlemi başarısız.", "error");
            }
        }
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
        <div className="max-w-4xl mx-auto space-y-8 mt-3 pb-4">
            {/* --- FORM SECTION --- */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl animate-fade-in">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className={`p-3 rounded-lg text-white ${editingId ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{editingId ? "Dönemi Düzenle" : "Yeni Dönem Oluştur"}</h2>
                        <p className="text-sm text-slate-400">{editingId ? "Seçili dönemin bilgilerini güncelliyorsunuz." : "Önce dönemi oluşturun, sonra aşağıdaki listeden seçerek aktif edin."}</p>
                    </div>
                    {editingId && (
                        <button onClick={resetForm} className="ml-auto text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition">
                            Vazgeç / Yeni Ekle
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* İsimlendirme */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Dönem Adı (Etiket)</label>
                        <input
                            type="text"
                            required
                            value={periodName}
                            onChange={(e) => setPeriodName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                            placeholder="Örn: Kasım 2025, Yaz Tatili, Kredi Ödeme Dönemi..."
                        />
                    </div>

                    {/* Tarih Aralığı */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Başlangıç Tarihi (Dahil)</label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Bitiş Tarihi (Dahil)</label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2 text-xs text-indigo-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                                Bu dönem toplam <strong>{isNaN(duration) ? 0 : duration} Gün</strong> sürecektir.
                            </span>
                        </div>
                    </div>

                    {/* Finansal Bilgiler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Sabit Gelir (Maaş vb.)</label>
                            <input
                                type="number"
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Sabit Giderler Toplamı</label>
                            <input
                                type="number"
                                value={fixedExpenses}
                                onChange={(e) => setFixedExpenses(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center gap-2 text-lg
                ${editingId ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"}`}
                    >
                        {loading ? "İşleniyor..." : editingId ? "Değişiklikleri Kaydet (Listeyi Güncelle)" : "Dönemi Listeye Ekle"}
                    </button>
                </form>
            </div>

            {/* --- LIST SECTION --- */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white px-2 border-l-4 border-indigo-500 pl-3">Kayıtlı Dönemlerim</h3>

                {periods.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 bg-slate-800/30">
                        <p className="mb-2">Henüz kayıtlı bir döneminiz yok.</p>
                        <p className="text-sm">Yukarıdaki formu doldurup "Dönemi Listeye Ekle" butonuna basın.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {periods.map((p) => {
                            // Aktiflik kontrolü: Sadece tarihlere değil isme de bakıyoruz
                            const isActive = currentSettings?.periodName === p.name && currentSettings?.periodStartDate === p.startDate;

                            const pStart = new Date(p.startDate);
                            const pEnd = new Date(p.endDate);
                            const pDays = Math.floor((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            const netBudget = p.monthlyIncome - p.fixedExpenses;

                            return (
                                <div
                                    key={p.id}
                                    className={`relative p-5 rounded-xl border transition-all ${isActive
                                            ? "bg-slate-800 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-900/20"
                                            : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                                        }`}
                                >
                                    {isActive && (
                                        <span className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded border border-emerald-500/30 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            AKTİF
                                        </span>
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <h4 className={`text-lg font-bold ${isActive ? "text-white" : "text-slate-300"}`}>{p.name}</h4>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-2">
                                                <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                                    📅 {p.startDate} ➜ {p.endDate}
                                                </span>
                                                <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">⏱️ {pDays} Gün</span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500 block text-xs">Gelir</span>
                                                    <span className="text-emerald-400 font-medium">{p.monthlyIncome.toLocaleString()} ₺</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-xs">Gider</span>
                                                    <span className="text-rose-400 font-medium">{p.fixedExpenses.toLocaleString()} ₺</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-xs">Net Bütçe</span>
                                                    <span className="text-white font-medium">{netBudget.toLocaleString()} ₺</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 mt-4 md:mt-0 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                                            {!isActive && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleActivate(p)}
                                                    disabled={loading}
                                                    className="flex-1 md:flex-none w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <span className="animate-pulse">İşleniyor...</span>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Bu Dönemi Aktif Et
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex items-center gap-2 w-full justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(p)}
                                                    className="flex-1 md:flex-none px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                        />
                                                    </svg>
                                                    Düzenle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(p.id)}
                                                    className="flex-1 md:flex-none px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 border border-rose-500/20"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
