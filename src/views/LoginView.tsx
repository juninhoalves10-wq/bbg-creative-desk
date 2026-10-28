import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Palette,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved email on mount if user opted to remember login
  useEffect(() => {
    const savedEmail = localStorage.getItem('bbg_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // Handle remember email preference
      if (rememberMe) {
        localStorage.setItem('bbg_saved_email', email.trim());
      } else {
        localStorage.removeItem('bbg_saved_email');
      }

      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon & Heading */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white shadow-md mb-4">
          <Palette className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">BBG Creative Desk</h1>
        <p className="text-sm text-slate-600 mt-1 font-medium">
          Gestão de Criação & Franquia Mensal — Elias Alves Designer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Acesse sua conta</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entre com suas credenciais para visualizar suas solicitações e entregas
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                E-mail de acesso
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me / Salvar login */}
            <div className="flex items-center justify-between pt-1">
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-medium">Salvar meu e-mail neste navegador</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          BBG Brasil • Franquia de 30 artes mensais compartilhadas
        </p>
      </div>
    </div>
  );
};
