import React, { useState, useEffect } from "react";
import { Transaction, TransactionType, Category } from "../types";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../context/ToastContext";
import { parseReceipt } from "../services/geminiService";
import { processReceiptFile } from "../services/geminiService";

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
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (initialDate) {
            setDate(initialDate.toISOString().split("T")[0]);
        }
    }, [initialDate]);

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast("Dosya boyutu çok yüksek (Max 5MB).", "warning");
            return;
        }

        setIsScanning(true);
        try {
            const result = await processReceiptFile(file);

            if (result) {
                setAmount(result.amount.toString());
                setDescription(result.description);
                if (result.category) setCategory(result.category);
                if (result.date) setDate(result.date);
                setType("expense");

                showToast("Fiş/Fatura başarıyla okundu!", "success");
            } else {
                showToast("Belgeden anlamlı veri çıkarılamadı.", "error");
            }
        } catch (error) {
            console.error("Upload hatası:", error);
            showToast("İşlem sırasında hata oluştu.", "error");
        } finally {
            setIsScanning(false);
        }
    };

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

    const FormSelect = ({
        value,
        onChange,
        options,
        label
    }: {
        value: string;
        onChange: (val: string) => void;
        options: string[];
        label: string;
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="space-y-1 relative">
                <label className="text-xs text-slate-400 font-medium">{label}</label>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-left text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none flex justify-between items-center transition-colors hover:border-slate-600"
                >
                    <span className={value ? "text-white" : "text-slate-500"}>
                        {value || "Seçiniz"}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto custom-scrollbar animate-fade-in-up">
                            <div className="p-1 space-y-0.5">
                                {options.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${value === opt ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-visible animate-fade-in-up">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-2xl">
                    <h2 className="text-xl font-semibold text-white">
                        {initialDate ? "Geçmişe İşlem Ekle" : "Yeni İşlem Ekle"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Fiş Yükleme Alanı */}
                    <div className="relative group">
                        <label className={`
                            flex items-center justify-center gap-3 w-full p-4 rounded-xl border border-dashed border-slate-600 
                            cursor-pointer transition-all duration-300 relative overflow-hidden
                            ${isScanning ? "bg-slate-800 opacity-80 cursor-not-allowed" : "hover:border-indigo-500 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-indigo-500/10"}
                        `}>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleReceiptUpload}
                                disabled={isScanning}
                                className="hidden"
                            />

                            {isScanning ? (
                                <div className="flex flex-col items-center gap-2 text-indigo-400">
                                    <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
                                    <span className="text-xs font-bold animate-pulse">Belge Analiz Ediliyor...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20">
                                        <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {/* Belge ikonu */}
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                                            Fiş veya Fatura Yükle
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            Resim (JPG, PNG) veya PDF
                                        </span>
                                    </div>
                                </>
                            )}
                        </label>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Toggle (Aynı) */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => { setType("expense"); setCategory(""); }}
                                className={`py-2 text-sm font-medium rounded-md transition-all ${type === "expense" ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                            >
                                Gider
                            </button>
                            <button
                                type="button"
                                onClick={() => { setType("income"); setCategory(""); }}
                                className={`py-2 text-sm font-medium rounded-md transition-all ${type === "income" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                            >
                                Gelir
                            </button>
                        </div>

                        {/* Amount & Date (Aynı) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Tutar (TL)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
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

                        {/* GÜNCELLENDİ: Custom Category Select */}
                        <FormSelect
                            label="Kategori"
                            value={category}
                            options={categories}
                            onChange={setCategory}
                        />

                        {/* Description (Aynı) */}
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Açıklama (İsteğe bağlı)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
                                placeholder="Örn: Market alışverişi"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Kaydet
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
