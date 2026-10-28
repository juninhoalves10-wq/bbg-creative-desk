import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MonthlyCompetency, CreditTransaction } from '../types';
import { formatDate, formatDateTime, formatCompetencyName } from '../utils/date';
import {
  Coins,
  Calendar,
  CheckCircle2,
  TrendingDown,
  PlusCircle,
  AlertCircle,
  History,
  FileText,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export const MonthlyCreditsView: React.FC = () => {
  const { token, isAdmin, user } = useAuth();
  const [competencies, setCompetencies] = useState<MonthlyCompetency[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // New month creation modal
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [newYear, setNewYear] = useState('2026');
  const [newMonth, setNewMonth] = useState('11');

  // Adjust credits modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('2');
  const [adjustJustification, setAdjustJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCompetencies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/competencies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompetencies(data);
        if (data.length > 0 && !selectedCompId) {
          setSelectedCompId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (compId: string) => {
    if (!compId) return;
    try {
      const res = await fetch(`/api/competencies/${compId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompetencies();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      fetchTransactions(selectedCompId);
    }
  }, [selectedCompId]);

  const handleEnsureNewMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/competencies/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year: parseInt(newYear), month: parseInt(newMonth) }),
      });
      if (res.ok) {
        setShowNewMonthModal(false);
        await fetchCompetencies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustJustification.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/competencies/${selectedCompId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          adjustmentAmount: parseInt(adjustAmount),
          justification: adjustJustification.trim(),
        }),
      });
      if (res.ok) {
        setShowAdjustModal(false);
        setAdjustJustification('');
        await fetchCompetencies();
        await fetchTransactions(selectedCompId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentComp = competencies.find((c) => c.id === selectedCompId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Gestão de Créditos Mensais (Cota 30/mês)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Controle de franquia compartilhada entre todos os usuários BBG com competências mensais independentes.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewMonthModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Inicializar Nova Competência</span>
            </button>
          </div>
        )}
      </div>

      {/* Competencies Horizontal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {competencies.map((comp) => {
          const isSelected = comp.id === selectedCompId;
          const remaining = Math.max(0, comp.quota_contracted - comp.credits_used);
          return (
            <div
              key={comp.id}
              onClick={() => setSelectedCompId(comp.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-2 ring-indigo-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs uppercase text-slate-800">
                  {formatCompetencyName(comp.competency_key)}
                </span>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {remaining} disp.
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Contratados:</span>
                  <span className="font-bold">{comp.quota_contracted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilizados:</span>
                  <span className="font-bold text-indigo-700">{comp.credits_used}</span>
                </div>
              </div>

              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${Math.min(100, (comp.credits_used / comp.quota_contracted) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Competency Detail & Ledger */}
      {currentComp && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Livro de Registro & Transações — {formatCompetencyName(currentComp.competency_key)}
              </h3>
              <p className="text-xs text-slate-500">
                Histórico imutável de consumo e movimentação de créditos desta competência.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAdjustModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ajuste Administrativo de Crédito</span>
              </button>
            )}
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Movimentação</th>
                  <th className="py-3 px-4">Demanda Associada</th>
                  <th className="py-3 px-4">Descrição / Justificativa</th>
                  <th className="py-3 px-4">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === 'consumption'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.type === 'adjustment'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.type === 'consumption' ? 'Consumo' : tx.type === 'adjustment' ? 'Ajuste' : 'Estorno'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black">
                        <span className={tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} crédito(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {tx.demand_code || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">{tx.description}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{tx.user_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhuma transação de crédito registrada nesta competência ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INITIALIZE NEW MONTH */}
      {showNewMonthModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2">Inicializar Nova Competência</h4>
            <p className="text-xs text-slate-500 mb-4">
              Cria uma nova franquia de 30 créditos para o mês especificado. Operação idempotente que nunca duplica créditos nem altera meses anteriores.
            </p>

            <form onSubmit={handleEnsureNewMonth} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mês</label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {[
                      { v: '1', n: 'Janeiro' },
                      { v: '2', n: 'Fevereiro' },
                      { v: '3', n: 'Março' },
                      { v: '4', n: 'Abril' },
                      { v: '5', n: 'Maio' },
                      { v: '6', n: 'Junho' },
                      { v: '7', n: 'Julho' },
                      { v: '8', n: 'Agosto' },
                      { v: '9', n: 'Setembro' },
                      { v: '10', n: 'Outubro' },
                      { v: '11', n: 'Novembro' },
                      { v: '12', n: 'Dezembro' },
                    ].map((m) => (
                      <option key={m.v} value={m.v}>
                        {m.n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ano</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewMonthModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  {submitting ? 'Inicializando...' : 'Confirmar e Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST CREDITS (Admin) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2">Ajuste de Créditos / Bonificação</h4>
            <p className="text-xs text-slate-500 mb-3">
              Insira uma bonificação de créditos ou ajuste excepcional para a competência selecionada. A justificativa será registrada no livro fiscal de auditoria.
            </p>

            <form onSubmit={handleAdjustCredits} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantidade de créditos adicionais (Ex: 1, 2, 5)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Justificativa Obrigatória do Ajuste *
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustJustification}
                  onChange={(e) => setAdjustJustification(e.target.value)}
                  placeholder="Ex: Bonificação contratual concedida pelo Designer Elias Alves para campanha especial."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !adjustJustification.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
