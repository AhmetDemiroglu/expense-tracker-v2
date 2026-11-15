import React, { useState, useEffect } from "react";
import { UserSettings } from "../types";
import { FINANCIAL_GOALS, SAVINGS_STYLES, RISK_TOLERANCE } from "../constants";
import { saveUserSettings } from "../services/storageService";
import { useToast } from "../context/ToastContext";

interface NovaProfileSettingsProps {
    userId: string;
    currentSettings: UserSettings;
    onSave: (newSettings: UserSettings) => void;
}

// YARDIMCI BİLEŞEN: Custom Select
const ProfileSelect = ({
    label,
    value,
    options,
    onChange,
    themeColor
}: {
    label: string;
    value: string;
    options: readonly { value: string; label: string; prompt: string }[];
    onChange: (val: string) => void;
    themeColor: "indigo" | "emerald" | "rose";
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o) => o.value === value) || options[0];

    // Renk sınıfları
    const colorClasses = {
        indigo: "text-indigo-300 focus:ring-indigo-500 bg-indigo-600",
        emerald: "text-emerald-300 focus:ring-emerald-500 bg-emerald-600",
        rose: "text-rose-300 focus:ring-rose-500 bg-rose-600",
    };

    return (
        <div className="space-y-2 relative">
            <label className={`block text-xs font-bold uppercase ${colorClasses[themeColor].split(" ")[0]}`}>
                {label}
            </label>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-left text-white flex justify-between items-center hover:border-slate-600 transition-colors"
            >
                <span className="font-medium">{selectedOption.label}</span>
                <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up">
                        <div className="p-1 space-y-0.5">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex flex-col ${value === opt.value
                                            ? `${colorClasses[themeColor].split(" ").pop()} text-white`
                                            : "text-slate-300 hover:bg-slate-700"
                                        }`}
                                >
                                    <span className="font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Prompt Description */}
            <p className="text-[10px] text-slate-500 min-h-[2.5em] leading-relaxed">
                {selectedOption.prompt}
            </p>
        </div>
    );
};

export const NovaProfileSettings: React.FC<NovaProfileSettingsProps> = ({ userId, currentSettings, onSave }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        financialGoal: currentSettings.financialGoal || "stability",
        savingsStyle: currentSettings.savingsStyle || "balanced",
        riskTolerance: currentSettings.riskTolerance || "medium",
    });

    useEffect(() => {
        setFormData({
            financialGoal: currentSettings.financialGoal || "stability",
            savingsStyle: currentSettings.savingsStyle || "balanced",
            riskTolerance: currentSettings.riskTolerance || "medium",
        });
    }, [currentSettings]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const newSettings: UserSettings = { ...currentSettings, ...formData };
            await saveUserSettings(newSettings);
            onSave(newSettings);
            showToast("Nova profili güncellendi", "success");
        } catch (error) {
            console.error("Profil kaydedilemedi", error);
            showToast("Kaydetme başarısız", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 text-slate-300">
            <p className="text-sm text-slate-400">
                Nova'nın sana nasıl rehberlik etmesini istersin? Bu ayarlar, yapay zekanın tavsiye stilini değiştirir.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProfileSelect
                    label="Finansal Hedef"
                    value={formData.financialGoal}
                    options={FINANCIAL_GOALS}
                    onChange={(val) => setFormData({ ...formData, financialGoal: val as any })}
                    themeColor="indigo"
                />

                <ProfileSelect
                    label="Tasarruf Tarzı"
                    value={formData.savingsStyle}
                    options={SAVINGS_STYLES}
                    onChange={(val) => setFormData({ ...formData, savingsStyle: val as any })}
                    themeColor="emerald"
                />

                <ProfileSelect
                    label="Risk Toleransı"
                    value={formData.riskTolerance}
                    options={RISK_TOLERANCE}
                    onChange={(val) => setFormData({ ...formData, riskTolerance: val as any })}
                    themeColor="rose"
                />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        "Profili Güncelle"
                    )}
                </button>
            </div>
        </div>
    );
};