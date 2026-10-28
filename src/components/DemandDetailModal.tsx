import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Demand, DemandDelivery, DemandFile, DemandComment, DemandTimelineEvent } from '../types';
import { formatDate, formatDateTime, formatCurrency, formatCompetencyName } from '../utils/date';
import { StatusBadge, ExtraDemandBanner } from './StatusBadge';
import {
  X,
  Calendar,
  Clock,
  User,
  Building,
  Layers,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Send,
  MessageSquare,
  History,
  Download,
  ExternalLink,
  Plus,
  DollarSign,
  Check,
  AlertTriangle,
  RefreshCw,
  Info,
  Image as ImageIcon,
  UploadCloud,
  ClipboardPaste,
  Trash2,
  Maximize2,
} from 'lucide-react';

interface DemandDetailModalProps {
  demandId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const DemandDetailModal: React.FC<DemandDetailModalProps> = ({ demandId, onClose, onUpdated }) => {
  const { user, isAdmin, token } = useAuth();

  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'briefing' | 'deliveries' | 'extra' | 'timeline' | 'comments'>('briefing');

  // Delivery submission form state (Admin)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryImagePreview, setDeliveryImagePreview] = useState<string | null>(null);
  const [isDraggingDeliveryFile, setIsDraggingDeliveryFile] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const deliveryFileInputRef = React.useRef<HTMLInputElement>(null);

  // Approval / Adjustment modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');

  // Agreed Deadline modal (Admin)
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newAgreedDeadline, setNewAgreedDeadline] = useState('');
  const [deadlineNotes, setDeadlineNotes] = useState('');

  // Extra cost evaluation form (Admin)
  const [showExtraCostModal, setShowExtraCostModal] = useState(false);
  const [extraCostInput, setExtraCostInput] = useState('80.00');
  const [extraCostTerms, setExtraCostTerms] = useState('Criação de arte extra fora do pacote contratado. Incluso 1 rodada de ajustes.');
  const [extraRejectionReason, setExtraRejectionReason] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchDemandDetails = async () => {
    if (!demandId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/demands/${demandId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDemand(data);
      }
    } catch (err) {
      console.error('Error fetching demand:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandDetails();
  }, [demandId]);

  // Window paste listener when delivery form is open
  useEffect(() => {
    if (!showDeliveryForm) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setDeliveryImagePreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [showDeliveryForm]);

  const handleDeliveryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDeliveryFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setDeliveryImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDeliveryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setDeliveryImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (!demandId) return null;

  // Actions
  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: approvalComment }),
      });
      if (res.ok) {
        setShowApproveModal(false);
        setApprovalComment('');
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestAdjustments = async () => {
    if (!adjustmentText.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/request-adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: adjustmentText.trim() }),
      });
      if (res.ok) {
        setShowAdjustmentModal(false);
        setAdjustmentText('');
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          releaseNotes: deliveryNotes.trim() || undefined,
          imageBase64: deliveryImagePreview || undefined,
        }),
      });
      if (res.ok) {
        setShowDeliveryForm(false);
        setDeliveryNotes('');
        setDeliveryImagePreview(null);
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSetAgreedDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgreedDeadline) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/prazo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agreedDeadline: newAgreedDeadline, notes: deadlineNotes }),
      });
      if (res.ok) {
        setShowDeadlineModal(false);
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleProposeExtraCost = async (action: 'propose' | 'reject') => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/extra-evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action,
          extraCost: action === 'propose' ? parseFloat(extraCostInput) : undefined,
          extraCostTerms: action === 'propose' ? extraCostTerms : undefined,
          rejectionReason: action === 'reject' ? extraRejectionReason : undefined,
        }),
      });
      if (res.ok) {
        setShowExtraCostModal(false);
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRespondExtraCost = async (action: 'accept' | 'reject') => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/extra-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/demands/${demandId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment('');
        await fetchDemandDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/demands/${demandId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchDemandDetails();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col my-auto border border-slate-200">
        {loading || !demand ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Carregando detalhes da demanda...</p>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                      {demand.code}
                    </span>
                    <StatusBadge status={demand.status} />
                    {demand.queue_position > 0 && demand.status !== 'pendente_autorizacao_extra' && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Posição #{demand.queue_position} na fila
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-medium">
                      Competência: {formatCompetencyName(demand.competency_key || '')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{demand.title}</h3>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Extra Demand Tag Banner if applicable */}
              {Boolean(demand.is_extra || demand.extra_tag_applied) && (
                <div className="mt-1">
                  <ExtraDemandBanner />
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-xs font-semibold text-slate-500">
              <button
                onClick={() => setActiveTab('briefing')}
                className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'briefing'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Briefing & Detalhes</span>
              </button>

              <button
                onClick={() => setActiveTab('deliveries')}
                className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'deliveries'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Entregas & Versões ({demand.deliveries?.length || 0})</span>
              </button>

              {Boolean(demand.is_extra) && (
                <button
                  onClick={() => setActiveTab('extra')}
                  className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'extra'
                      ? 'border-amber-500 text-amber-700 font-bold'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Custo Extra & Autorização</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Linha do Tempo ({demand.timeline?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('comments')}
                className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comentários ({demand.comments?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB: BRIEFING */}
              {activeTab === 'briefing' && (
                <div className="space-y-6">
                  {/* Meta cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Departamento</span>
                      <span className="font-bold text-slate-800">{demand.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Material</span>
                      <span className="font-bold text-slate-800">{demand.material_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Formato / Dimensão</span>
                      <span className="font-bold text-slate-800">{demand.dimensions || 'Padrão'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Solicitante</span>
                      <span className="font-bold text-slate-800">{demand.requester_name}</span>
                    </div>
                  </div>

                  {/* Deadlines Section */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Data Desejada
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm mt-0.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(demand.desired_deadline)}</span>
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-6">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Prazo Acordado (Confirmado)
                        </span>
                        <div className="flex items-center gap-1.5 text-sm mt-0.5">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          {demand.agreed_deadline ? (
                            <span className="font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {formatDate(demand.agreed_deadline)}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-700 italic bg-amber-50 px-2 py-0.5 rounded">
                              Aguardando definição do Designer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setNewAgreedDeadline(demand.agreed_deadline || demand.desired_deadline || '');
                          setShowDeadlineModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                      >
                        {demand.agreed_deadline ? 'Alterar Prazo Acordado' : 'Definir Prazo Acordado'}
                      </button>
                    )}
                  </div>

                  {/* Retroactive registration notice if applicable */}
                  {Boolean(demand.is_retroactive) && (
                    <div className="bg-amber-50/70 border border-amber-200 text-amber-900 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        <span>Solicitação Cadastrada Retroativamente</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Data real informada do pedido original: <strong>{formatDate(demand.real_request_date)}</strong>
                        <br />
                        Data efetiva do cadastro no sistema: <strong>{formatDateTime(demand.created_at)}</strong> por Elias Alves.
                      </p>
                    </div>
                  )}

                  {/* Briefing Text */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Descrição do Briefing
                    </h4>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {demand.briefing}
                    </div>
                  </div>

                  {/* Required Texts */}
                  {demand.required_texts && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Textos Obrigatórios (Copy / Legenda)
                      </h4>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono whitespace-pre-wrap">
                        {demand.required_texts}
                      </div>
                    </div>
                  )}

                  {/* Visual References & Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {demand.visual_references && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-700 block mb-1">Referências Visuais:</span>
                        <p className="text-slate-600">{demand.visual_references}</p>
                      </div>
                    )}

                    {demand.reference_links && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-700 block mb-1">Links Externos:</span>
                        <a
                          href={demand.reference_links}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{demand.reference_links}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Admin Status Changer */}
                  {isAdmin && (
                    <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Controle do Designer: Mudar Etapa de Produção
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'na_fila', label: 'Na fila' },
                          { id: 'em_producao', label: 'Em produção' },
                          { id: 'em_aprovacao', label: 'Em aprovação' },
                          { id: 'ajustes_solicitados', label: 'Ajustes solicitados' },
                          { id: 'aprovada', label: 'Aprovada' },
                          { id: 'cancelada', label: 'Cancelada' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            disabled={demand.status === st.id}
                            onClick={() => handleStatusChange(st.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                              demand.status === st.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: DELIVERIES & APPROVAL */}
              {activeTab === 'deliveries' && (
                <div className="space-y-6">
                  {/* Delivery Timeline info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-indigo-950">
                        Histórico de Entregas da Arte Final
                      </p>
                      <p className="text-indigo-700">
                        Primeira entrega: {formatDateTime(demand.first_delivery_at) || 'Ainda não realizada'} | Última entrega: {formatDateTime(demand.last_delivery_at) || '-'}
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setShowDeliveryForm(true)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Entregar Nova Versão</span>
                      </button>
                    )}
                  </div>

                  {/* BBG Approval actions box if awaiting approval */}
                  {demand.status === 'em_aprovacao' && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                        <h4 className="font-bold text-amber-950 text-sm">
                          Arte entregue e aguardando aprovação da BBG!
                        </h4>
                      </div>
                      <p className="text-xs text-amber-800">
                        Avalie os arquivos ou links da última versão entregue abaixo. Você pode aprovar em definitivo ou solicitar ajustes descrevendo o que precisa ser alterado.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          onClick={() => setShowApproveModal(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprovar Arte (Versão {demand.deliveries?.[0]?.version || 1})</span>
                        </button>

                        <button
                          onClick={() => setShowAdjustmentModal(true)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Solicitar Ajustes</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {demand.status === 'aprovada' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
                      <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-sm block">Demanda Aprovada com Sucesso!</span>
                        <span>
                          Aprovada por <strong>{demand.approver_name || 'BBG'}</strong> em {formatDateTime(demand.approved_at)} (Versão {demand.approved_version || 1}).
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Deliveries list */}
                  {demand.deliveries && demand.deliveries.length > 0 ? (
                    <div className="space-y-4">
                      {demand.deliveries.map((del) => (
                        <div key={del.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md">
                                V{del.version}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm">Versão {del.version}</h5>
                            </div>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(del.created_at)} por {del.delivered_by_name}
                            </span>
                          </div>

                          {/* Image preview if delivered */}
                          {del.image_url && (
                            <div className="relative group/art rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-lg">
                              <img
                                src={del.image_url}
                                alt={`Arte Versão ${del.version}`}
                                className="w-full max-h-80 object-contain bg-slate-900/5 cursor-pointer transition-transform duration-200 group-hover/art:scale-[1.01]"
                                onClick={() => setSelectedLightboxImage(del.image_url!)}
                              />
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover/art:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLightboxImage(del.image_url!)}
                                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Visualizar em tamanho real"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>Ampliar</span>
                                </button>
                                <a
                                  href={del.image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={`Arte-${demand.code}-V${del.version}.png`}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                                  title="Baixar imagem"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Baixar</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {del.release_notes && (
                            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-0.5">
                              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                                Observação da Entrega:
                              </span>
                              <p className="whitespace-pre-wrap">{del.release_notes}</p>
                            </div>
                          )}

                          {del.external_links && (
                            <div className="flex items-center gap-2 pt-1 text-xs">
                              <span className="font-semibold text-slate-500">Links para download/preview:</span>
                              <a
                                href={del.external_links}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline font-bold flex items-center gap-1"
                              >
                                <span>Acessar arquivos finais</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      Nenhuma entrega de arte final enviada ainda.
                    </div>
                  )}
                </div>
              )}

              {/* TAB: EXTRA DEMAND COST NEGOTIATION */}
              {activeTab === 'extra' && Boolean(demand.is_extra) && (
                <div className="space-y-5">
                  <ExtraDemandBanner />

                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-4 text-xs">
                    <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <span>Controle de Custos e Autorização de Demanda Extra</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Status da Autorização</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {demand.status === 'pendente_autorizacao_extra' && (demand.extra_cost !== null ? 'Aguardando aceite da BBG' : 'Aguardando avaliação do Designer')}
                          {demand.status === 'na_fila' && 'Autorizado e Aceito pela BBG'}
                          {demand.status === 'recusada_bbg' && 'Recusada pela BBG'}
                          {demand.status === 'recusada_admin' && 'Recusada pelo Designer'}
                          {demand.status !== 'pendente_autorizacao_extra' && demand.status !== 'recusada_bbg' && demand.status !== 'recusada_admin' && 'Autorizado e em andamento'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Valor Adicional Proposto</span>
                        <span className="font-extrabold text-indigo-700 text-base">
                          {demand.extra_cost !== null ? formatCurrency(demand.extra_cost) : 'Não informado ainda'}
                        </span>
                      </div>
                    </div>

                    {demand.extra_cost_terms && (
                      <div className="p-3 bg-white rounded-lg border border-amber-200/80">
                        <span className="font-semibold text-slate-600 block mb-0.5">Condições / Escopo:</span>
                        <p className="text-slate-800">{demand.extra_cost_terms}</p>
                      </div>
                    )}

                    {/* Admin: Propose cost button */}
                    {isAdmin && demand.status === 'pendente_autorizacao_extra' && (
                      <div className="pt-2">
                        <button
                          onClick={() => setShowExtraCostModal(true)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          {demand.extra_cost !== null ? 'Alterar Proposta de Custo' : 'Informar Custo Extra / Avaliar'}
                        </button>
                      </div>
                    )}

                    {/* BBG User: Explicit Accept or Reject buttons */}
                    {demand.status === 'pendente_autorizacao_extra' && demand.extra_cost !== null && (
                      <div className="p-4 bg-white border-2 border-indigo-300 rounded-xl space-y-3">
                        <p className="font-bold text-slate-900 text-sm">
                          Aceite Obrigatório da BBG para Liberação na Fila
                        </p>
                        <p className="text-slate-600">
                          O Designer Elias Alves propôs o custo de <strong>{formatCurrency(demand.extra_cost)}</strong> para a criação desta demanda fora da cota mensal. A demanda só entrará na fila ativa de produção após sua confirmação formal.
                        </p>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => handleRespondExtraCost('accept')}
                            disabled={submittingAction}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Aceitar Custo Adicional ({formatCurrency(demand.extra_cost)})</span>
                          </button>

                          <button
                            onClick={() => handleRespondExtraCost('reject')}
                            disabled={submittingAction}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Recusar Demanda</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {demand.extra_authorized_by && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs">
                        <strong>Autorização Registrada:</strong> Aceito por {demand.extra_authorizer_name || 'BBG'} em {formatDateTime(demand.extra_authorized_at)}. A demanda agora segue na fila de produção preservando a tag de cota extra.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Histórico Completo de Auditoria e Linha do Tempo
                  </div>

                  <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-6">
                    {demand.timeline && demand.timeline.length > 0 ? (
                      demand.timeline.map((event) => (
                        <div key={event.id} className="relative group">
                          <div className="absolute -left-[23px] top-0 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{event.title}</span>
                              <span className="text-[11px] text-slate-400">
                                {formatDateTime(event.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{event.description}</p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Registrado por: {event.user_name} ({event.user_role === 'admin' ? 'Designer' : 'BBG'})
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Nenhum evento registrado.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: COMMENTS */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {demand.comments && demand.comments.length > 0 ? (
                      demand.comments.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                            c.type === 'adjustment_request'
                              ? 'bg-rose-50/70 border-rose-200'
                              : c.type === 'approval_note'
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {c.user_name}{' '}
                              {c.type === 'adjustment_request' && (
                                <span className="text-rose-600 font-extrabold">(Solicitação de Ajustes)</span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDateTime(c.created_at)}</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">Nenhum comentário ainda.</p>
                    )}
                  </div>

                  {/* Add comment box */}
                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Adicione um comentário ou dúvida..."
                      className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Criada em {formatDateTime(demand.created_at)} por {demand.requester_name}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>

      {/* DELIVERY FORM MODAL (Admin) */}
      {showDeliveryForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Entregar Nova Versão (V{(demand?.deliveries?.length || 0) + 1})
                </h4>
                <p className="text-xs text-slate-500">
                  Cole ou arraste a imagem final da arte para enviar à aprovação da BBG.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryForm(false);
                  setDeliveryImagePreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery} className="space-y-4 text-xs">
              {/* Image Paste / Drag & Drop Area */}
              <div>
                <input
                  ref={deliveryFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDeliveryFileSelect}
                />

                {deliveryImagePreview ? (
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 overflow-hidden group">
                    <img
                      src={deliveryImagePreview}
                      alt="Prévia da arte"
                      className="w-full max-h-64 object-contain rounded-lg mx-auto bg-slate-900/5"
                    />
                    <div className="flex items-center justify-between pt-2 px-1">
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Imagem pronta para entrega
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeliveryImagePreview(null)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover imagem</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingDeliveryFile(true);
                    }}
                    onDragLeave={() => setIsDraggingDeliveryFile(false)}
                    onDrop={handleDeliveryDrop}
                    onClick={() => deliveryFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                      isDraggingDeliveryFile
                        ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <ClipboardPaste className="w-6 h-6" />
                    </div>

                    <p className="font-bold text-slate-800 text-sm mb-1">
                      Cole a imagem copiada com <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">Ctrl+V</kbd>
                    </p>
                    <p className="text-slate-500 text-xs mb-3">
                      ou arraste e solte o arquivo da arte aqui
                    </p>

                    <button
                      type="button"
                      className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                      <span>Selecionar arquivo do computador</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Only Delivery Note / Observation Field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nota de entrega / Observação (opcional)
                </label>
                <textarea
                  rows={3}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Ex: Arte finalizada com fundo transparente e cores institucionais ajustadas. Conforme briefing."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeliveryForm(false);
                    setDeliveryImagePreview(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm text-xs"
                >
                  {submittingAction ? 'Enviando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE MODAL (BBG) */}
      {showApproveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Aprovar Arte Entregue</span>
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Confirme a aprovação da arte. O sistema registrará seu usuário, data, hora e a versão aprovada em definitivo na linha do tempo.
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                rows={2}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Comentário opcional (ex: Aprovado pela diretoria para veiculação)"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  {submittingAction ? 'Aprovando...' : 'Confirmar Aprovação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL (BBG) */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-rose-900 mb-2 flex items-center gap-1.5">
              <RefreshCw className="w-5 h-5 text-rose-600" />
              <span>Solicitar Ajustes na Arte</span>
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Descreva com clareza o que precisa ser ajustado. A demanda retornará para o status <strong>"Ajustes solicitados"</strong> e o Designer será notificado.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descrição detalhada dos ajustes necessários *
                </label>
                <textarea
                  required
                  rows={4}
                  value={adjustmentText}
                  onChange={(e) => setAdjustmentText(e.target.value)}
                  placeholder="Ex: Trocar a foto do produto pela versão com embalagem nova e aumentar o contraste do texto secundário..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRequestAdjustments}
                  disabled={submittingAction || !adjustmentText.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submittingAction ? 'Registrando...' : 'Enviar Solicitação de Ajuste'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AGREED DEADLINE MODAL (Admin) */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2">Definir Prazo Acordado</h4>
            <p className="text-xs text-slate-500 mb-3">
              Defina a data confirmada para entrega. O sistema registrará seu usuário e preservará o histórico de alterações.
            </p>

            <form onSubmit={handleSetAgreedDeadline} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Prazo Acordado *</label>
                <input
                  type="date"
                  required
                  value={newAgreedDeadline}
                  onChange={(e) => setNewAgreedDeadline(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Prazo</label>
                <input
                  type="text"
                  value={deadlineNotes}
                  onChange={(e) => setDeadlineNotes(e.target.value)}
                  placeholder="Ex: Alinhado conforme urgência da campanha"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  {submittingAction ? 'Salvando...' : 'Confirmar Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTRA COST EVALUATION MODAL (Admin) */}
      {showExtraCostModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2">Informar Condição de Custo Extra</h4>
            <p className="text-xs text-slate-500 mb-3">
              Informe o valor adicional para a criação desta arte. A BBG precisará aceitar expressamente antes de ela entrar na fila de produção.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Adicional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={extraCostInput}
                  onChange={(e) => setExtraCostInput(e.target.value)}
                  placeholder="0.00 para cortesia ou valor em R$"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  * Informe 0,00 caso opte por não cobrar custo adicional mas deseje o aceite da BBG.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Escopo e Condições</label>
                <textarea
                  rows={3}
                  value={extraCostTerms}
                  onChange={(e) => setExtraCostTerms(e.target.value)}
                  placeholder="Condições comerciais..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtraCostModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleProposeExtraCost('propose')}
                    disabled={submittingAction}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                  >
                    {submittingAction ? 'Salvando...' : 'Enviar Proposta para BBG'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FULL-SIZE ARTWORK LIGHTBOX MODAL */}
      {selectedLightboxImage && (
        <div
          onClick={() => setSelectedLightboxImage(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden flex flex-col items-center justify-center"
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={selectedLightboxImage}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Imagem</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedLightboxImage(null)}
                className="p-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-lg cursor-pointer shadow-lg backdrop-blur-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <img
              src={selectedLightboxImage}
              alt="Arte em alta resolução"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
