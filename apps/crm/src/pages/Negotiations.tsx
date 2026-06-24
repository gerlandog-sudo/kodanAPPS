import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Input, Modal, CustomFieldsForm, EntityCard, ConfirmDialog, Select, Table, DatePicker } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { WonOpportunityModal } from '../components/modals/WonOpportunityModal';
import { LostOpportunityModal } from '../components/modals/LostOpportunityModal';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import type { ColumnDef } from '../components/kanban/KanbanBoard';
import { QuoteLineItemsEditor } from '../components/quotes/QuoteLineItemsEditor';
import type { QuoteLineItem, QuoteStatus } from '../types/admin';
import { 
  Plus,
  Archive,
  ArchiveRestore,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Download,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '../utils/excelExport';

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
  close_reason?: string | null;
  chat_unread_count?: number;
}

interface Stage {
  id: number;
  name: string;
  color_hex: string;
  sort_order: number;
  is_won_stage: number;
  is_lost_stage: number;
  pipeline_id: number;
}

interface Pipeline {
  id: number;
  name: string;
  is_default: number;
  ui_config?: {
    won_reasons?: string[];
    lost_reasons?: string[];
  } | null;
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
      chatUnreadCount={opp.chat_unread_count}
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
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>('kanban');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper para formatear fechas a YYYY-MM-DD local
  const getLocalDateString = useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Modals / Drawers
  const [showOppModal, setShowOppModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonOppId, setWonOppId] = useState<number | null>(null);
  const [wonOppName, setWonOppName] = useState('');
  const [targetWonStageId, setTargetWonStageId] = useState<number | null>(null);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostOppId, setLostOppId] = useState<number | null>(null);
  const [lostOppName, setLostOppName] = useState('');
  const [targetLostStageId, setTargetLostStageId] = useState<number | null>(null);
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
    owner_user_id: '',
  });
  const [oppFormLineItems, setOppFormLineItems] = useState<QuoteLineItem[]>([]);
  const [oppQuoteId, setOppQuoteId] = useState<number | null>(null);
  const [editingOppId, setEditingOppId] = useState<number | null>(null);

  const editingOpp = useMemo(() => {
    return editingOppId ? opportunities.find(o => o.id === editingOppId) : null;
  }, [editingOppId, opportunities]);

  const isReadOnly = useMemo(() => {
    return editingOpp ? (editingOpp.status === 'won' || editingOpp.status === 'lost') : false;
  }, [editingOpp]);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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
      toast.error('Error al cargar los canales.');
    }
  };

  const loadAccountsAndContacts = async () => {
    try {
      const [accs, conts, userList] = await Promise.all([
        crmApi.listAccounts(),
        crmApi.listContacts(),
        crmApi.listTenantUsers(),
      ]);
      setAccounts(accs);
      setContacts(conts);
      setUsers(userList);
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
      toast.error('Error al cargar datos del canal.');
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
    async (oppId: number, stageId: number, status: 'open' | 'won' | 'lost', extraData: Record<string, any> = {}) => {
      const previousOpps = [...opportunities];
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, pipeline_stage_id: stageId, status, ...extraData } : o))
      );

      try {
        await crmApi.updateOpportunity(oppId, {
          pipeline_stage_id: stageId,
          status,
          ...extraData
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

      // If it's a Lost stage, trigger the Lost modal
      if (targetStage.is_lost_stage === 1) {
        setLostOppId(oppId);
        setLostOppName(opp.name);
        setTargetLostStageId(targetStageId);
        setShowLostModal(true);
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

  const handleWonSubmit = async (data: { tracker_project_name: string; budgeted_hours: number; close_reason: string }) => {
    if (!wonOppId || !targetWonStageId) return;
    try {
      await crmApi.markAsWon(wonOppId, data);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === wonOppId ? { ...o, pipeline_stage_id: targetWonStageId, status: 'won', close_reason: data.close_reason } : o
        )
      );
      setShowWonModal(false);
      setWonOppId(null);
      setTargetWonStageId(null);
    } catch (err: any) {
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
        owner_user_id: oppFormData.owner_user_id ? parseInt(oppFormData.owner_user_id, 10) : null,
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
      setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '', owner_user_id: '' });
      setOppFormLineItems([]);
      setOppQuoteId(null);
      setCustomFields({});
      setModalTab('general');
      setShowOppModal(false);
      if (selectedPipelineId) loadPipelineData(selectedPipelineId);

      // Si era creación: auto-abrir edición
      if (!isEdit) {
        const newOpp: Opportunity = { id: currentOppId, name: oppFormData.name, value: String(payload.value), close_date: payload.close_date || '', status: 'open', pipeline_stage_id: payload.pipeline_stage_id!, account_id: payload.account_id, contact_id: payload.contact_id, line_items_count: 0, owner_user_id: payload.owner_user_id };
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

  const pipelineSelectOptions = useMemo(() => {
    return pipelines.map(p => ({ value: p.id, label: p.name }));
  }, [pipelines]);

  const accountSelectOptions = useMemo(() => {
    return accounts.map(a => ({ value: a.account_id, label: a.name }));
  }, [accounts]);

  const contactSelectOptions = useMemo(() => {
    return contacts.map(c => ({ value: c.contact_id, label: `${c.first_name} ${c.last_name}` }));
  }, [contacts]);

  const stageSelectOptions = useMemo(() => {
    return stages.map(s => ({ value: s.id, label: s.name }));
  }, [stages]);

  const userSelectOptions = useMemo(() => {
    const list = users.map((u) => ({
      value: String(u.id),
      label: u.display_name || u.email,
    }));
    return [
      { value: '', label: 'Sin Asignar / Ninguno' },
      ...list
    ];
  }, [users]);

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
      owner_user_id: String(opp.owner_user_id ?? ''),
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
  const tableColumns = useMemo<TableColumn<Opportunity>[]>(() => [
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
        const stage = stages.find(s => s.id === opp.pipeline_stage_id);
        const stageName = stage?.name || opp.stage_name || 'Sin etapa';
        const stageColor = stage?.color_hex || '#e2e8f0';
        return (
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-medium border"
            style={{ 
              background: `color-mix(in srgb, ${stageColor} 12%, var(--sys-surface))`, 
              borderColor: `color-mix(in srgb, ${stageColor} 30%, transparent)`,
              color: stageColor
            }}
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
          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(parseFloat(opp.value) || 0)}
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
        if (parts.length === 3) {
          return <span>{`${parts[2]}/${parts[1]}/${parts[0]}`}</span>;
        }
        return <span>{opp.close_date}</span>;
      },
    },
  ], [stages, handleEditOpp]);

  const tableActions = useMemo(() => [
    {
      icon: <MessageSquare size={14} />,
      label: 'Chatear',
      onClick: handleChatOpp,
      badge: (opp: Opportunity) => opp.chat_unread_count && opp.chat_unread_count > 0 ? opp.chat_unread_count : undefined
    }
  ], [handleChatOpp]);

  const handleExportExcel = async () => {
    try {
      const dataToExport = opportunities.map(opp => ({
        name: opp.name,
        account: opp.account_name || 'Sin cuenta',
        contact: opp.contact_name || 'Sin contacto',
        stage: stages.find(s => s.id === opp.pipeline_stage_id)?.name || opp.stage_name || 'Sin etapa',
        value: parseFloat(opp.value) || 0,
        close_date: opp.close_date || 'Sin fecha',
        status: opp.status === 'open' ? 'Activa' : opp.status === 'won' ? 'Ganada' : 'Perdida'
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
          { key: 'status', header: 'Estado', align: 'center' }
        ],
        filename: `negociaciones_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Canal'
      });
      toast.success('Canal exportado a Excel con éxito');
    } catch {
      toast.error('Error al exportar a Excel');
    }
  };

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    const dateStr = getLocalDateString(date);
    setEditingOppId(null);
    setOppFormData({
      name: '',
      value: '0',
      close_date: dateStr,
      account_id: '',
      contact_id: '',
      pipeline_stage_id: String(stages[0]?.id || ''),
      owner_user_id: '',
    });
    setOppFormLineItems([]);
    setOppQuoteId(null);
    setCustomFields({});
    setModalTab('general');
    setShowOppModal(true);
  }, [stages, getLocalDateString]);

  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); 
    const startPadding = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    const nextPaddingCount = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return cells;
  }, [currentDate]);

  const todayStr = useMemo(() => getLocalDateString(new Date()), [getLocalDateString]);
  const monthNames = useMemo(() => [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ], []);

  const renderCalendarView = () => {
    const daysOfWeekLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg overflow-hidden p-4">
        {/* Header del Calendario */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold text-text-muted transition-colors active:scale-95"
            >
              Hoy
            </button>
            <button
              onClick={handleNextMonth}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Rejilla del Calendario */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 border-b border-border-soft pb-2 mb-1">
            {daysOfWeekLabels.map((lbl) => (
              <div key={lbl} className="text-center text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {lbl}
              </div>
            ))}
          </div>

          {/* Rejilla de días */}
          <div className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-y divide-border-soft/60 border-t border-l border-border-soft/60" style={{ gridAutoRows: '1fr' }}>
            {calendarCells.map((cell, idx) => {
              const cellDateStr = getLocalDateString(cell.date);
              const isToday = cellDateStr === todayStr;
              const dayOpps = opportunities.filter((opp) => opp.close_date === cellDateStr);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.date)}
                  className={`p-2 flex flex-col gap-1 min-h-[90px] overflow-hidden select-none transition-colors border-r border-b border-border-soft/60 cursor-pointer ${
                    cell.isCurrentMonth ? 'bg-surface-raised hover:bg-surface-hover/20' : 'bg-surface/30 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span />
                    <span
                      className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-primary text-on-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 max-h-[120px] scrollbar-none">
                    {dayOpps.map((opp) => {
                      const stage = stages.find((s) => s.id === opp.pipeline_stage_id);
                      const stageColor = stage?.color_hex || 'var(--sys-primary)';
                      return (
                        <div
                          key={opp.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOpp(opp);
                          }}
                          className="w-full text-left p-1 rounded text-[10px] font-medium transition-all hover:scale-[1.01] truncate flex flex-col border"
                          style={{
                            background: `color-mix(in srgb, ${stageColor} 8%, var(--sys-surface))`,
                            borderColor: `color-mix(in srgb, ${stageColor} 20%, transparent)`,
                            borderLeftWidth: '3px',
                            borderLeftColor: stageColor,
                            color: 'var(--sys-text)',
                            cursor: 'pointer',
                          }}
                          title={`${opp.name} - ${stage?.name || ''}`}
                        >
                          <span className="font-semibold truncate leading-tight">{opp.name}</span>
                          <span className="text-[9px] text-primary font-bold mt-0.5">
                            {new Intl.NumberFormat('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                              maximumFractionDigits: 0,
                            }).format(parseFloat(opp.value) || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 pb-3 w-full sticky top-0 z-10" style={{ background: 'var(--sys-bg)' }}>
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

          {/* Selector de Vistas */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border-soft" style={{ background: 'var(--sys-surface)' }}>
            <button
              onClick={() => setViewMode('kanban')}
              className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
              style={{
                background: viewMode === 'kanban' ? 'var(--sys-surface-hover)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
              }}
              title="Vista Kanban"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
              style={{
                background: viewMode === 'table' ? 'var(--sys-surface-hover)' : 'transparent',
                color: viewMode === 'table' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
              }}
              title="Vista de Tabla"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
              style={{
                background: viewMode === 'calendar' ? 'var(--sys-surface-hover)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
              }}
              title="Vista de Calendario"
            >
              <CalendarIcon size={16} />
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center justify-center transition-colors text-text-muted active:scale-95 no-print"
            title="Exportar a Excel"
          >
            <Download size={16} />
          </button>
        </div>
        <Button
          className="btn-primary"
          onClick={() => {
            setEditingOppId(null);
            setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: String(stages[0]?.id || ''), owner_user_id: '' });
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

      {/* Vistas condicionales */}
      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === 'kanban' && (
          <KanbanBoard
            columns={columns}
            itemsByStage={itemsByStage}
            onDrop={handleDrop}
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

        {viewMode === 'calendar' && renderCalendarView()}
      </div>

      {/* Won Modal Integration */}
      {showWonModal && (
        <WonOpportunityModal
          isOpen={showWonModal}
          onClose={() => setShowWonModal(false)}
          onSubmit={handleWonSubmit}
          defaultName={wonOppName}
          opportunityId={wonOppId}
          wonReasons={pipelines.find(p => p.id === selectedPipelineId)?.ui_config?.won_reasons || []}
        />
      )}

      {/* Lost Modal Integration */}
      {showLostModal && (
        <LostOpportunityModal
          isOpen={showLostModal}
          onClose={() => setShowLostModal(false)}
          onSubmit={handleLostSubmit}
          opportunityName={lostOppName}
          lostReasons={pipelines.find(p => p.id === selectedPipelineId)?.ui_config?.lost_reasons || []}
        />
      )}

      {/* Modal único - Crear / Editar Negociación */}
      <Modal 
        open={showOppModal} 
        onClose={() => { 
          setShowOppModal(false); 
          setEditingOppId(null); 
          setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '', owner_user_id: '' }); 
          setOppFormLineItems([]); 
          setOppQuoteId(null); 
          setCustomFields({});
          setModalTab('general');
        }} 
        title={editingOppId ? (isReadOnly ? 'Ver Negociación' : 'Editar Negociación') : 'Nueva Negociación'} 
        className="max-w-5xl"
      >
        <div className="flex gap-1 p-1 rounded-lg mb-4 mt-2" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
          <button onClick={() => setModalTab('general')} className="bg-transparent border-none px-4 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors" style={{ background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)' }}>
            General
          </button>
          {fieldDefs.length > 0 && (
            <button onClick={() => setModalTab('custom-fields')} className="bg-transparent border-none px-4 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors" style={{ background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)' }}>
              Campos Personalizados
            </button>
          )}
        </div>

        {modalTab === 'general' ? (
          <form onSubmit={handleOppSubmit} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-2">
            {/* Banner de estado Ganada/Perdida */}
            {isReadOnly && editingOpp && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg border mb-2"
                style={{
                  background: editingOpp.status === 'won'
                    ? 'color-mix(in srgb, var(--sys-success) 10%, transparent)'
                    : 'color-mix(in srgb, var(--sys-error) 10%, transparent)',
                  borderColor: editingOpp.status === 'won'
                    ? 'color-mix(in srgb, var(--sys-success) 20%, transparent)'
                    : 'color-mix(in srgb, var(--sys-error) 20%, transparent)',
                }}
              >
                {editingOpp.status === 'won' ? (
                  <Trophy size={18} style={{ color: 'var(--sys-success)' }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: 'var(--sys-error)' }} />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>
                    {editingOpp.status === 'won' ? 'Negociación Ganada' : 'Negociación Perdida'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                    {editingOpp.status === 'won' ? 'Motivo de éxito: ' : 'Motivo de pérdida: '}
                    <span className="font-semibold" style={{ color: 'var(--sys-text)' }}>
                      {editingOpp.close_reason || 'No especificado'}
                    </span>
                  </p>
                </div>
              </div>
            )}

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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  FECHA CIERRE PROYECTADA
                </label>
                <DatePicker
                  value={oppFormData.close_date}
                  onChange={(val) => setOppFormData((prev) => ({ ...prev, close_date: val }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  CUENTA B2B
                </label>
                <Select
                  options={accountSelectOptions}
                  value={oppFormData.account_id}
                  onChange={(val) => setOppFormData((prev) => ({ ...prev, account_id: String(val) }))}
                  placeholder="Selecciona una cuenta corporativa"
                  searchable={true}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  CONTACTO
                </label>
                <Select
                  options={contactSelectOptions}
                  value={oppFormData.contact_id}
                  onChange={(val) => setOppFormData((prev) => ({ ...prev, contact_id: String(val) }))}
                  placeholder="Selecciona un contacto corporativo"
                  searchable={true}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  ETAPA
                </label>
                <Select
                  options={stageSelectOptions}
                  value={oppFormData.pipeline_stage_id}
                  onChange={(val) => setOppFormData((prev) => ({ ...prev, pipeline_stage_id: String(val) }))}
                  placeholder="Selecciona una etapa"
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                  ASESOR COMERCIAL (DUEÑO)
                </label>
                <Select
                  options={userSelectOptions}
                  value={oppFormData.owner_user_id}
                  onChange={(val) => setOppFormData((prev) => ({ ...prev, owner_user_id: String(val) }))}
                  placeholder="Selecciona un asesor"
                  searchable={true}
                  disabled={isReadOnly}
                />
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
                <QuoteLineItemsEditor items={oppFormLineItems} onChange={setOppFormLineItems} readOnly={isReadOnly} />
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
                  className="bg-transparent gap-1.5 text-xs font-semibold py-1.5 px-3 flex items-center rounded-lg cursor-pointer transition-colors"
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
              <Button variant="secondary" type="button" onClick={() => { setShowOppModal(false); setEditingOppId(null); setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '', owner_user_id: '' }); setOppFormLineItems([]); setOppQuoteId(null); setCustomFields({}); setModalTab('general'); }}>
                {isReadOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!isReadOnly && (
                <Button variant="primary" type="submit" className="btn-primary">
                  {editingOppId ? 'Guardar Cambios' : 'Crear Negociación'}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
            <CustomFieldsForm
              definitions={fieldDefs}
              values={customFields}
              onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
              disabled={isReadOnly}
            />
            <div
              className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
              style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
            >
              <Button variant="secondary" type="button" onClick={() => { setShowOppModal(false); setEditingOppId(null); setOppFormData({ name: '', value: '0', close_date: '', account_id: '', contact_id: '', pipeline_stage_id: '', owner_user_id: '' }); setOppFormLineItems([]); setOppQuoteId(null); setCustomFields({}); setModalTab('general'); }}>
                {isReadOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!isReadOnly && (
                <Button variant="primary" onClick={() => handleOppSubmit()} className="btn-primary">
                  {editingOppId ? 'Guardar Cambios' : 'Crear Negociación'}
                </Button>
              )}
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
