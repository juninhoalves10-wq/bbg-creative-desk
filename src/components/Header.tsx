import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Bell, RefreshCw, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedCompetency: string;
  onCompetencyChange?: (comp: string) => void;
  availableCompetencies?: { key: string; name: string }[];
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedCompetency,
  onCompetencyChange,
  availableCompetencies = [],
  onRefresh,
}) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Competency selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-500">Competência:</span>
          {availableCompetencies.length > 0 && onCompetencyChange ? (
            <select
              value={selectedCompetency}
              onChange={(e) => onCompetencyChange(e.target.value)}
              className="bg-transparent font-bold text-slate-900 border-none outline-none cursor-pointer"
            >
              {availableCompetencies.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold text-slate-900">Outubro/2026</span>
          )}
        </div>

        {/* Logged in user info badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 leading-none">{user?.name}</span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {isAdmin ? 'Designer (Admin)' : `BBG • ${user?.department || 'Equipe'}`}
            </span>
          </div>
        </div>

        {/* Real Logout button */}
        <button
          onClick={logout}
          title="Sair da conta"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Recarregar dados"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
