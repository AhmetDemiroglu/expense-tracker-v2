import React, { useState, useEffect } from "react";
import { Transaction, TransactionType, Category } from "../types";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../context/ToastContext";

interface TransactionFormProps {
    onAdd: (transaction: Omit<Transaction, "userId" | "createdAt">) => void;
    onClose: () => void;
    initialDate?: Date;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, onClose, initialDate }) => {
    const { showToast } = useToast();
    const [type, setType] = useState<TransactionType>("expense");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<string>("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        if (initialDate) {
            setDate(initialDate.toISOString().split("T")[0]);
        }
    }, [initialDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            showToast("Lütfen geçerli bir tutar giriniz.", "warning");
            return;
        }
        if (!category) {
            showToast("Lütfen bir kategori seçiniz.", "warning");
            return;
        }

        const newTransaction: Omit<Transaction, "userId" | "createdAt"> = {
            id: uuidv4(),
            amount: parseFloat(amount),
            description: description.trim(),
            type,
            category,
            date,
        };

        try {
            onAdd(newTransaction);
            showToast("İşlem başarıyla eklendi.", "success");
            onClose();
        } catch (error) {
            showToast("İşlem eklenirken bir hata oluştu.", "error");
        }
    };

    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Yeni İşlem Ekle</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type Toggle */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                setType("expense");
                                setCategory("");
                            }}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === "expense" ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                        >
                            Gider
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setType("income");
                                setCategory("");
                            }}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === "income" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                        >
                            Gelir
                        </button>
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Tutar (TL)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Tarih</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Kategori</label>
                        <select
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                        >
                            <option value="" disabled>
                                Seçiniz
                            </option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Açıklama (İsteğe bağlı)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Örn: Market alışverişi"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        Kaydet
                    </button>
                </form>
            </div>
        </div>
    );
};
