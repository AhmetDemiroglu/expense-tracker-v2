import React, { useEffect, useState } from "react";
import { RecurringTransaction, Category } from "../types";
import { fetchRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from "../services/storageService";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

interface SubscriptionsViewProps {
    userId: string;
    onBack: () => void;
    onUpdate: () => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ userId, onBack, onUpdate }) => {
    const [list, setList] = useState<RecurringTransaction[]>([]);
    const { confirm } = useConfirm();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);

    // Hangi kartın altında form açık? (null = yeni ekleme modu veya kapalı)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [frequency, setFrequency] = useState<"monthly" | "weekly" | "yearly">("monthly");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        const data = await fetchRecurringTransactions(userId);
        setList(data);
        setLoading(false);
    };

    const resetForm = () => {
        setName("");
        setAmount("");
        setFrequency("monthly");
        setStartDate(new Date().toISOString().split('T')[0]);
        setEditingId(null);
        setIsAddingNew(false);
    };

    const handleEditClick = (sub: RecurringTransaction) => {
        // Aynı karta tıklandıysa kapat
        if (editingId === sub.id) {
            resetForm();
            return;
        }

        setEditingId(sub.id);
        setIsAddingNew(false);
        setName(sub.description);
        setAmount(sub.amount.toString());
        setFrequency(sub.frequency);
        setStartDate(sub.startDate);
    };

    const handleAddNewClick = () => {
        resetForm();
        setIsAddingNew(true);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Aboneliği Sil",
            message: "Bu düzenli ödeme planını silmek istediğine emin misin? Geçmişe eklenen işlemler silinmez, sadece gelecek planı iptal edilir.",
            confirmText: "Evet, Sil",
            cancelText: "Vazgeç",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            await deleteRecurringTransaction(userId, id);
            setList(prev => prev.filter(item => item.id !== id));
            onUpdate();
            showToast("Abonelik başarıyla silindi.", "success");
        } catch (error) {
            console.error("Silme hatası:", error);
            showToast("Silinirken bir hata oluştu.", "error");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            // Düzenleme modu
            const existingSub = list.find(s => s.id === editingId);
            if (!existingSub) return;

            const updatedSub: RecurringTransaction = {
                ...existingSub,
                description: name,
                amount: parseFloat(amount),
                frequency,
                startDate,
            };

            await updateRecurringTransaction(updatedSub);
            setList(prev => prev.map(item => item.id === updatedSub.id ? updatedSub : item));
            showToast("Abonelik güncellendi.", "success");
        } else {
            // Yeni ekleme modu
            const newSub: Omit<RecurringTransaction, "id"> = {
                userId,
                type: "expense",
                category: Category.ABONELIK,
                amount: parseFloat(amount),
                description: name,
                frequency,
                startDate,
                nextDueDate: startDate,
                isActive: true
            };
            await addRecurringTransaction(newSub);
            await loadData();
            showToast("Abonelik eklendi.", "success");
        }

        onUpdate();
        resetForm();
    };

    const subscriptionFormJSX = (
        <form onSubmit={handleSave} className="bg-slate-900/80 p-4 rounded-xl border border-indigo-500/30 space-y-3 animate-fade-in">
            <div>
                <label className="text-xs text-slate-400 block mb-1">Başlık (Örn: Netflix, Aidat)</label>
                <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Netflix"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Tutar (TL)</label>
                    <input
                        required
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="99.90"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Sıklık</label>
                    <select
                        value={frequency}
                        onChange={(e: any) => setFrequency(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="monthly">Aylık</option>
                        <option value="weekly">Haftalık</option>
                        <option value="yearly">Yıllık</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-xs text-slate-400 block mb-1">İlk Ödeme Tarihi</label>
                <input
                    required
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2.5 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                    {editingId ? "Güncelle" : "Kaydet"}
                </button>
            </div>
        </form>
    );

    if (loading) return <div className="text-center py-10 text-slate-500">Yükleniyor...</div>;

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold text-white">Abonelikler ve Düzenli Ödemeler</h2>
            </div>

            {/* Yeni Ekleme Butonu */}
            {!isAddingNew && !editingId && (
                <button
                    onClick={handleAddNewClick}
                    className="w-full py-3 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Yeni Abonelik Ekle
                </button>
            )}

            {/* Yeni Ekleme Formu (Listenin Üstünde) */}
            {isAddingNew && subscriptionFormJSX}

            {/* Liste */}
            <div className="space-y-2">
                {list.length === 0 && !isAddingNew ? (
                    <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-2xl border border-slate-800">
                        <p>Henüz düzenli bir ödeme tanımlanmamış.</p>
                        <p className="text-xs mt-1">Netflix, Kira, Fatura gibi her ay tekrarlayan ödemelerini ekle.</p>
                    </div>
                ) : (
                    list.map(sub => (
                        <div key={sub.id} className="space-y-2">
                            {/* Kart */}
                            <div className={`bg-slate-800 p-4 rounded-xl border transition-colors ${editingId === sub.id ? 'border-indigo-500' : 'border-slate-700'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-white">{sub.description}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <span className="capitalize">
                                                {sub.frequency === "monthly" ? "Aylık" : sub.frequency === "weekly" ? "Haftalık" : "Yıllık"}
                                            </span>
                                            <span>•</span>
                                            <span>Sonraki: {new Date(sub.nextDueDate).toLocaleDateString("tr-TR")}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="block font-bold text-white">{sub.amount} ₺</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${sub.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>
                                                {sub.isActive ? "Aktif" : "Pasif"}
                                            </span>
                                        </div>

                                        {/* Aksiyon Butonları */}
                                        <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                                            <button
                                                onClick={() => handleEditClick(sub)}
                                                className={`p-2 rounded-lg transition-colors ${editingId === sub.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-indigo-400 hover:bg-indigo-500/10'}`}
                                                title="Düzenle"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sub.id)}
                                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Inline Form (Kartın Hemen Altında) */}
                            {editingId === sub.id && subscriptionFormJSX}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};