import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Demand } from '../types';
import { formatDate, formatDateTime, formatCurrency } from '../utils/date';
import { StatusBadge, ExtraDemandBanner } from '../components/StatusBadge';
import {
  AlertTriangle,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface ExtraRequestsViewProps {
  onSelectDemand: (id: string) => void;
}

export const ExtraRequestsView: React.FC<ExtraRequestsViewProps> = ({ onSelectDemand }) => {
  const { token, isAdmin } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExtras = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDemands(data.filter((d: Demand) => Boolean(d.is_extra)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtras();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-400 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm uppercase tracking-wide">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gestão de Solicitações Extras (Fora da Cota Mensal)</span>
          </div>
          <p className="text-xs text-amber-900/80 max-w-2xl leading-relaxed">
            Demandas cadastradas além dos 30 créditos contratados não consomem cota mensal. Elas só entram na fila de produção após a avaliação de custos pelo Designer Elias Alves e o <strong>aceite formal explícito</strong> pela BBG.
          </p>
        </div>

        <button
          onClick={fetchExtras}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Extras Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
          Carregando solicitações extras...
        </div>
      ) : demands.length > 0 ? (
        <div className="space-y-4">
          {demands.map((demand) => (
            <div
              key={demand.id}
              onClick={() => onSelectDemand(demand.id)}
              className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-2xs hover:shadow-xs hover:border-amber-400 transition-all cursor-pointer space-y-3"
            >
              {/* Mandatory Tag Banner */}
              <ExtraDemandBanner compact />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {demand.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{demand.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>Solicitante: <strong>{demand.requester_name}</strong> ({demand.department})</span>
                    <span>•</span>
                    <span>Criada em: {formatDateTime(demand.created_at)}</span>
                    <span>•</span>
                    <span>Material: {demand.material_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={demand.status} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDemand(demand.id);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Gerenciar Autorização
                  </button>
                </div>
              </div>

              {/* Status & Commercial Terms row */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Condição Comercial</span>
                  <div className="font-bold text-slate-800">
                    {demand.extra_cost !== null ? (
                      <span className="text-indigo-700 text-sm">{formatCurrency(demand.extra_cost)}</span>
                    ) : (
                      <span className="text-amber-700 italic">Pendente de avaliação pelo Designer</span>
                    )}
                    {demand.extra_cost_terms && (
                      <span className="text-slate-500 font-normal ml-2">({demand.extra_cost_terms})</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status do Aceite</span>
                  <span className="font-bold text-slate-700">
                    {demand.extra_authorized_by ? (
                      <span className="text-emerald-700 flex items-center gap-1 justify-end">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aceito por {demand.extra_authorizer_name || 'BBG'}
                      </span>
                    ) : demand.status === 'recusada_bbg' ? (
                      <span className="text-rose-700 flex items-center gap-1 justify-end">
                        <XCircle className="w-3.5 h-3.5" />
                        Recusado pela BBG
                      </span>
                    ) : demand.status === 'recusada_admin' ? (
                      <span className="text-rose-700 flex items-center gap-1 justify-end">
                        <XCircle className="w-3.5 h-3.5" />
                        Recusado pelo Designer
                      </span>
                    ) : (
                      <span className="text-amber-800 italic">Aguardando confirmação formal</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          Nenhuma solicitação extra registrada no momento.
        </div>
      )}
    </div>
  );
};
