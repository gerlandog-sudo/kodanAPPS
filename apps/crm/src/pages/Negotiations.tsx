import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Button,
  EntityCard,
  ConfirmDialog,
  Select,
  Table,
  useAuth,
  withAlpha,
  tintWithSurface,
  KanbanBoard,
} from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { WonOpportunityModal } from '../components/modals/WonOpportunityModal';
import { LostOpportunityModal } from '../components/modals/LostOpportunityModal';
import type { QuoteLineItem, QuoteStatus } from '../types/admin';
import { NegotiationFormModal, type OppFormData } from '../components/negotiations/NegotiationFormModal';
import { CalendarView } from '../components/negotiations/CalendarView';
import { useNegotiationsData, type NegotiationOpportunity } from '../hooks/useNegotiationsData';
import {
  Plus,
  Archive,
  ArchiveRestore,
  LayoutGrid,
  Table as TableIcon,
  Calendar as CalendarIcon,
  MessageSquare,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '@kodan-apps/ui-core';

const EMPTY_FORM: OppFormData = {
  name: '',
  value: '0',
  close_date: '',
  account_id: '',
  contact_id: '',
  pipeline_stage_id: '',
  owner_user_id: '',
};

// ── OppCard (kanban card) ─────────────────────────────────────────────
interface CardProps {
  opp: NegotiationOpportunity;
  isDropped: boolean;
  onEdit: (opp: NegotiationOpportunity) => void;
  onDelete: (opp: NegotiationOpportunity) => void;
  onChat: (opp: NegotiationOpportunity) => void;
  onMail: (opp: NegotiationOpportunity) => void;
}

function OppCard({ opp, isDropped, onEdit, onDelete, onChat, onMail }: CardProps) {
  return (
    <EntityCard
      title={opp.name}
      amount={parseFloat(String(opp.value)) || 0}
      accountName={opp.account_name}
      startDate={opp.created_at}
      closeDate={opp.close_date}
      lineItemsCount={opp.line_items_count ?? 0}
      quoteTotal={opp.quote_total}
      ownerName={opp.owner_name}
      ownerAvatar={opp.owner_avatar}
      isDropped={isDropped}
      onChat={() => onChat(opp)}
      chatUnreadCount={opp.chat_unread_count}
      onMail={() => onMail(opp)}
      onEdit={() => onEdit(opp)}
      onDelete={() => onDelete(opp)}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────
interface NegotiationsProps {
  onOpenChat?: (entityType: string, entityId: number, title?: string) => void;
  onOpenMail?: (entityType: string, entityId: number, recipientEmail?: string, entityData?: Record<string, unknown>) => void;
  onNavigate?: (route: string) => void;
  autoOpenOppId?: number | null;
  onClearAutoOpen?: () => void;
}

export function Negotiations({ onOpenChat, onOpenMail, autoOpenOppId, onClearAutoOpen }: NegotiationsProps) {
  const { user: currentUser } = useAuth('crm');
  const {
    pipelines, selectedPipelineId, stages, opportunities, fieldDefs,
    showArchived, justDroppedId,
    setSelectedPipelineId, setShowArchived, setOpportunities,
    updateOppStage, handleDrop, handleConfirmDeleteOpp, handleArchiveToggle, notifyRefresh,
    columns, itemsByStage,
    pipelineSelectOptions, accountSelectOptions, contactSelectOptions, stageSelectOptions, userSelectOptions,
  } = useNegotiationsData();

  // ── View mode ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>('kanban');
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Modals ───────────────────────────────────────────────────────
  const [showOppModal, setShowOppModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<NegotiationOpportunity | null>(null);

  // Won modal
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonOppId, setWonOppId] = useState<number | null>(null);
  const [wonOppName, setWonOppName] = useState('');
  const [targetWonStageId, setTargetWonStageId] = useState<number | null>(null);

  // Lost modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostOppId, setLostOppId] = useState<number | null>(null);
  const [lostOppName, setLostOppName] = useState('');
  const [targetLostStageId, setTargetLostStageId] = useState<number | null>(null);

  // ── Form state (create / edit) ───────────────────────────────────
  const [oppFormData, setOppFormData] = useState<OppFormData>(EMPTY_FORM);
  const [oppFormLineItems, setOppFormLineItems] = useState<QuoteLineItem[]>([]);
  const [oppQuoteId, setOppQuoteId] = useState<number | null>(null);
  const [editingOppId, setEditingOppId] = useState<number | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  const editingOpp = useMemo(() => {
    return editingOppId ? opportunities.find((o) => o.id === editingOppId) : null;
  }, [editingOppId, opportunities]);

  const isReadOnly = useMemo(() => {
    return editingOpp ? (editingOpp.status === 'won' || editingOpp.status === 'lost') : false;
  }, [editingOpp]);

  // ── Drop handler ─────────────────────────────────────────────────
  const onDrop = useCallback(
    (itemId: string | number, toStage: string) => {
      const result = handleDrop(itemId, toStage);
      if (!result) return;
      if (result.action === 'won') {
        setWonOppId(result.oppId);
        setWonOppName(result.oppName);
        setTargetWonStageId(result.targetStageId);
        setShowWonModal(true);
      } else if (result.action === 'lost') {
        setLostOppId(result.oppId);
        setLostOppName(result.oppName);
        setTargetLostStageId(result.targetStageId);
        setShowLostModal(true);
      }
    },
    [handleDrop],
  );

  // ── Won / Lost handlers ──────────────────────────────────────────
  const handleWonSubmit = async (data: { tracker_project_name: string; budgeted_hours: number; close_reason: string }) => {
    if (!wonOppId || !targetWonStageId) return;
    try {
      await crmApi.markAsWon(wonOppId, data);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === wonOppId ? { ...o, pipeline_stage_id: targetWonStageId, status: 'won' as const, close_reason: data.close_reason } : o,
        ),
      );
      setShowWonModal(false);
      setWonOppId(null);
      setTargetWonStageId(null);
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleLostSubmit = async (closeReason: string) => {
    if (!lostOppId || !targetLostStageId) return;
    try {
      await updateOppStage(lostOppId, targetLostStageId, 'lost', { close_reason: closeReason });
      setShowLostModal(false);
      setLostOppId(null);
      setTargetLostStageId(null);
    } catch (err: unknown) {
      throw err;
    }
  };

  // ── Form submit ──────────────────────────────────────────────────
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
        pipeline_stage_id: oppFormData.pipeline_stage_id ? parseInt(oppFormData.pipeline_stage_id, 10) : stages[0]?.id,
        owner_user_id: oppFormData.owner_user_id ? parseInt(oppFormData.owner_user_id, 10) : null,
        custom_fields: customFields,
      };

      let currentOppId: number;
      if (isEdit) {
        await crmApi.updateOpportunity(oppId!, payload as any);
        currentOppId = oppId!;
      } else {
        const created: any = await crmApi.createOpportunity(payload as any);
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

      resetForm();
      setShowOppModal(false);
      notifyRefresh();

      // Auto-abrir edición si fue creación
      if (!isEdit) {
        const newOpp: NegotiationOpportunity = {
          id: currentOppId,
          tenant_id: 0,
          pipeline_id: payload.pipeline_stage_id || 0,
          pipeline_stage_id: payload.pipeline_stage_id || 0,
          stage_id: payload.pipeline_stage_id || 0,
          name: oppFormData.name,
          value: String(payload.value),
          currency: 'ARS',
          probability: 0,
          status: 'open',
          close_reason: null,
          close_date: payload.close_date || '',
          expected_close_date: null,
          assigned_to: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          account_id: payload.account_id,
          contact_id: payload.contact_id,
          owner_user_id: payload.owner_user_id,
          line_items_count: 0,
        };
        handleEditOpp(newOpp);
      } else {
        setEditingOppId(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Error al ${isEdit ? 'actualizar' : 'crear'} la negociación.`);
    }
  };

  const resetForm = useCallback(() => {
    setOppFormData(EMPTY_FORM);
    setOppFormLineItems([]);
    setOppQuoteId(null);
    setCustomFields({});
    setEditingOppId(null);
  }, []);

  const closeFormModal = useCallback(() => {
    resetForm();
    setShowOppModal(false);
  }, [resetForm]);

  // ── Edit / Delete / Chat / Mail ──────────────────────────────────
  const handleEditOpp = useCallback(async (opp: NegotiationOpportunity) => {
    setOppFormData({
      name: opp.name,
      value: String(parseFloat(String(opp.value)) || 0),
      close_date: opp.close_date || '',
      account_id: String(opp.account_id ?? ''),
      contact_id: String(opp.contact_id ?? ''),
      pipeline_stage_id: String(opp.pipeline_stage_id),
      owner_user_id: opp.owner_user_id ? String(opp.owner_user_id) : (currentUser?.id ? String(currentUser.id) : ''),
    });
    setCustomFields((opp.custom_fields as Record<string, unknown>) || {});
    setEditingOppId(opp.id);
    setShowOppModal(true);

    // Load existing quote
    try {
      const quotes = await crmApi.listQuotes({ opportunity_id: opp.id });
      if (quotes.length > 0) {
        const q = quotes[0];
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
  }, [currentUser]);

  const handleDeleteOpp = useCallback((opp: NegotiationOpportunity) => {
    setOppToDelete(opp);
    setDeleteConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    await handleConfirmDeleteOpp(oppToDelete);
    setDeleteConfirmOpen(false);
    setOppToDelete(null);
  }, [handleConfirmDeleteOpp, oppToDelete]);

  const handleChatOpp = useCallback(
    (opp: NegotiationOpportunity) => {
      if (onOpenChat) onOpenChat('crm_opportunity', opp.id, opp.name);
    },
    [onOpenChat],
  );

  const handleMailOpp = useCallback(
    (opp: NegotiationOpportunity) => {
      if (onOpenMail) {
        onOpenMail('crm_opportunity', opp.id, undefined, {
          contact_name: opp.contact_name || '',
          account_name: opp.account_name || '',
          opportunity_name: opp.name || '',
          opportunity_value: opp.value || '',
        });
      }
    },
    [onOpenMail],
  );

  const onArchiveToggle = useCallback(async () => {
    if (editingOppId) {
      const success = await handleArchiveToggle(editingOppId);
      if (success) closeFormModal();
    }
  }, [editingOppId, handleArchiveToggle, closeFormModal]);

  // ── Kanban render helpers ────────────────────────────────────────
  const renderColumnExtra = useCallback(
    (_stage: string, items: NegotiationOpportunity[]) => {
      const total = items.reduce((sum, opp) => sum + (parseFloat(String(opp.value)) || 0), 0);
      return (
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: 'var(--sys-primary)' }}>
          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total)}
        </span>
      );
    },
    [],
  );

  const renderCard = useCallback(
    (opp: NegotiationOpportunity) => (
      <OppCard
        opp={opp}
        isDropped={justDroppedId === opp.id}
        onEdit={handleEditOpp}
        onDelete={handleDeleteOpp}
        onChat={handleChatOpp}
        onMail={handleMailOpp}
      />
    ),
    [justDroppedId, handleEditOpp, handleDeleteOpp, handleChatOpp, handleMailOpp],
  );

  // ── Auto-open from notification ──────────────────────────────────
  useEffect(() => {
    if (autoOpenOppId && opportunities.length > 0) {
      const opp = opportunities.find((o) => o.id === autoOpenOppId);
      if (opp) {
        handleEditOpp(opp);
        onClearAutoOpen?.();
      }
    }
  }, [autoOpenOppId, opportunities, onClearAutoOpen, handleEditOpp]);

  // ── Table columns ────────────────────────────────────────────────
  const tableColumns = useMemo<TableColumn<NegotiationOpportunity>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre de la Negociación',
        sortable: true,
        render: (opp) => (
          <span className="font-semibold cursor-pointer hover:underline text-[13px] text-text" onClick={() => handleEditOpp(opp)}>
            {opp.name}
          </span>
        ),
      },
      {
        key: 'account_name',
        header: 'Cuenta',
        sortable: true,
        render: (opp) => opp.account_name || <span className="text-text-muted opacity-60">—</span>,
      },
      {
        key: 'contact_name',
        header: 'Contacto',
        sortable: true,
        render: (opp) => opp.contact_name || <span className="text-text-muted opacity-60">—</span>,
      },
      {
        key: 'owner_name',
        header: 'Asesor',
        sortable: true,
        render: (opp) => opp.owner_name || <span className="text-text-muted opacity-60">—</span>,
      },
      {
        key: 'pipeline_stage_id',
        header: 'Etapa',
        sortable: true,
        render: (opp) => {
          const stage = stages.find((s) => s.id === opp.pipeline_stage_id);
          const stageName = stage?.name || opp.stage_name || 'Sin etapa';
          const stageColor = stage?.color_hex || '#e2e8f0';
          return (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium border"
              style={{ background: tintWithSurface(stageColor, 12), borderColor: withAlpha(stageColor, 30), color: stageColor }}
            >
              {stageName}
            </span>
          );
        },
      },
      {
        key: 'value',
        header: 'Valor',
        sortable: true,
        align: 'right' as const,
        render: (opp) => (
          <span className="font-bold text-primary">
            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
              parseFloat(String(opp.value)) || 0,
            )}
          </span>
        ),
      },
      {
        key: 'close_date',
        header: 'Fecha Cierre',
        sortable: true,
        render: (opp) => {
          if (!opp.close_date) return <span className="text-text-muted opacity-60">—</span>;
          const parts = opp.close_date.split('-');
          if (parts.length === 3) return <span>{`${parts[2]}/${parts[1]}/${parts[0]}`}</span>;
          return <span>{opp.close_date}</span>;
        },
      },
    ],
    [stages, handleEditOpp],
  );

  const tableActions = useMemo(
    () => [
      {
        icon: <MessageSquare size={14} />,
        label: 'Chatear',
        onClick: handleChatOpp,
        badge: (opp: NegotiationOpportunity) =>
          opp.chat_unread_count && opp.chat_unread_count > 0 ? opp.chat_unread_count : undefined,
      },
    ],
    [handleChatOpp],
  );

  // ── Export ───────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      const dataToExport = opportunities.map((opp) => ({
        name: opp.name,
        account: opp.account_name || 'Sin cuenta',
        contact: opp.contact_name || 'Sin contacto',
        stage: stages.find((s) => s.id === opp.pipeline_stage_id)?.name || opp.stage_name || 'Sin etapa',
        value: parseFloat(String(opp.value)) || 0,
        close_date: opp.close_date || 'Sin fecha',
        status: opp.status === 'open' ? 'Activa' : opp.status === 'won' ? 'Ganada' : 'Perdida',
      }));

      await exportToExcel({
        data: dataToExport,
        columns: [
          { key: 'name', header: 'Negociación' },
          { key: 'account', header: 'Cuenta' },
          { key: 'contact', header: 'Contacto' },
          { key: 'stage', header: 'Etapa' },
          { key: 'value', header: 'Valor (ARS)', align: 'right', numFmt: '$#,##0' },
          { key: 'close_date', header: 'Fecha de Cierre', align: 'center' },
          { key: 'status', header: 'Estado', align: 'center' },
        ],
        filename: `negociaciones_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Canal',
      });
      toast.success('Canal exportado a Excel con éxito');
    } catch {
      toast.error('Error al exportar a Excel');
    }
  };

  // ── Calendar handlers ────────────────────────────────────────────
  const handleDayClick = useCallback(
    (date: Date) => {
      setEditingOppId(null);
      setOppFormData({
        ...EMPTY_FORM,
        close_date: getLocalDateString(date),
        pipeline_stage_id: String(stages[0]?.id || ''),
        owner_user_id: currentUser?.id ? String(currentUser.id) : '',
      });
      setOppFormLineItems([]);
      setOppQuoteId(null);
      setCustomFields({});
      setShowOppModal(true);
    },
    [stages, currentUser],
  );

  const newOppClick = useCallback(() => {
    setEditingOppId(null);
    setOppFormData({
      ...EMPTY_FORM,
      pipeline_stage_id: String(stages[0]?.id || ''),
      owner_user_id: currentUser?.id ? String(currentUser.id) : '',
    });
    setOppFormLineItems([]);
    setOppQuoteId(null);
    setCustomFields({});
    setShowOppModal(true);
  }, [stages, currentUser]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top Controls */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 pb-3 w-full sticky top-0 z-10"
        style={{ background: 'var(--sys-bg)' }}
      >
        <div className="flex items-center gap-3">
          <Select
            options={pipelineSelectOptions}
            value={selectedPipelineId || ''}
            onChange={(val) => setSelectedPipelineId(Number(val))}
            className="w-full max-w-xs"
            placeholder="Seleccionar canal..."
          />
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="bg-transparent border border-border-soft rounded-lg px-3 py-2 cursor-pointer inline-flex items-center justify-center transition-colors"
            style={{
              background: showArchived ? 'var(--sys-primary-container)' : 'transparent',
              color: showArchived ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
            }}
            title={showArchived ? 'Ocultar archivadas' : 'Mostrar archivadas'}
          >
            {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border-soft" style={{ background: 'var(--sys-surface)' }}>
            {[
              { mode: 'kanban' as const, icon: <LayoutGrid size={16} />, title: 'Vista Kanban' },
              { mode: 'table' as const, icon: <TableIcon size={16} />, title: 'Vista de Tabla' },
              { mode: 'calendar' as const, icon: <CalendarIcon size={16} />, title: 'Vista de Calendario' },
            ].map(({ mode, icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                style={{
                  background: viewMode === mode ? 'var(--sys-surface-hover)' : 'transparent',
                  color: viewMode === mode ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                }}
                title={title}
              >
                {icon}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center justify-center transition-colors text-text-muted active:scale-95 no-print"
            title="Exportar a Excel"
          >
            <Download size={16} />
          </button>
        </div>
        <Button className="btn-primary" onClick={newOppClick}>
          <Plus size={16} /> Nueva Negociación
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === 'kanban' && (
          <KanbanBoard
            columns={columns}
            itemsByStage={itemsByStage}
            onDrop={onDrop}
            renderCard={renderCard}
            renderColumnExtra={renderColumnExtra}
            className="h-full"
          />
        )}

        {viewMode === 'table' && (
          <div className="flex-1 overflow-auto pb-4">
            <Table
              data={opportunities}
              columns={tableColumns}
              keyExtractor={(opp) => opp.id}
              editable={{ onClick: handleEditOpp }}
              deletable={{ onClick: handleDeleteOpp }}
              actions={tableActions}
              pageSize={15}
              emptyState={{
                icon: <LayoutGrid size={40} className="text-text-muted opacity-30" />,
                title: 'No hay negociaciones',
                description: 'Crea una negociación para verla en la lista.',
              }}
            />
          </div>
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            currentDate={currentDate}
            stages={stages}
            opportunities={opportunities}
            onPrevMonth={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            onNextMonth={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            onToday={() => setCurrentDate(new Date())}
            onDayClick={handleDayClick}
            onOppClick={handleEditOpp}
          />
        )}
      </div>

      {/* Won Modal */}
      {showWonModal && (
        <WonOpportunityModal
          isOpen={showWonModal}
          onClose={() => setShowWonModal(false)}
          onSubmit={handleWonSubmit}
          defaultName={wonOppName}
          opportunityId={wonOppId}
          wonReasons={pipelines.find((p) => p.id === selectedPipelineId)?.ui_config?.won_reasons || []}
        />
      )}

      {/* Lost Modal */}
      {showLostModal && (
        <LostOpportunityModal
          isOpen={showLostModal}
          onClose={() => setShowLostModal(false)}
          onSubmit={handleLostSubmit}
          opportunityName={lostOppName}
          lostReasons={pipelines.find((p) => p.id === selectedPipelineId)?.ui_config?.lost_reasons || []}
        />
      )}

      {/* Create / Edit Modal */}
      <NegotiationFormModal
        open={showOppModal}
        isEdit={editingOppId !== null}
        isReadOnly={isReadOnly}
        editingOppId={editingOppId}
        isArchived={editingOpp?.is_archived}
        editingOppStatus={editingOpp?.status}
        formData={oppFormData}
        lineItems={oppFormLineItems}
        quoteId={oppQuoteId}
        customFields={customFields}
        fieldDefs={fieldDefs}
        pipelineStageOptions={stageSelectOptions}
        accountOptions={accountSelectOptions}
        contactOptions={contactSelectOptions}
        userOptions={userSelectOptions}
        onFormDataChange={setOppFormData}
        onLineItemsChange={setOppFormLineItems}
        onCustomFieldsChange={setCustomFields}
        onSubmit={handleOppSubmit}
        onArchiveToggle={onArchiveToggle}
        onClose={closeFormModal}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar negociación"
        message={oppToDelete ? `¿Eliminar "${oppToDelete.name}"?` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function getLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
