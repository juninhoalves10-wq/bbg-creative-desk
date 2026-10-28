import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import { formatDateTime } from '../utils/date';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface NotificationsViewProps {
  onSelectDemand: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectDemand }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Central de Notificações</h2>
          </div>
          <p className="text-xs text-slate-500">
            Acompanhe avisos de entregas, solicitações extras e aprovações.
          </p>
        </div>

        <button
          onClick={fetchNotifs}
          className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Carregando notificações...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.demand_id) onSelectDemand(n.demand_id);
              }}
              className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                !n.is_read ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {n.type.includes('extra') ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : n.type.includes('approved') ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Layers className="w-4 h-4 text-indigo-600" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              </div>

              {n.demand_id && (
                <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0">
                  <span>Abrir demanda</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhuma notificação registrada.
          </div>
        )}
      </div>
    </div>
  );
};
