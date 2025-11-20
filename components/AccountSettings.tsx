import React, { useState } from "react";
import { User, updateProfile } from "firebase/auth";
import { updateUserPassword, setInitialPassword } from "../services/authService";
import { useToast } from "../context/ToastContext";
interface AccountSettingsProps {
    user: User;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const [displayName, setDisplayName] = useState(user.displayName || "");
    const [loadingProfile, setLoadingProfile] = useState(false);

    const isPasswordSet = user.providerData.some((p) => p.providerId === "password");

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        setLoadingProfile(true);
        try {
            await updateProfile(user, { displayName: displayName });
            showToast("Profil bilgileri güncellendi.", "success");
        } catch (error) {
            showToast("Profil güncellenirken hata oluştu.", "error");
        } finally {
            setLoadingProfile(false);
        }
    };
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            showToast("Yeni şifre en az 6 karakter olmalıdır.", "warning");
            return;
        }

        setLoading(true);

        try {
            if (isPasswordSet) {
                await updateUserPassword(currentPassword, newPassword);
                showToast("Şifreniz başarıyla güncellendi.", "success");
            } else {
                await setInitialPassword(newPassword);
                showToast("Şifreniz oluşturuldu.", "success");
            }

            setCurrentPassword("");
            setNewPassword("");
        } catch (error: any) {
            console.error(error);
            if (error.code === "auth/wrong-password") {
                showToast("Mevcut şifrenizi yanlış girdiniz.", "error");
            } else if (error.code === "auth/too-many-requests") {
                showToast("Çok fazla deneme yaptınız, lütfen bekleyin.", "warning");
            } else if (error.code === "auth/requires-recent-login") {
                showToast("Güvenlik gereği yeniden giriş yapmanız gerekiyor.", "error");
            } else if (error.code === "auth/popup-closed-by-user") {
                showToast("İşlem iptal edildi.", "info");
            } else {
                showToast("İşlem başarısız oldu. Lütfen tekrar deneyin.", "error");
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

            {/* İsim Güncelleme Formu */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profil Bilgileri
                </h3>
                <form onSubmit={handleProfileUpdate} className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Ad Soyad</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loadingProfile || !displayName.trim() || displayName === user.displayName}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingProfile ? "..." : "Kaydet"}
                    </button>
                </form>
            </div>

            {/* Şifre Formu */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {isPasswordSet ? "Şifre Değiştir" : "Şifre Oluştur"}
                </h3>

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
