import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  KanbanSquare,
  Files,
  Coins,
  Users as UsersIcon,
  AlertTriangle,
  History,
  Bell,
  Palette,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewDemand: () => void;
  monthlyStats?: { contracted: number; used: number; remaining: number; monthName: string };
  unreadNotifsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenNewDemand,
  monthlyStats,
  unreadNotifsCount = 0,
}) => {
  const { user, isAdmin, switchUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // Demo user options
  const switchOptions = [
    { id: 'user-elias-admin', name: 'Elias Alves', role: 'Administrador (Designer)', dept: 'Design & Criação' },
    { id: 'user-bbg-marketing', name: 'Mariana Silva', role: 'Usuário BBG', dept: 'Marketing' },
    { id: 'user-bbg-comercial', name: 'Carlos Eduardo', role: 'Usuário BBG', dept: 'Comercial' },
    { id: 'user-bbg-diretoria', name: 'Renata Vasconcelos', role: 'Usuário BBG', dept: 'Diretoria' },
  ];

  return (
    <aside className="w-68 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <Palette className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">BBG Creative Desk</h1>
            <p className="text-[11px] text-slate-500 font-medium">Elias Alves — Designer</p>
          </div>
        </div>
      </div>

      {/* Primary CTA: Nova solicitação */}
      <div className="p-3">
        <button
          onClick={onOpenNewDemand}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova solicitação</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
          {isAdmin ? 'Painel do Designer' : 'Área do Cliente BBG'}
        </div>

        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        {/* Fila de Prioridades (Both) */}
        <button
          onClick={() => onNavigate('priority-queue')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            currentView === 'priority-queue'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-slate-500" />
          <span>Fila de prioridades</span>
        </button>

        {/* Admin only: Esteira de Produção */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('production-kanban')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              currentView === 'production-kanban'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <KanbanSquare className="w-4 h-4 text-slate-500" />
            <span>Esteira de produção</span>
          </button>
        )}

        {/* Todas as Demandas (or Solicitações do Grupo) */}
        <button
          onClick={() => onNavigate('demands-list')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            currentView === 'demands-list'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Files className="w-4 h-4 text-slate-500" />
          <span>{isAdmin ? 'Todas as demandas' : 'Solicitações do grupo'}</span>
        </button>

        {/* Admin only: Solicitações extras */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('extra-requests')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              currentView === 'extra-requests'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Solicitações extras</span>
          </button>
        )}

        {/* Admin only: Créditos mensais */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('monthly-credits')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              currentView === 'monthly-credits'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-slate-500" />
            <span>Créditos mensais</span>
          </button>
        )}

        {/* Admin only: Usuários */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('users')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              currentView === 'users'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <UsersIcon className="w-4 h-4 text-slate-500" />
            <span>Usuários</span>
          </button>
        )}

        {/* Notificações */}
        <button
          onClick={() => onNavigate('notifications')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            currentView === 'notifications'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-slate-500" />
            <span>Notificações</span>
          </div>
          {unreadNotifsCount > 0 && (
            <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadNotifsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Monthly Credits Widget Summary */}
      <div className="px-3 py-3 border-t border-slate-100 bg-slate-50/70">
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {monthlyStats?.monthName || 'Outubro/2026'}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {monthlyStats?.remaining ?? 30} disponíveis
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (((monthlyStats?.used ?? 0) / (monthlyStats?.contracted || 30)) * 100)
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 font-medium">
            <span>Usados: {monthlyStats?.used ?? 0}</span>
            <span>Contratados: {monthlyStats?.contracted ?? 30}</span>
          </div>
        </div>
      </div>

      {/* User profile & Fast Role Switcher */}
      <div className="p-3 border-t border-slate-200 bg-white relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-700 text-xs">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Usuário'}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-700">
                    <ShieldCheck className="w-3 h-3" /> Designer (Admin)
                  </span>
                ) : (
                  <span>BBG — {user?.department || 'Equipe'}</span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* User Switcher Dropdown */}
        {showUserMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
            <div className="text-[11px] font-bold text-slate-400 uppercase px-2 py-1 mb-1">
              Trocar perfil para teste
            </div>
            {switchOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={async () => {
                  await switchUser(opt.id);
                  setShowUserMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex flex-col transition-colors cursor-pointer ${
                  user?.id === opt.id
                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{opt.name}</span>
                  <span className="text-[10px] text-slate-500">{opt.dept}</span>
                </div>
                <span className="text-[10px] text-slate-400">{opt.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
