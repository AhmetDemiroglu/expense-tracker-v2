
import React, { useState } from 'react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, createGuestUser } from '../services/authService';

interface AuthModalProps {
  onLoginSuccess: (isGuest?: boolean, guestId?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
        setLoading(true);
        await loginWithGoogle();
        // Auth listener in App.tsx will handle the rest
    } catch (err: any) {
        if (err.code === 'auth/unauthorized-domain') {
            setError(`Domain yetkilendirme hatası! ${window.location.hostname} adresini Firebase'e ekleyin.`);
        } else {
            setError("Google ile giriş başarısız.");
        }
        setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
        if (mode === 'register') {
            await registerWithEmail(email, password);
            setInfo('Kayıt başarılı! Lütfen email kutunuzu kontrol edip doğrulama yapın.');
            setMode('login');
        } else {
            await loginWithEmail(email, password);
        }
    } catch (err: any) {
        setError(err.message || 'Bir hata oluştu.');
    } finally {
        setLoading(false);
    }
  };

  const handleGuest = () => {
      const guest = createGuestUser();
      localStorage.setItem('active_guest', guest.uid);
      onLoginSuccess(true, guest.uid);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                    <span className="text-3xl font-bold text-white">F</span>
                </div>
                <h1 className="text-3xl font-bold text-white">Finans Asistanı</h1>
                <p className="text-slate-400">Akıllı harcama ve bütçe yönetimi</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-800 rounded-xl">
                <button 
                    onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Giriş Yap
                </button>
                <button 
                    onClick={() => { setMode('register'); setError(''); setInfo(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Kayıt Ol
                </button>
            </div>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center">
                    {error}
                </div>
            )}
            {info && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
                    {info}
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                    <input 
                        type="email" 
                        required
                        placeholder="E-posta Adresi"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                    />
                </div>
                <div>
                    <input 
                        type="password" 
                        required
                        placeholder="Parola"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'İşleniyor...' : (mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
                </button>
            </form>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">veya</span></div>
            </div>

            <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Google ile {mode === 'login' ? 'Giriş' : 'Kayıt'}
            </button>

            <button 
                onClick={handleGuest}
                className="w-full text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
            >
                Misafir olarak devam et
            </button>
        </div>
    </div>
  );
};
