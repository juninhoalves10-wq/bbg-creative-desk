import React from 'react';
import { DashboardStats, Demand } from '../types';
import { formatDate, formatDateTime, formatCompetencyName } from '../utils/date';
import { StatusBadge, ExtraDemandBanner } from '../components/StatusBadge';
import {
  Coins,
  CheckCircle2,
  ListOrdered,
  PlayCircle,
  Eye,
  AlertTriangle,
  Clock,
  ArrowRight,
  PlusCircle,
  Files,
  User,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onOpenNewDemand: () => void;
  onNavigate: (view: string) => void;
  onSelectDemand: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onOpenNewDemand,
  onNavigate,
  onSelectDemand,
}) => {
  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        Carregando painel principal...
      </div>
    );
  }

  const { competency, counts, priorityItems } = stats;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Competency Main Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full border border-indigo-500/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>BBG BRASIL — {formatCompetencyName(competency.key).toUpperCase()}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Gestão Criativa & Cotas Mensais</h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Franquia de 30 artes mensais compartilhada entre todos os usuários da BBG. Demandas regulares consomem 1 crédito no registro.
          </p>
        </div>

        {/* Big Counter Stats in Banner */}
        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-medium">Contratados</span>
            <span className="text-2xl font-extrabold text-white">{competency.contracted}</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-medium">Utilizados</span>
            <span className="text-2xl font-extrabold text-indigo-300">{competency.used}</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">Disponíveis</span>
            <span className="text-2xl font-black text-emerald-400">{competency.remaining}</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Créditos Contratados */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Contratados</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{competency.contracted}</div>
          <span className="text-[10px] text-slate-400 font-medium">Franquia mensal</span>
        </div>

        {/* Créditos Utilizados */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Utilizados</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-indigo-700">{competency.used}</div>
          <span className="text-[10px] text-slate-400 font-medium">Consumidos no mês</span>
        </div>

        {/* Créditos Disponíveis */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Disponíveis</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700">{competency.remaining}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Saldo do grupo BBG</span>
        </div>

        {/* Solicitações na Fila */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Na Fila</span>
            <ListOrdered className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-blue-700">{counts.inQueue}</div>
          <span className="text-[10px] text-slate-400 font-medium">Aguardando início</span>
        </div>

        {/* Demandas em Produção */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Em Produção</span>
            <PlayCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-indigo-700">{counts.inProduction}</div>
          <span className="text-[10px] text-slate-400 font-medium">Com o designer</span>
        </div>

        {/* Artes em Aprovação */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase">Em Aprovação</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-800">{counts.awaitingApproval}</div>
          <span className="text-[10px] text-amber-600 font-medium">Aguardando BBG</span>
        </div>

        {/* Extras Pendentes */}
        <div className="bg-white p-3.5 rounded-xl border border-orange-200 bg-orange-50/30 shadow-2xs">
          <div className="flex items-center justify-between text-orange-800 mb-1">
            <span className="text-[11px] font-bold uppercase">Extras Pendentes</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-extrabold text-orange-700">{counts.extraPending}</div>
          <span className="text-[10px] text-orange-600 font-medium">Aguardando aceite</span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ações Rápidas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewDemand}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova solicitação</span>
          </button>

          <button
            onClick={() => onNavigate('priority-queue')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <ListOrdered className="w-4 h-4 text-slate-500" />
            <span>Fila de prioridades</span>
          </button>

          <button
            onClick={() => onNavigate('demands-list')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <Files className="w-4 h-4 text-slate-500" />
            <span>Todas as demandas</span>
          </button>
        </div>
      </div>

      {/* Priority Demands Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Demandas Prioritárias na Fila Ativa</h3>
          </div>
          <button
            onClick={() => onNavigate('priority-queue')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver fila completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16 text-center">Posição</th>
                <th className="py-3 px-4">Demanda</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Data do Pedido</th>
                <th className="py-3 px-4">Prazo Acordado</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priorityItems.length > 0 ? (
                priorityItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectDemand(item.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-center font-black text-slate-800">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto text-xs font-bold group-hover:bg-indigo-100 group-hover:text-indigo-800 transition-colors">
                        #{item.queue_position}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            {item.code}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{item.department}</span>
                          <span>•</span>
                          <span>{item.material_type}</span>
                          {Boolean(item.is_extra) && (
                            <span className="text-amber-700 bg-amber-50 px-1.5 rounded font-bold border border-amber-200 text-[10px]">
                              Extra
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.requester_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      {item.agreed_deadline ? (
                        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                          {formatDate(item.agreed_deadline)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 italic">
                          Prev. desejada: {formatDate(item.desired_deadline)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDemand(item.id);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Nenhuma demanda ativa na fila no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
