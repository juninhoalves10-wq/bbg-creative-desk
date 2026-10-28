import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Bell, Shield, Users, RefreshCw } from 'lucide-react';

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
  const { user, isAdmin, switchUser } = useAuth();

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

        {/* Quick Role Switcher Bar for immediate interactive testing */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Simular:</span>
          <button
            onClick={() => switchUser('user-elias-admin')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              user?.id === 'user-elias-admin'
                ? 'bg-white text-indigo-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3 h-3 text-indigo-600" />
            <span>Elias (Designer)</span>
          </button>
          <button
            onClick={() => switchUser('user-bbg-marketing')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              user?.id === 'user-bbg-marketing'
                ? 'bg-white text-emerald-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3 h-3 text-emerald-600" />
            <span>Mariana (BBG)</span>
          </button>
        </div>

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
