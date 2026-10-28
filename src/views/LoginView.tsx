import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Palette,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage(null);
    try {
      setLoading(true);
      await login(fillEmail, fillPass);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login rápido.');
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
              Informe suas credenciais para visualizar seu painel e solicitações
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
                  placeholder="ex: elias@bbg.com ou marketing@bbg.com"
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

          {/* Quick Access Helper */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Contas cadastradas para acesso:</span>
            </div>

            <div className="space-y-2">
              {/* Elias Alves (Admin) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('elias@bbg.com', 'bbg123')}
                className="w-full text-left p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-indigo-950 group-hover:text-indigo-800">
                      Elias Alves — Designer (Admin)
                    </p>
                    <p className="text-[11px] text-indigo-700/80 font-mono">elias@bbg.com • bbg123</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                  Entrar
                </span>
              </button>

              {/* Mariana Silva (Marketing BBG) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('marketing@bbg.com', 'bbg123')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                      Mariana Silva — BBG (Marketing)
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">marketing@bbg.com • bbg123</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                  Entrar
                </span>
              </button>

              {/* Carlos Eduardo (Comercial BBG) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('comercial@bbg.com', 'bbg123')}
                className="w-full text-left p-2 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center justify-between text-slate-600"
              >
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800">Carlos Eduardo (Comercial)</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-2">comercial@bbg.com</span>
                </div>
                <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  Entrar
                </span>
              </button>

              {/* Renata Vasconcelos (Diretoria BBG) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('diretoria@bbg.com', 'bbg123')}
                className="w-full text-left p-2 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center justify-between text-slate-600"
              >
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800">Renata Vasconcelos (Diretoria)</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-2">diretoria@bbg.com</span>
                </div>
                <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  Entrar
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          BBG Brasil • Franquia de 30 artes mensais compartilhadas
        </p>
      </div>
    </div>
  );
};
