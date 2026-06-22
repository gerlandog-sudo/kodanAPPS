import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Input, Modal, CustomFieldsForm, EntityCard, ConfirmDialog } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { WonOpportunityModal } from '../components/modals/WonOpportunityModal';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import type { ColumnDef } from '../components/kanban/KanbanBoard';
import { QuoteLineItemsEditor } from '../components/quotes/QuoteLineItemsEditor';
import type { QuoteLineItem, QuoteStatus } from '../types/admin';
import { 
  Plus,
  Archive,
  ArchiveRestore,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface Opportunity {
  id: number;
  name: string;
  value: string;
  close_date: string;
  status: 'open' | 'won' | 'lost';
  pipeline_stage_id: number;
  account_id: number | null;
  contact_id: number | null;
  account_name?: string;
  contact_name?: string;
  stage_name?: string;
  pipeline_id?: number;
  custom_fields?: Record<string, any>;
  is_archived?: boolean;
  created_at?: string;
  owner_user_id?: number | null;
  owner_name?: string;
  owner_avatar?: string | null;
  line_items_count?: number;
  quote_total?: number;
}

interface Stage {
  id: number;
  name: string;
  color_hex: string;
  sort_order: number;
  is_won_stage: number;
  pipeline_id: number;
}

interface Pipeline {
  id: number;
  name: string;
  is_default: number;
}

interface CardProps {
  opp: Opportunity;
  isDropped: boolean;
  onEdit: (opp: Opportunity) => void;
  onDelete: (opp: Opportunity) => void;
  onChat: (opp: Opportunity) => void;
}

function OppCard({ opp, isDropped, onEdit, onDelete, onChat }: CardProps) {
  return (
    <EntityCard
      title={opp.name}
      amount={parseFloat(opp.value) || 0}
      accountName={opp.account_name}
      startDate={opp.created_at}
      closeDate={opp.close_date}
      lineItemsCount={opp.line_items_count ?? 0}
      quoteTotal={opp.quote_total}
      ownerName={opp.owner_name}
      ownerAvatar={opp.owner_avatar}
      isDropped={isDropped}
      onChat={() => onChat(opp)}
      onEdit={() => onEdit(opp)}
      onDelete={() => onDelete(opp)}
    />
  )
}

interface NegotiationsProps {
  onOpenChat?: (entityType: string, entityId: number, title?: string) => void;
  onNavigate?: (route: string) => void;
  autoOpenOppId?: number | null;
  onClearAutoOpen?: () => void;
}

export function Negotiations({ onOpenChat, autoOpenOppId, onClearAutoOpen }: NegotiationsProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  // Modals / Drawers
  const [showOppModal, setShowOppModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonOppId, setWonOppId] = useState<number | null>(null);
  const [wonOppName, setWonOppName] = useState('');
  const [targetWonStageId, setTargetWonStageId] = useState<number | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'custom-fields'>('general');

  // Form state (unified for create + edit)
  const [oppFormData, setOppFormData] = useState({
    name: '',
    value: '0',
    close_date: '',
    account_id: '',
    contact_id: '',
    pipeline_stage_id: '',
  });
  const [oppFormLineItems, setOppFormLineItems] = useState<QuoteLineItem[]>([]);
  const [oppQuoteId, setOppQuoteId] = useState<number | null>(null);
  const [editingOppId, setEditingOppId] = useState<number | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // Custom Fields
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadPipelines();
    loadAccountsAndContacts();
    loadOppCustomFields();
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      loadPipelineData(selectedPipelineId, showArchived);
    }
  }, [selectedPipelineId, showArchived]);

  const loadPipelines = async () => {
    try {
      const data = await crmApi.listPipelines();
      setPipelines(data);
      if (data.length > 0) {
        const def = data.find(p => p.is_default === 1) || data[0];
        setSelectedPipelineId(def.id);
      }
    } catch {
      toast.error('Error al cargar los pipelines.');
    }
  };

  const loadAccountsAndContacts = async () => {
    try {
      const [accs, conts] = await Promise.all([
        crmApi.listAccounts(),
        crmApi.listContacts(),
      ]);
      setAccounts(accs);
      setContacts(conts);
    } catch {}
  };

  const loadPipelineData = async (pipelineId: number, includeArchived = false) => {
    try {
      const stagesList = await crmApi.listStages(pipelineId);
      const sortedStages = [...stagesList].sort((a, b) => a.sort_order - b.sort_order);
      setStages(sortedStages);

      const params: Record<string, string> = { pipeline_id: String(pipelineId) }
      if (includeArchived) params.include_archived = '1'
      const oppsList = await crmApi.listOpportunities(params);
      setOpportunities(oppsList);
    } catch {
      toast.error('Error al cargar datos del pipeline.');
    }
  };

  // Column definitions for KanbanBoard
  const columns: ColumnDef[] = useMemo(
    () =>
      stages.map((s) => ({
        id: String(s.id),
        label: s.name,
        dotColor: s.color_hex,
      })),
    [stages]
  );

  // Group opportunities by pipeline_stage_id
  const itemsByStage = useMemo(() => {
    const groups: Record<string, Opportunity[]> = {};
    columns.forEach((col) => {
      groups[col.id] = [];
    });
    opportunities.forEach((opp) => {
      const stageId = String(opp.pipeline_stage_id);
      if (groups[stageId]) {
        groups[stageId].push(opp);
      }
    });
    return groups;
  }, [opportunities, columns]);

  const updateOppStage = useCallback(
    async (oppId: number, stageId: number, status: 'open' | 'won' | 'lost') => {
      const previousOpps = [...opportunities];
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, pipeline_stage_id: stageId, status } : o))
      );

      try {
        await crmApi.updateOpportunity(oppId, {
          pipeline_stage_id: stageId,
          status,
        });
        toast.success('Estado actualizado correctamente.');
      } catch (err: any) {
        setOpportunities(previousOpps);
        toast.error(err?.message || 'Error al actualizar etapa.');
      }
    },
    [opportunities]
  );

  const handleDrop = useCallback(
    (itemId: string | number, toStage: string) => {
      const oppId = Number(itemId);
      const targetStageId = Number(toStage);
      const opp = opportunities.find((o) => o.id === oppId);
      if (!opp) return;

      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) return;

      // If it's a Won stage, trigger the Won modal
      if (targetStage.is_won_stage === 1) {
        setWonOppId(oppId);
        setWonOppName(opp.name);
        setTargetWonStageId(targetStageId);
        setShowWonModal(true);
        return;
      }

      // Don't update if same stage
      if (opp.pipeline_stage_id === targetStageId) return;

      updateOppStage(oppId, targetStageId, 'open');
      setJustDroppedId(oppId);
      setTimeout(() => setJustDroppedId(null), 550);
    },
    [opportunities, stages, updateOppStage]
  );

  const handleWonSubmit = async (data: { tracker_project_name: string; budgeted_hours: number }) => {
    if (!wonOppId || !targetWonStageId) return;
    try {
      await crmApi.markAsWon(wonOppId, data);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === wonOppId ? { ...o, pipeline_stage_id: targetWonStageId, status: 'won' } : o
        )
      );
      setShowWonModal(false);
      setWonOppId(null);
      setTargetWonStageId(null);
    } catch (err: any) {
      throw err;
    }
  };

  const handleOppSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const isEdit = editingOppId !== null;
    const oppId = editingOppId;

    try {
      const payload = {
        name: oppFormData.name,
        value: parseFloat(oppFormData.value) || 0,
        close_date: oppFormData.close_date || null,
        account_id: oppFormData.account_id ? parseInt(oppFormData.account_id, 10) : null,
        contact_id: oppFormData.contact_id ? parseInt(oppFormData.contact_id, 10) : null,
        pipeline_stage_id: oppFormData.pipeline_stage_id
          ? parseInt(oppFormData.pipeline_stage_id, 10)
          : stages[0]?.id,
        custom_fields: customFields,
      };

      let currentOppId: number;
      if (isEdit) {
        await crmApi.updateOpportunity(oppId!, payload);
        currentOppId = oppId!;
      } else {
        const created: any = await crmApi.createOpportunity(payload);
        currentOppId = created.id;
      }

      // Guardar cotización
      if (oppFormLineItems.length > 0) {
        const quotePayload = {
          quote_number: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          opportunity_id: currentOppId,
          status: 'draft' as QuoteStatus,
          items: oppFormLineItems.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percentage: Number(it.discount_percentage) || 0,
            tax_percentage: Number(it.tax_percentage) || 21,
          })),
        };

        if (oppQuoteId) {
          await crmApi.updateQuote(oppQuoteId, quotePayload);
        } else {
          await crmApi.createQuote(quotePayload);
        }
      } else if (oppQuoteId) {
        await crmApi.deleteQuote(oppQuoteId);
      }

      toast.success(isEdit ? 'Negociación y cotización guardadas con éxito.' : 'Oportunidad creada con éxito.');

      // Reset
      setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '' });
      setOppFormLineItems([]);
      setOppQuoteId(null);
      setCustomFields({});
      setModalTab('general');
      setShowOppModal(false);
      if (selectedPipelineId) loadPipelineData(selectedPipelineId);

      // Si era creación: auto-abrir edición
      if (!isEdit) {
        const newOpp: Opportunity = { id: currentOppId, name: oppFormData.name, value: String(payload.value), close_date: payload.close_date || '', status: 'open', pipeline_stage_id: payload.pipeline_stage_id!, account_id: payload.account_id, contact_id: payload.contact_id, line_items_count: 0 };
        handleEditOpp(newOpp);
      } else {
        setEditingOppId(null);
      }
    } catch (err: any) {
      toast.error(err?.message || `Error al ${isEdit ? 'actualizar' : 'crear'} la negociación.`);
    }
  };

  const loadOppCustomFields = async () => {
    try {
      setFieldDefs(await crmApi.listCustomFields('opportunity'));
    } catch { /* ignore */ }
  };

  // Render extra content in column header (total value)
  const renderColumnExtra = useCallback(
    (_stage: string, items: Opportunity[]) => {
      const total = items.reduce((sum, opp) => sum + (parseFloat(opp.value) || 0), 0);
      return (
        <span className="text-[11px] font-bold whitespace-nowrap"
          style={{ color: 'var(--sys-primary)' }}
        >
          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total)}
        </span>
      );
    },
    []
  );

  const handleEditOpp = useCallback(async (opp: Opportunity) => {
    setOppFormData({
      name: opp.name,
      value: String(parseFloat(opp.value) || 0),
      close_date: opp.close_date || '',
      account_id: String(opp.account_id ?? ''),
      contact_id: String(opp.contact_id ?? ''),
      pipeline_stage_id: String(opp.pipeline_stage_id),
    });
    setCustomFields(opp.custom_fields || {});
    setModalTab('general');
    setEditingOppId(opp.id);
    setShowOppModal(true);

    // Cargar cotización existente (si tiene)
    try {
      const quotes = await crmApi.listQuotes({ opportunity_id: opp.id });
      if (quotes.length > 0) {
        const q = quotes[0];
        // Cargar line items si el quote tiene ID
        if (q.id) {
          const items = await crmApi.getQuoteLineItems(q.id);
          setOppFormLineItems(items.map((it: any) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percentage: Number(it.discount_percentage) || 0,
            tax_percentage: Number(it.tax_percentage) || 21,
            product_name: it.product_name,
            product_sku: it.product_sku,
          })));
        } else {
          setOppFormLineItems([]);
        }
        setOppQuoteId(q.id);
      } else {
        setOppFormLineItems([]);
        setOppQuoteId(null);
      }
    } catch {
      setOppFormLineItems([]);
      setOppQuoteId(null);
    }
  }, []);

  const handleDeleteOpp = useCallback((opp: Opportunity) => {
    setOppToDelete(opp);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDeleteOpp = useCallback(async () => {
    if (!oppToDelete) return;
    try {
      await crmApi.deleteOpportunity(oppToDelete.id);
      toast.success('Negociación eliminada');
      if (selectedPipelineId) loadPipelineData(selectedPipelineId);
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteConfirmOpen(false);
      setOppToDelete(null);
    }
  }, [oppToDelete, selectedPipelineId]);

  const handleChatOpp = useCallback((opp: Opportunity) => {
    if (onOpenChat) {
      onOpenChat('crm_opportunity', opp.id, opp.name);
    }
  }, [onOpenChat]);

  const renderCard = useCallback(
    (opp: Opportunity) => (
      <OppCard
        opp={opp}
        isDropped={justDroppedId === opp.id}
        onEdit={handleEditOpp}
        onDelete={handleDeleteOpp}
        onChat={handleChatOpp}
      />
    ),
    [justDroppedId, handleEditOpp, handleDeleteOpp, handleChatOpp]
  );

  // Auto-open negotiation if autoOpenOppId is provided from notification click
  useEffect(() => {
    if (autoOpenOppId && opportunities.length > 0) {
      const opp = opportunities.find((o) => o.id === autoOpenOppId);
      if (opp) {
        handleEditOpp(opp);
        onClearAutoOpen?.();
      }
    }
  }, [autoOpenOppId, opportunities, onClearAutoOpen, handleEditOpp]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 shrink-0 pb-3 w-full sticky top-0 z-10" style={{ background: 'var(--sys-bg)' }}>
        <div className="flex items-center gap-3">
          <select
            className="input select max-w-xs"
            value={selectedPipelineId || ''}
            onChange={(e) => setSelectedPipelineId(parseInt(e.target.value, 10))}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="btn"
            style={{
              background: showArchived ? 'var(--sys-primary-container)' : 'transparent',
              color: showArchived ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
            }}
            title={showArchived ? 'Ocultar archivadas' : 'Mostrar archivadas'}
          >
            {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
        </div>
        <Button
          className="btn-primary"
          onClick={() => {
            setEditingOppId(null);
            setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: String(stages[0]?.id || '') });
            setOppFormLineItems([]);
            setOppQuoteId(null);
            setCustomFields({});
            setModalTab('general');
            setShowOppModal(true);
          }}
        >
          <Plus size={16} /> Nueva Negociación
        </Button>
      </div>

      {/* KanbanBoard */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          itemsByStage={itemsByStage}
          onDrop={handleDrop}
          renderCard={renderCard}
          renderColumnExtra={renderColumnExtra}
          className="h-full"
        />
      </div>

      {/* Won Modal Integration */}
      {showWonModal && (
        <WonOpportunityModal
          isOpen={showWonModal}
          onClose={() => setShowWonModal(false)}
          onSubmit={handleWonSubmit}
          defaultName={wonOppName}
          opportunityId={wonOppId}
        />
      )}

      {/* Modal único - Crear / Editar Negociación */}
      <Modal 
        open={showOppModal} 
        onClose={() => { 
          setShowOppModal(false); 
          setEditingOppId(null); 
          setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '' }); 
          setOppFormLineItems([]); 
          setOppQuoteId(null); 
          setCustomFields({});
          setModalTab('general');
        }} 
        title={editingOppId ? 'Editar Negociación' : 'Nueva Negociación'} 
        className="modal-wide"
      >
        <div className="flex gap-1 p-1 rounded-lg mb-4 mt-2" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
          <button onClick={() => setModalTab('general')} className="btn" style={{ background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'general' ? 600 : 500, fontSize: '0.8125rem' }}>
            General
          </button>
          {fieldDefs.length > 0 && (
            <button onClick={() => setModalTab('custom-fields')} className="btn" style={{ background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'custom-fields' ? 600 : 500, fontSize: '0.8125rem' }}>
              Campos Personalizados
            </button>
          )}
        </div>

        {modalTab === 'general' ? (
          <form onSubmit={handleOppSubmit} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-2">
            {/* ── Datos básicos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  NOMBRE DE LA NEGOCIACIÓN
                </label>
                <Input
                  value={oppFormData.name}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Licencias Enterprise KODAN"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  VALOR ESTIMADO (ARS)
                </label>
                <Input
                  type="number"
                  value={oppFormData.value}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  FECHA CIERRE PROYECTADA
                </label>
                <Input
                  type="date"
                  value={oppFormData.close_date}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, close_date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  CUENTA B2B
                </label>
                <select
                  className="input select"
                  value={oppFormData.account_id}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, account_id: e.target.value }))}
                >
                  <option value="">Selecciona una cuenta corporativa</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  CONTACTO
                </label>
                <select
                  className="input select"
                  value={oppFormData.contact_id}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, contact_id: e.target.value }))}
                >
                  <option value="">Selecciona un contacto corporativo</option>
                  {contacts.map((c) => (
                    <option key={c.contact_id} value={c.contact_id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  ETAPA
                </label>
                <select
                  className="input select"
                  value={oppFormData.pipeline_stage_id}
                  onChange={(e) => setOppFormData((prev) => ({ ...prev, pipeline_stage_id: e.target.value }))}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Separador ── */}
            <hr style={{ borderColor: 'var(--sys-border-soft)' }} />

            {/* ── Cotización integrada ── */}
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--sys-text-muted)' }}>
                <FileText size={15} className="inline mr-1.5" style={{ color: 'var(--sys-primary)' }} />
                Cotización
              </h3>

              <div className="flex flex-col gap-1 mb-4">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  PRODUCTOS / SERVICIOS
                </label>
                <QuoteLineItemsEditor items={oppFormLineItems} onChange={setOppFormLineItems} />
              </div>
            </div>

            {/* ── Archivar / Restaurar (Solo si es edición) ── */}
            {editingOppId !== null && (
              <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>ESTADO DE ARCHIVO</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const isArchived = opportunities.find(o => o.id === editingOppId)?.is_archived;
                      if (isArchived) {
                        await crmApi.unarchiveOpportunity(editingOppId)
                        toast.success('Negociación restaurada del archivo')
                      } else {
                        await crmApi.archiveOpportunity(editingOppId)
                        toast.success('Negociación archivada')
                      }
                      setShowOppModal(false)
                      setEditingOppId(null)
                      if (selectedPipelineId) loadPipelineData(selectedPipelineId, showArchived)
                    } catch { toast.error('Error al archivar/restaurar') }
                  }}
                  className="btn gap-1.5 text-xs font-semibold py-1.5 px-3 flex items-center"
                  style={{
                    color: 'var(--sys-text-muted)',
                    border: '1px solid var(--sys-border-soft)',
                  }}
                >
                  {opportunities.find(o => o.id === editingOppId)?.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  {opportunities.find(o => o.id === editingOppId)?.is_archived ? 'Restaurar' : 'Archivar Negociación'}
                </button>
              </div>
            )}

            {/* ── Acciones ── */}
            <div
              className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
              style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
            >
              <Button variant="secondary" type="button" onClick={() => { setShowOppModal(false); setEditingOppId(null); setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '' }); setOppFormLineItems([]); setOppQuoteId(null); setCustomFields({}); setModalTab('general'); }}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" className="btn-primary">
                {editingOppId ? 'Guardar Cambios' : 'Crear Negociación'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
            <CustomFieldsForm
              definitions={fieldDefs}
              values={customFields}
              onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
            />
            <div
              className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
              style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
            >
              <Button variant="secondary" type="button" onClick={() => { setShowOppModal(false); setEditingOppId(null); setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '' }); setOppFormLineItems([]); setOppQuoteId(null); setCustomFields({}); setModalTab('general'); }}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => handleOppSubmit()} className="btn-primary">
                {editingOppId ? 'Guardar Cambios' : 'Crear Negociación'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar negociación"
        message={oppToDelete ? `¿Eliminar "${oppToDelete.name}"?` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteOpp}
      />
    </div>
  );
}
