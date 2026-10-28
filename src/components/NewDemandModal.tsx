import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Upload, AlertTriangle, CheckCircle, Info, Calendar, FileText } from 'lucide-react';
import { ExtraDemandBanner } from './StatusBadge';

interface NewDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  remainingCredits: number;
  currentCompetencyKey: string;
}

const MATERIAL_TYPES = [
  'Post para Instagram',
  'Story',
  'Carrossel',
  'Banner digital',
  'E-mail marketing',
  'Folder',
  'Outdoor',
  'Cartaz',
  'Apresentação',
  'Material comercial',
  'Material institucional',
  'Outro',
];

const DEPARTMENTS = [
  'Marketing',
  'Comercial',
  'Diretoria',
  'Recursos Humanos',
  'Operações',
  'Eventos',
  'TI & Suporte',
];

export const NewDemandModal: React.FC<NewDemandModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  remainingCredits,
  currentCompetencyKey,
}) => {
  const { user, isAdmin, token } = useAuth();

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState(user?.department || 'Marketing');
  const [materialType, setMaterialType] = useState('Post para Instagram');
  const [dimensions, setDimensions] = useState('1080x1080px');
  const [briefing, setBriefing] = useState('');
  const [requiredTexts, setRequiredTexts] = useState('');
  const [visualReferences, setVisualReferences] = useState('');
  const [referenceLinks, setReferenceLinks] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('');
  const [observations, setObservations] = useState('');

  // Admin options
  const [createdForUserId, setCreatedForUserId] = useState('');
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [realRequestDate, setRealRequestDate] = useState('');
  const [forceExtra, setForceExtra] = useState(false);
  const [forceExtraReason, setForceExtraReason] = useState('');

  // Confirmation step
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isOutOfCredits = remainingCredits <= 0;
  const willBeExtra = isOutOfCredits || (isAdmin && forceExtra);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !briefing.trim()) {
      setErrorMsg('Título e briefing são obrigatórios.');
      return;
    }
    setErrorMsg('');
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        title: title.trim(),
        department,
        material_type: materialType,
        dimensions: dimensions.trim() || null,
        briefing: briefing.trim(),
        required_texts: requiredTexts.trim() || null,
        visual_references: visualReferences.trim() || null,
        reference_links: referenceLinks.trim() || null,
        desired_deadline: desiredDeadline || null,
        observations: observations.trim() || null,
        created_for_user_id: isAdmin && createdForUserId ? createdForUserId : undefined,
        is_retroactive: isAdmin && isRetroactive,
        real_request_date: isAdmin && isRetroactive && realRequestDate ? realRequestDate : undefined,
        force_extra: isAdmin && forceExtra,
        force_extra_reason: isAdmin && forceExtra ? forceExtraReason : undefined,
      };

      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao registrar solicitação.');
      }

      setShowConfirmation(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar demanda.');
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nova Solicitação de Design</h3>
            <p className="text-xs text-slate-500">
              Solicitante: <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.department || 'BBG'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quota / Extra Warning banner */}
          {willBeExtra ? (
            <div className="space-y-2">
              <ExtraDemandBanner />
              <p className="text-xs text-amber-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                A franquia mensal de 30 créditos de {currentCompetencyKey} foi esgotada. Esta solicitação será classificada como <strong>demanda extra</strong> e não consumirá créditos regulares. Ela ficará com status <em>"Pendente de autorização/aceite"</em> até que o Designer informe se há custos e a BBG confirme explicitamente.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-lg text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Esta solicitação consumirá <strong>1 crédito</strong> da cota compartilhada da BBG ({remainingCredits} créditos restantes).
                </span>
              </div>
            </div>
          )}

          <form id="newDemandForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título da Demanda *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Campanha Black Friday - Post Instagram"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Department and Material Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departamento *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Material *
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                >
                  {MATERIAL_TYPES.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dimensions and Desired Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Formato ou Dimensões
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="Ex: 1080x1350px (4:5) ou A4"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Desejada para Entrega
                </label>
                <input
                  type="date"
                  value={desiredDeadline}
                  onChange={(e) => setDesiredDeadline(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  * A data desejada não substitui o prazo acordado com o designer.
                </span>
              </div>
            </div>

            {/* Briefing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição do Briefing *
              </label>
              <textarea
                required
                rows={3}
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Descreva o objetivo da arte, público-alvo, conceito visual e mensagem principal que deseja transmitir..."
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Required Texts */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Textos Obrigatórios (Copy / Headlines / Informações Legais)
              </label>
              <textarea
                rows={2}
                value={requiredTexts}
                onChange={(e) => setRequiredTexts(e.target.value)}
                placeholder="Insira os textos que devem constar obrigatoriamente na arte..."
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Visual references and links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referências Visuais / Estilo
                </label>
                <input
                  type="text"
                  value={visualReferences}
                  onChange={(e) => setVisualReferences(e.target.value)}
                  placeholder="Ex: Cores institucionais azul e cinza, minimalista"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Links de Referência (Drive, Pinterest, etc.)
                </label>
                <input
                  type="text"
                  value={referenceLinks}
                  onChange={(e) => setReferenceLinks(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Adicionais
              </label>
              <input
                type="text"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Precisa de versão editável em Photoshop ou PDF para impressão"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Admin-only options */}
            {isAdmin && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Opções Administrativas (Elias Alves)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cadastrar em nome de:
                    </label>
                    <select
                      value={createdForUserId}
                      onChange={(e) => setCreatedForUserId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white cursor-pointer"
                    >
                      <option value="">Você mesmo (Elias Alves)</option>
                      <option value="user-bbg-marketing">Mariana Silva (Marketing BBG)</option>
                      <option value="user-bbg-comercial">Carlos Eduardo (Comercial BBG)</option>
                      <option value="user-bbg-diretoria">Renata Vasconcelos (Diretoria BBG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 font-semibold text-slate-700 mt-5">
                      <input
                        type="checkbox"
                        checked={isRetroactive}
                        onChange={(e) => setIsRetroactive(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Cadastro retroativo?</span>
                    </label>
                  </div>
                </div>

                {isRetroactive && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Data real informada da solicitação original:
                    </label>
                    <input
                      type="date"
                      value={realRequestDate}
                      onChange={(e) => setRealRequestDate(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="newDemandForm"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Avançar para Confirmação
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2">
              {willBeExtra ? 'Confirmar Solicitação Extra' : 'Confirmar Consumo de Crédito'}
            </h4>

            {willBeExtra ? (
              <div className="space-y-3 text-xs text-slate-600">
                <ExtraDemandBanner />
                <p>
                  Esta demanda entrará como <strong>solicitação fora da cota</strong> e terá a tag obrigatória aplicada. Ela não consumirá créditos mensais, mas permanecerá com status <em>"Pendente de autorização/aceite"</em> fora da fila ativa de produção até que o Designer apresente o custo e a BBG aceite.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">1 crédito mensal será consumido</span> da competência {currentCompetencyKey}.
                  </div>
                </div>
                <p>
                  A demanda entrará imediatamente na <strong>fila ativa de prioridades</strong> na posição subsequente e será notificada para o Designer Elias Alves.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Voltar e Revisar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Registrando...' : 'Confirmar e Enviar Demanda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
