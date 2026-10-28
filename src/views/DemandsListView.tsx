import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Demand } from '../types';
import { formatDate, formatDateTime, formatCompetencyName } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import {
  Files,
  Search,
  Filter,
  PlusCircle,
  Calendar,
  Layers,
  User,
  RefreshCw,
} from 'lucide-react';

interface DemandsListViewProps {
  onSelectDemand: (id: string) => void;
  onOpenNewDemand: () => void;
}

export const DemandsListView: React.FC<DemandsListViewProps> = ({ onSelectDemand, onOpenNewDemand }) => {
  const { token, isAdmin } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDemands = async () => {
    try {
      setLoading(true);
      let url = '/api/demands';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDemands(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDemands();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Files className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">
              {isAdmin ? 'Todas as Demandas de Design' : 'Solicitações do Grupo BBG'}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Acompanhe o histórico completo de solicitações, versões entregues e aprovações.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewDemand}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova solicitação</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, código ou briefing..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="na_fila">Na fila</option>
            <option value="em_producao">Em produção</option>
            <option value="em_aprovacao">Em aprovação</option>
            <option value="ajustes_solicitados">Ajustes solicitados</option>
            <option value="aprovada">Aprovadas</option>
            <option value="pendente_autorizacao_extra">Extras pendentes de aceite</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <button
            onClick={fetchDemands}
            title="Recarregar"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Código / Título</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Data do Pedido</th>
                <th className="py-3 px-4">Prazo Acordado</th>
                <th className="py-3 px-4 text-center">Versão</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                    Carregando demandas...
                  </td>
                </tr>
              ) : demands.length > 0 ? (
                demands.map((demand) => (
                  <tr
                    key={demand.id}
                    onClick={() => onSelectDemand(demand.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {demand.code}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {demand.title}
                          </span>
                        </div>
                        {Boolean(demand.is_extra) && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 inline-block mt-0.5">
                            Cota Extra
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{demand.department}</td>
                    <td className="py-3.5 px-4 text-slate-600">{demand.material_type}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{demand.requester_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(demand.created_at)}</td>
                    <td className="py-3.5 px-4">
                      {demand.agreed_deadline ? (
                        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {formatDate(demand.agreed_deadline)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 italic">
                          Desejado: {formatDate(demand.desired_deadline)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {demand.latest_version ? (
                        <span className="bg-indigo-100 text-indigo-900 font-extrabold px-2 py-0.5 rounded text-[11px]">
                          V{demand.latest_version}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={demand.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDemand(demand.id);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    Nenhuma demanda encontrada com os filtros selecionados.
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
