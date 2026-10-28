import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Demand } from '../types';
import { formatDate, formatDateTime } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import {
  ListOrdered,
  LayoutGrid,
  List,
  GripVertical,
  Calendar,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface PriorityQueueViewProps {
  onSelectDemand: (id: string) => void;
}

export const PriorityQueueView: React.FC<PriorityQueueViewProps> = ({ onSelectDemand }) => {
  const { token } = useAuth();
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demands/priority-queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching priority queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleMove = async (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[index];
    const newPosition = targetIndex + 1;

    // Optimistic UI update
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setItems(newItems);

    setUpdatingId(currentItem.id);
    try {
      const res = await fetch(`/api/demands/${currentItem.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPosition }),
      });
      if (!res.ok) {
        // Rollback if failed
        await fetchQueue();
      }
    } catch (err) {
      console.error('Error reordering:', err);
      await fetchQueue();
    } finally {
      setUpdatingId(null);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr !== '' ? parseInt(sourceIndexStr, 10) : draggedIndex;

    if (sourceIndex === null || isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const currentItem = items[sourceIndex];
    if (!currentItem) {
      setDraggedIndex(null);
      return;
    }

    const newPosition = targetIndex + 1;

    // Optimistic reorder in local state for instantaneous response
    const reordered = [...items];
    const [movedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);
    setItems(reordered);
    setDraggedIndex(null);

    setUpdatingId(currentItem.id);
    try {
      const res = await fetch(`/api/demands/${currentItem.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPosition }),
      });
      if (!res.ok) {
        await fetchQueue();
      }
    } catch (err) {
      console.error(err);
      await fetchQueue();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                Fila de Prioridades Compartilhada
              </h2>
              <p className="text-xs text-slate-500">
                Arraste qualquer quadro para definir a ordem de produção prioritária.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle: 4 per row Grid vs List */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade (4 por linha)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade (4 colunas)</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em Lista"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            {items.length} demandas ativas
          </span>

          <button
            onClick={fetchQueue}
            title="Recarregar fila"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-indigo-50/70 border border-indigo-200 text-indigo-950 p-3 rounded-xl text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Dica de Organização:</strong> Arraste os cards para frente ou para trás. As posições são recalculadas e auditadas instantaneamente no banco de dados.
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
          Carregando fila de prioridades...
        </div>
      ) : items.length > 0 ? (
        viewMode === 'grid' ? (
          /* =========================================================================
             GRID VIEW: 4 CARDS PER ROW (COMPACT, ORGANIZED)
             ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {items.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isTargetOver = dragOverIndex === index && draggedIndex !== index;
              const isUpdating = updatingId === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectDemand(item.id)}
                  className={`relative bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-150 cursor-grab active:cursor-grabbing select-none group shadow-2xs hover:shadow-xs ${
                    isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-400' : ''
                  } ${
                    isTargetOver
                      ? 'ring-2 ring-indigo-500 border-indigo-500 scale-[1.02] bg-indigo-50/40 shadow-md'
                      : 'border-slate-200 hover:border-indigo-300'
                  } ${isUpdating ? 'animate-pulse' : ''}`}
                >
                  {/* Top: Position Badge, Code & Drag Handle */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {Boolean(item.is_extra) && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          Extra
                        </span>
                      )}
                      <div
                        title="Segure e arraste para reordenar"
                        className="text-slate-400 group-hover:text-indigo-600 p-0.5 rounded"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1 mb-2.5 flex-1">
                    <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <span className="font-semibold text-slate-700">{item.department}</span>
                      <span>•</span>
                      <span className="truncate">{item.material_type}</span>
                    </div>
                  </div>

                  {/* Solicitante & Prazo */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.requester_name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {/* Prazo Acordado */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Prazo:</span>
                      {item.agreed_deadline ? (
                        <span className="font-extrabold text-[11px] text-indigo-950 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                          {formatDate(item.agreed_deadline)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 italic">
                          Desejado: {formatDate(item.desired_deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Status & Quick Reorder Controls */}
                  <div
                    className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusBadge status={item.status} size="sm" />

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                      <button
                        type="button"
                        disabled={index === 0 || isUpdating}
                        onClick={() => handleMove(index, 'prev')}
                        title="Priorizar (mover para esquerda)"
                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1 || isUpdating}
                        onClick={() => handleMove(index, 'next')}
                        title="Despriorizar (mover para direita)"
                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================================
             LIST VIEW: COMPACT ROWS
             ========================================================================= */
          <div className="space-y-2">
            {items.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isTargetOver = dragOverIndex === index && draggedIndex !== index;
              const isUpdating = updatingId === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectDemand(item.id)}
                  className={`bg-white rounded-xl border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all cursor-grab active:cursor-grabbing group shadow-2xs ${
                    isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-400' : ''
                  } ${
                    isTargetOver
                      ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/40'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                  } ${isUpdating ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div
                      title="Arrastar para reordenar"
                      className="text-slate-400 group-hover:text-indigo-600 p-1 shrink-0"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors truncate">
                          {item.title}
                        </h4>
                        {Boolean(item.is_extra) && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Extra
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{item.department}</span>
                        <span>•</span>
                        <span>{item.requester_name}</span>
                        <span>•</span>
                        <span>{item.material_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prazo</span>
                      {item.agreed_deadline ? (
                        <span className="font-bold text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {formatDate(item.agreed_deadline)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 italic">
                          Desejado: {formatDate(item.desired_deadline)}
                        </span>
                      )}
                    </div>

                    <StatusBadge status={item.status} size="sm" />

                    <div
                      className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={index === 0 || isUpdating}
                        onClick={() => handleMove(index, 'prev')}
                        title="Mover para cima"
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1 || isUpdating}
                        onClick={() => handleMove(index, 'next')}
                        title="Mover para baixo"
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          Nenhuma demanda ativa na fila no momento.
        </div>
      )}
    </div>
  );
};
