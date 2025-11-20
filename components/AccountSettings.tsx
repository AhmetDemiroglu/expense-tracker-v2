import React, { useState } from "react";
import { User } from "firebase/auth";
import { updateUserPassword, setInitialPassword } from "../services/authService";

interface AccountSettingsProps {
    user: User;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const isPasswordSet = user.providerData.some((p) => p.providerId === "password");

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "Yeni şifre en az 6 karakter olmalıdır." });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            if (isPasswordSet) {
                await updateUserPassword(currentPassword, newPassword);
                setMessage({ type: "success", text: "Şifreniz başarıyla güncellendi." });
            } else {
                await setInitialPassword(newPassword);
                setMessage({ type: "success", text: "Şifreniz oluşturuldu. Artık e-posta ve şifrenizle de giriş yapabilirsiniz." });
            }

            setCurrentPassword("");
            setNewPassword("");
        } catch (error: any) {
            console.error(error);
            if (error.code === "auth/wrong-password") {
                setMessage({ type: "error", text: "Mevcut şifrenizi yanlış girdiniz." });
            } else if (error.code === "auth/too-many-requests") {
                setMessage({ type: "error", text: "Çok fazla deneme yaptınız, lütfen bekleyin." });
            } else if (error.code === "auth/requires-recent-login") {
                setMessage({ type: "error", text: "Güvenlik gereği yeniden giriş yapmanız gerekiyor." });
            } else if (error.code === "auth/popup-closed-by-user") {
                setMessage({ type: "error", text: "İşlem iptal edildi." });
            } else {
                setMessage({ type: "error", text: "İşlem başarısız oldu. Lütfen tekrar deneyin." });
            }
        } finally {
            setLoading(false);
        }
    };

    if (user.isAnonymous) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-white font-bold mb-1">Misafir Hesabı</h3>
                <p className="text-slate-400 text-sm">Verilerinizi kaybetmemek için çıkış yapıp yeni bir hesap oluşturmalısınız.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profil Özeti */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">{user.email ? user.email[0].toUpperCase() : "U"}</div>
                <div>
                    <p className="text-white font-medium">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                        {user.emailVerified ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">Doğrulanmış Hesap</span>
                        ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">Doğrulanmamış</span>
                        )}
                        {!isPasswordSet && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">Google Girişi</span>}
                    </div>
                </div>
            </div>

            {/* Şifre Formu */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {isPasswordSet ? "Şifre Değiştir" : "Şifre Oluştur"}
                </h3>

                {message && (
                    <div
                        className={`p-3 mb-4 rounded-lg text-sm ${
                            message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {/* Sadece şifresi varsa mevcut şifreyi sor */}
                    {isPasswordSet && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Mevcut Şifre</label>
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">{isPasswordSet ? "Yeni Şifre" : "Yeni Şifre Belirleyin"}</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                        />
                        {!isPasswordSet && (
                            <p className="text-[10px] text-slate-500 mt-1">Bu şifreyi belirledikten sonra, Google hesabınız olmasa bile e-posta ve şifrenizle giriş yapabileceksiniz.</p>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            )}
                            {isPasswordSet ? "Şifreyi Güncelle" : "Şifreyi Oluştur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
