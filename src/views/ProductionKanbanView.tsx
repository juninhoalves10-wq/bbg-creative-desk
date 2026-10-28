import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Demand, DemandStatus } from '../types';
import { formatDate } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import {
  KanbanSquare,
  Clock,
  PlayCircle,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  Plus,
} from 'lucide-react';

interface ProductionKanbanViewProps {
  onSelectDemand: (id: string) => void;
}

interface ColumnConfig {
  id: DemandStatus;
  title: string;
  icon: React.ReactNode;
  bgHeader: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'na_fila',
    title: '1. Na fila',
    icon: <Clock className="w-4 h-4 text-blue-600" />,
    bgHeader: 'border-t-4 border-t-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'em_producao',
    title: '2. Em produção',
    icon: <PlayCircle className="w-4 h-4 text-indigo-600" />,
    bgHeader: 'border-t-4 border-t-indigo-500',
    badgeBg: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'em_aprovacao',
    title: '3. Em aprovação',
    icon: <Eye className="w-4 h-4 text-amber-600" />,
    bgHeader: 'border-t-4 border-t-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'ajustes_solicitados',
    title: '4. Ajustes solicitados',
    icon: <RefreshCw className="w-4 h-4 text-rose-600" />,
    bgHeader: 'border-t-4 border-t-rose-500',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'aprovada',
    title: '5. Aprovada',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    bgHeader: 'border-t-4 border-t-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'cancelada',
    title: '6. Cancelada',
    icon: <XCircle className="w-4 h-4 text-slate-500" />,
    bgHeader: 'border-t-4 border-t-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700',
  },
];

export const ProductionKanbanView: React.FC<ProductionKanbanViewProps> = ({ onSelectDemand }) => {
  const { token, isAdmin } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Exclude demands pending extra authorization from the active pipeline
        setDemands(data.filter((d: Demand) => d.status !== 'pendente_autorizacao_extra' && d.status !== 'recusada_bbg' && d.status !== 'recusada_admin'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: DemandStatus) => {
    setMovingId(id);
    try {
      const res = await fetch(`/api/demands/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchDemands();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KanbanSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Esteira de Produção (Kanban)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Painel exclusivo do Designer Elias Alves para organizar o fluxo de criação gráfica e entregas.
          </p>
        </div>

        <button
          onClick={fetchDemands}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Esteira</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
          Carregando esteira...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colDemands = demands.filter((d) => d.status === col.id);
            return (
              <div
                key={col.id}
                className={`bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[80vh] ${col.bgHeader}`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-lg">
                  <div className="flex items-center gap-1.5">
                    {col.icon}
                    <h4 className="text-xs font-bold text-slate-900">{col.title}</h4>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                    {colDemands.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {colDemands.length > 0 ? (
                    colDemands.map((demand) => (
                      <div
                        key={demand.id}
                        onClick={() => onSelectDemand(demand.id)}
                        className={`bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer space-y-2 group ${
                          movingId === demand.id ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Top: Code & Extra Badge */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {demand.code}
                          </span>
                          {Boolean(demand.is_extra) && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              Extra
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h5 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {demand.title}
                        </h5>

                        {/* Details */}
                        <div className="space-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{demand.department}</span>
                            <span className="font-medium text-slate-700">{demand.material_type}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {demand.agreed_deadline ? (
                                <strong className="text-indigo-900">Prazo: {formatDate(demand.agreed_deadline)}</strong>
                              ) : (
                                <span>Desejado: {formatDate(demand.desired_deadline)}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Quick Move Selector for Elias */}
                        {isAdmin && (
                          <div
                            className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-slate-400 font-medium">Mover:</span>
                            <select
                              value={demand.status}
                              onChange={(e) => handleUpdateStatus(demand.id, e.target.value as DemandStatus)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 cursor-pointer font-semibold"
                            >
                              <option value="na_fila">Na fila</option>
                              <option value="em_producao">Em produção</option>
                              <option value="em_aprovacao">Em aprovação</option>
                              <option value="ajustes_solicitados">Ajustes</option>
                              <option value="aprovada">Aprovada</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[11px] text-slate-400">
                      Nenhuma demanda nesta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
