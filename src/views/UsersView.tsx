import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { formatDate } from '../utils/date';
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  Building,
  Mail,
  Lock,
  X,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { token, isAdmin, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('bbg123');
  const [role, setRole] = useState<UserRole>('bbg_user');
  const [department, setDepartment] = useState('Marketing');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete user modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role, department }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao cadastrar usuário.');
      }
      setShowAddModal(false);
      setName('');
      setEmail('');
      setActionSuccess('Novo usuário cadastrado com sucesso!');
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir usuário.');
      }

      setActionSuccess(`Usuário ${userToDelete.name} foi removido com sucesso.`);
      setUserToDelete(null);
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir usuário.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UsersIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Gerenciamento de Usuários e Perfis</h2>
          </div>
          <p className="text-xs text-slate-500">
            Controle de perfis do Administrador (Elias Alves) e da equipe de solicitantes da BBG Brasil.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer w-fit"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Perfil de Acesso</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Cota Compartilhada</th>
                {isAdmin && <th className="py-3 px-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isElias = u.id === 'user-elias-admin' || u.email.toLowerCase().includes('elias');
                  const isCurrent = u.id === user?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Administrador (Designer)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            Usuário BBG
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{u.department || 'Geral'}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {u.role === 'bbg_user' ? (
                          <span className="text-slate-700 font-medium">Franquia coletiva BBG (30/mês)</span>
                        ) : (
                          <span className="text-slate-400">Gestor do contrato</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          {isElias ? (
                            <span className="text-[11px] text-slate-400 font-medium">Admin Principal</span>
                          ) : isCurrent ? (
                            <span className="text-[11px] text-slate-400 font-medium">Sua Conta</span>
                          ) : (
                            <button
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteError('');
                              }}
                              title={`Excluir ${u.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Excluir Usuário</h4>
                <p className="text-xs text-slate-500">Confirmação de exclusão permanente</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Você tem certeza que deseja excluir o usuário <strong className="text-slate-900">{userToDelete.name}</strong> (<span className="text-slate-700">{userToDelete.email}</span>)?
              <br />
              <span className="text-slate-500 text-[11px] mt-1 block">
                Todas as solicitações e histórico criados por ele serão mantidos no sistema com segurança.
              </span>
            </p>

            {deleteError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer shadow-sm text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Excluindo...' : 'Sim, Excluir Usuário'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900">Cadastrar Novo Usuário</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Amanda Souza"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amanda@bbg.com.br"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Senha Inicial *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="bbg_user">Usuário BBG</option>
                    <option value="admin">Administrador (Designer)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Marketing, Comercial..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  {submitting ? 'Cadastrando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
