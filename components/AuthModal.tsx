import React, { useState } from "react";
import { loginWithGoogle, loginWithEmail, registerWithEmail, createGuestUser, resetPassword } from "../services/authService";
import { useToast } from "../context/ToastContext";
import logo1 from "../logo/logo1.png";
import { seedGuestData } from "../services/demoService";

interface AuthModalProps {
    onLoginSuccess: (isGuest?: boolean, guestId?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<"login" | "register" | "reset">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await resetPassword(email);
            showToast("Sıfırlama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin.", "success");
            setTimeout(() => setMode("login"), 3000);
        } catch (err: any) {
            if (err.code === "auth/user-not-found") showToast("Bu e-posta ile kayıtlı kullanıcı bulunamadı.", "error");
            else showToast("İşlem başarısız. Lütfen tekrar deneyin.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await loginWithGoogle();
            // Başarılı girişte bir şey yapmaya gerek yok, listener halleder.
        } catch (err: any) {
            if (err.code === "auth/unauthorized-domain") {
                showToast(`Domain yetkilendirme hatası! ${window.location.hostname} adresini Firebase'e ekleyin.`, "error");
            } else if (err.code === "auth/popup-closed-by-user") {
                showToast("Giriş işlemi iptal edildi.", "info");
            } else {
                showToast("Google ile giriş başarısız.", "error");
            }
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === "register") {
                await registerWithEmail(email, password);
                showToast("Kayıt başarılı! Hesabınız oluşturuldu. Lütfen giriş yapın.", "success");
                setMode("login");
                setPassword("");
            } else {
                await loginWithEmail(email, password);
            }
        } catch (err: any) {
            console.error("Auth Hatası:", err);
            if (err.code === "auth/email-already-in-use") {
                showToast("Bu e-posta adresi zaten kullanımda.", "warning");
            } else if (err.code === "auth/invalid-email") {
                showToast("Geçersiz e-posta formatı.", "warning");
            } else if (err.code === "auth/weak-password") {
                showToast("Şifre çok zayıf (en az 6 karakter olmalı).", "warning");
            } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                showToast("E-posta veya şifre hatalı.", "error");
            } else {
                showToast("Giriş yapılamadı. Lütfen tekrar deneyin.", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        try {
            const guest = createGuestUser();
            seedGuestData(guest.uid);
            localStorage.setItem("active_guest", guest.uid);
            onLoginSuccess(true, guest.uid);
        } catch (error) {
            console.error("Misafir girişi hatası:", error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3 bg-slate-300">
                        <img src={logo1} alt="Fintel Logo" className="w-12 h-12 object-contain" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        FINTEL
                        <small className="text-[12px] text-slate-400 font-mono antialiased ">Akıllı finans asistanınız</small>
                    </div>
                </div>

                {mode === "reset" ? (
                    <div className="mb-6 text-center animate-fade-in">
                        <h2 className="text-xl font-bold text-white">Şifre Sıfırlama</h2>
                        <p className="text-sm text-slate-400">Hesabınıza ait e-posta adresini girin.</p>
                    </div>
                ) : (
                    <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
                        <button
                            onClick={() => {
                                setMode("login");
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                        >
                            Giriş Yap
                        </button>
                        <button
                            onClick={() => {
                                setMode("register");
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                        >
                            Kayıt Ol
                        </button>
                    </div>
                )}

                {mode === "reset" ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4 animate-fade-in">
                        <div>
                            <input
                                type="email"
                                required
                                placeholder="E-posta Adresi"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode("login");
                            }}
                            className="w-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Giriş Ekranına Dön
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                required
                                placeholder="E-posta Adresi"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                placeholder="Parola"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>

                        {/* Şifremi Unuttum Linki (Sadece Login modunda) */}
                        {mode === "login" && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("reset");
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Şifremi Unuttum?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "İşleniyor..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
                        </button>
                    </form>
                )}

                {mode !== "reset" && (
                    <>
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-900 px-2 text-slate-500">veya</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            Google ile {mode === "login" ? "Giriş" : "Kayıt"}
                        </button>

                        <button
                            onClick={handleGuestLogin}
                            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Misafir Olarak İncele</span>
                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded ml-1">Örnek Veriler</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
