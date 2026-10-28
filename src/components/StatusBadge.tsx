import React from 'react';
import { DemandStatus } from '../types';
import { AlertTriangle, Clock, PlayCircle, Eye, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DemandStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<DemandStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    na_fila: {
      label: 'Na fila',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    em_producao: {
      label: 'Em produção',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
    em_aprovacao: {
      label: 'Em aprovação',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    ajustes_solicitados: {
      label: 'Ajustes solicitados',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
    aprovada: {
      label: 'Aprovada',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    cancelada: {
      label: 'Cancelada',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    pendente_autorizacao_extra: {
      label: 'Pendente de autorização/aceite',
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-400',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    recusada_bbg: {
      label: 'Recusada pela BBG',
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-300',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    recusada_admin: {
      label: 'Recusada pelo Designer',
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-300',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = configs[status] || configs.na_fila;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}>
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};

export const ExtraDemandBanner: React.FC<{ compact?: boolean }> = ({ compact }) => {
  return (
    <div
      className={`border border-amber-400 bg-amber-50 text-amber-950 font-semibold tracking-wide uppercase rounded-md flex items-center gap-2 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs shadow-xs'
      }`}
    >
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      <span>ARTE SOLICITADA FORA DA COTA MENSAL, PODERÁ TER CUSTOS EXTRAS, PENDENTE DE AUTORIZAÇÃO/ACEITE</span>
    </div>
  );
};
