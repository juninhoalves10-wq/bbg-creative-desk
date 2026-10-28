import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { PriorityQueueView } from './views/PriorityQueueView';
import { ProductionKanbanView } from './views/ProductionKanbanView';
import { DemandsListView } from './views/DemandsListView';
import { MonthlyCreditsView } from './views/MonthlyCreditsView';
import { ExtraRequestsView } from './views/ExtraRequestsView';
import { UsersView } from './views/UsersView';
import { NotificationsView } from './views/NotificationsView';
import { NewDemandModal } from './components/NewDemandModal';
import { DemandDetailModal } from './components/DemandDetailModal';
import { LoginView } from './views/LoginView';
import { DashboardStats, MonthlyCompetency, NotificationItem } from './types';
import { formatCompetencyName } from './utils/date';

function MainApp() {
  const { user, token, isAdmin, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCompetencyKey, setSelectedCompetencyKey] = useState('2026-10');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [competencies, setCompetencies] = useState<MonthlyCompetency[]>([]);

  // Modals state
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);

  // Unread notifications count
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchStats = async () => {
    if (!token) return;
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/stats?competencyKey=${selectedCompetencyKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCompetencies = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/competencies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompetencies(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadNotifsCount(unread);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchCompetencies();
      fetchNotifications();
    }
  }, [token, selectedCompetencyKey]);

  // Handle access restriction: if non-admin is in admin-only view, redirect to dashboard
  useEffect(() => {
    if (!isAdmin && ['production-kanban', 'monthly-credits', 'extra-requests', 'users'].includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [isAdmin, currentView]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mr-3" />
        Carregando BBG Creative Desk...
      </div>
    );
  }

  // If user is not authenticated, render the Login Screen
  if (!user) {
    return <LoginView />;
  }

  // Titles mapping
  const viewTitles: Record<string, { title: string; subtitle?: string }> = {
    dashboard: {
      title: 'Painel Geral de Demandas',
      subtitle: `Visão geral da competência ${formatCompetencyName(selectedCompetencyKey)} — Elias Alves & BBG Brasil`,
    },
    'priority-queue': {
      title: 'Fila de Prioridades',
      subtitle: 'Ordem ativa de produção compartilhada e auditada',
    },
    'production-kanban': {
      title: 'Esteira de Produção',
      subtitle: 'Fluxo Kanban de criação visual e aprovações (Designer Elias Alves)',
    },
    'demands-list': {
      title: isAdmin ? 'Todas as Demandas' : 'Solicitações do Grupo BBG',
      subtitle: 'Listagem completa de solicitações, entregas e históricos',
    },
    'extra-requests': {
      title: 'Solicitações Extras',
      subtitle: 'Gestão de demandas solicitadas fora da cota mensal de 30 artes',
    },
    'monthly-credits': {
      title: 'Controle de Créditos Mensais',
      subtitle: 'Gestão de franquia contratada, competências independentes e livro de auditoria',
    },
    users: {
      title: 'Usuários e Permissões',
      subtitle: 'Controle de perfis do Administrador e usuários da BBG',
    },
    notifications: {
      title: 'Notificações',
      subtitle: 'Avisos de entregas, solicitações extras e aprovações',
    },
  };

  const currentHeaderInfo = viewTitles[currentView] || { title: 'BBG Creative Desk' };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        onOpenNewDemand={() => setIsNewDemandModalOpen(true)}
        unreadNotifsCount={unreadNotifsCount}
        monthlyStats={
          stats
            ? {
                contracted: stats.competency.contracted,
                used: stats.competency.used,
                remaining: stats.competency.remaining,
                monthName: formatCompetencyName(stats.competency.key),
              }
            : undefined
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        <Header
          title={currentHeaderInfo.title}
          subtitle={currentHeaderInfo.subtitle}
          selectedCompetency={selectedCompetencyKey}
          onCompetencyChange={(k) => setSelectedCompetencyKey(k)}
          availableCompetencies={competencies.map((c) => ({
            key: c.competency_key,
            name: formatCompetencyName(c.competency_key),
          }))}
          onRefresh={() => {
            fetchStats();
            fetchCompetencies();
            fetchNotifications();
          }}
        />

        {/* Dynamic Views */}
        <main className="flex-1 pb-12">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={statsLoading}
              onOpenNewDemand={() => setIsNewDemandModalOpen(true)}
              onNavigate={(v) => setCurrentView(v)}
              onSelectDemand={(id) => setSelectedDemandId(id)}
            />
          )}

          {currentView === 'priority-queue' && (
            <PriorityQueueView onSelectDemand={(id) => setSelectedDemandId(id)} />
          )}

          {currentView === 'production-kanban' && isAdmin && (
            <ProductionKanbanView onSelectDemand={(id) => setSelectedDemandId(id)} />
          )}

          {currentView === 'demands-list' && (
            <DemandsListView
              onSelectDemand={(id) => setSelectedDemandId(id)}
              onOpenNewDemand={() => setIsNewDemandModalOpen(true)}
            />
          )}

          {currentView === 'extra-requests' && isAdmin && (
            <ExtraRequestsView onSelectDemand={(id) => setSelectedDemandId(id)} />
          )}

          {currentView === 'monthly-credits' && isAdmin && <MonthlyCreditsView />}

          {currentView === 'users' && isAdmin && <UsersView />}

          {currentView === 'notifications' && (
            <NotificationsView onSelectDemand={(id) => setSelectedDemandId(id)} />
          )}
        </main>
      </div>

      {/* New Demand Modal */}
      {isNewDemandModalOpen && (
        <NewDemandModal
          isOpen={isNewDemandModalOpen}
          onClose={() => setIsNewDemandModalOpen(false)}
          onSuccess={() => {
            fetchStats();
            fetchCompetencies();
          }}
          remainingCredits={stats?.competency.remaining ?? 30}
          currentCompetencyKey={formatCompetencyName(selectedCompetencyKey)}
        />
      )}

      {/* Demand Detail Modal */}
      {selectedDemandId && (
        <DemandDetailModal
          demandId={selectedDemandId}
          onClose={() => setSelectedDemandId(null)}
          onUpdated={() => {
            fetchStats();
            fetchCompetencies();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
