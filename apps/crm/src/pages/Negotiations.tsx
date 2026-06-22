import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Input, Modal, CustomFieldsForm, EntityCard, ConfirmDialog } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { WonOpportunityModal } from '../components/modals/WonOpportunityModal';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import type { ColumnDef } from '../components/kanban/KanbanBoard';
import { QuoteStatusBadge } from '../components/quotes/QuoteStatusBadge';
import { QuoteLineItemsEditor } from '../components/quotes/QuoteLineItemsEditor';
import type { QuoteLineItem, QuoteStatus } from '../types/admin';
import { 
  Plus,
  Send,
  Trash2,
  ListTodo,
  MessageSquare,
  Settings2,
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
  onOpenDetail: (opp: Opportunity) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (opp: Opportunity) => void;
  onChat: (opp: Opportunity) => void;
}

function OppCard({ opp, isDropped, onOpenDetail, onEdit, onDelete, onChat }: CardProps) {
  return (
    <EntityCard
      title={opp.name}
      amount={parseFloat(opp.value) || 0}
      accountName={opp.account_name}
      startDate={opp.created_at}
      closeDate={opp.close_date}
      lineItemsCount={opp.line_items_count ?? 0}
      ownerName={opp.owner_name}
      ownerAvatar={opp.owner_avatar}
      isDropped={isDropped}
      onClick={() => onOpenDetail(opp)}
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
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonOppId, setWonOppId] = useState<number | null>(null);
  const [wonOppName, setWonOppName] = useState('');
  const [targetWonStageId, setTargetWonStageId] = useState<number | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);

  // Forms
  const [oppForm, setOppForm] = useState({
    name: '',
    value: '0',
    close_date: '',
    account_id: '',
    contact_id: '',
    pipeline_stage_id: '',
  });

  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Custom Fields inside Drawer
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Tasks, Chats and Items inside Drawer
  const [chats, setChats] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('0');
  const [showArchived, setShowArchived] = useState(false);
  const [showEditOppModal, setShowEditOppModal] = useState(false);
  const [editingOppId, setEditingOppId] = useState<number | null>(null);
  const [editOppForm, setEditOppForm] = useState({
    name: '',
    value: '0',
    close_date: '',
    account_id: '',
    contact_id: '',
    pipeline_stage_id: '',
  });
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatOpp, setChatOpp] = useState<Opportunity | null>(null);

  // Quote state
  const [oppQuotes, setOppQuotes] = useState<any[]>([]);

  // Quote state inside edit modal
  const [editOppLineItems, setEditOppLineItems] = useState<QuoteLineItem[]>([]);
  const [editOppQuoteId, setEditOppQuoteId] = useState<number | null>(null);

  useEffect(() => {
    loadPipelines();
    loadAccountsAndContacts();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      loadPipelineData(selectedPipelineId, showArchived);
    }
  }, [selectedPipelineId, showArchived]);

  // Auto-open negotiation if autoOpenOppId is provided from notification click
  useEffect(() => {
    if (autoOpenOppId && opportunities.length > 0) {
      const opp = opportunities.find((o) => o.id === autoOpenOppId);
      if (opp) {
        openDetailDrawer(opp);
        onClearAutoOpen?.();
      }
    }
  }, [autoOpenOppId, opportunities, onClearAutoOpen]);

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

  const loadProducts = async () => {
    try {
      const prodList = await crmApi.listProducts();
      setProducts(prodList);
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

  const handleAddOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: oppForm.name,
        value: parseFloat(oppForm.value) || 0,
        close_date: oppForm.close_date || null,
        account_id: oppForm.account_id ? parseInt(oppForm.account_id, 10) : null,
        contact_id: oppForm.contact_id ? parseInt(oppForm.contact_id, 10) : null,
        pipeline_stage_id: oppForm.pipeline_stage_id
          ? parseInt(oppForm.pipeline_stage_id, 10)
          : stages[0]?.id,
      };
      const created: any = await crmApi.createOpportunity(payload);
      toast.success('Oportunidad creada con éxito.');
      setShowAddOppModal(false);
      setOppForm({
        name: '',
        value: '0',
        close_date: '',
        account_id: '',
        contact_id: '',
        pipeline_stage_id: '',
      });
      if (selectedPipelineId) loadPipelineData(selectedPipelineId);

      // Segundo paso: abrir modal de editar con cotización
      if (created && created.id) {
        const newOpp: Opportunity = { ...created, line_items_count: 0 };
        handleEditOpp(newOpp);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear la oportunidad.');
    }
  };

  const openDetailDrawer = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    setShowDetailModal(true);
    setCustomFields(opp.custom_fields || {});
    loadOpportunityDetails(opp.id);
    loadOppCustomFields();
    loadOppQuotes(opp.id);
  };

  const loadOppQuotes = async (oppId: number) => {
    try {
      const data = await crmApi.listQuotes({ opportunity_id: oppId });
      setOppQuotes(data);
    } catch {
      setOppQuotes([]);
    }
  };

  const handleSaveCustomFields = async () => {
    if (!selectedOpp) return
    try {
      await crmApi.updateOpportunity(selectedOpp.id, { custom_fields: customFields })
      toast.success('Campos personalizados guardados')
      if (selectedPipelineId) loadPipelineData(selectedPipelineId)
    } catch {
      toast.error('Error al guardar campos personalizados')
    }
  }

  const loadOpportunityDetails = async (oppId: number) => {
    try {
      const [chatList, taskList, itemList] = await Promise.all([
        crmApi.listChatsByOpportunity(oppId),
        crmApi.listTasks(),
        crmApi.getOpportunityLineItems(oppId),
      ]);
      setChats(chatList);
      setTasks(taskList.filter((t: any) => t.opportunity_id === oppId));
      setLineItems(itemList);
    } catch {
      toast.error('Error al cargar detalles de la negociación.');
    }
  };

  const loadOppCustomFields = async () => {
    try {
      setFieldDefs(await crmApi.listCustomFields('opportunity'));
    } catch { /* ignore */ }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOpp = selectedOpp || chatOpp;
    if (!newMessage.trim() || !targetOpp) return;
    try {
      await crmApi.sendMessage(targetOpp.id, { content: newMessage });
      setNewMessage('');
      loadOpportunityDetails(targetOpp.id);
    } catch {
      toast.error('Error al enviar mensaje.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedOpp) return;
    try {
      await crmApi.createTask({
        opportunity_id: selectedOpp.id,
        title: newTaskTitle,
        due_date: newTaskDueDate || null,
        status: 'pending',
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      loadOpportunityDetails(selectedOpp.id);
      toast.success('Tarea comercial agregada.');
    } catch {
      toast.error('Error al crear la tarea.');
    }
  };

  const handleToggleTask = async (task: any) => {
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await crmApi.updateTask(task.id, { status: nextStatus });
      if (selectedOpp) loadOpportunityDetails(selectedOpp.id);
    } catch {
      toast.error('Error al actualizar tarea.');
    }
  };

  const handleAddLineItem = async () => {
    if (!selectedProductId || !selectedOpp) return;
    const prod = products.find((p) => p.id === parseInt(selectedProductId, 10));
    if (!prod) return;

    const qty = parseInt(lineQty, 10);
    const price = parseFloat(linePrice) || parseFloat(prod.price) || 0;

    const newItem = {
      product_id: prod.id,
      quantity: qty,
      unit_price: price,
    };

    const updated = [...lineItems, newItem];
    try {
      await crmApi.saveOpportunityLineItems(selectedOpp.id, updated);
      toast.success('Producto agregado a la oportunidad.');
      loadOpportunityDetails(selectedOpp.id);

      const newTotal = updated.reduce((acc, curr) => acc + curr.quantity * curr.unit_price, 0);
      await crmApi.updateOpportunity(selectedOpp.id, { value: newTotal });

      if (selectedPipelineId) loadPipelineData(selectedPipelineId);
    } catch {
      toast.error('Error al guardar producto.');
    }
  };

  const handleRemoveLineItem = async (index: number) => {
    if (!selectedOpp) return;
    const updated = lineItems.filter((_, i) => i !== index);
    try {
      await crmApi.saveOpportunityLineItems(selectedOpp.id, updated);
      toast.success('Producto removido.');
      loadOpportunityDetails(selectedOpp.id);

      const newTotal = updated.reduce((acc, curr) => acc + curr.quantity * curr.unit_price, 0);
      await crmApi.updateOpportunity(selectedOpp.id, { value: newTotal });

      if (selectedPipelineId) loadPipelineData(selectedPipelineId);
    } catch {
      toast.error('Error al remover producto.');
    }
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
    setEditOppForm({
      name: opp.name,
      value: String(parseFloat(opp.value) || 0),
      close_date: opp.close_date || '',
      account_id: String(opp.account_id ?? ''),
      contact_id: String(opp.contact_id ?? ''),
      pipeline_stage_id: String(opp.pipeline_stage_id),
    });
    setEditingOppId(opp.id);
    setShowEditOppModal(true);

    // Cargar cotización existente (si tiene)
    try {
      const quotes = await crmApi.listQuotes({ opportunity_id: opp.id });
      if (quotes.length > 0) {
        const q = quotes[0];
        // Cargar line items si el quote tiene ID
        if (q.id) {
          const items = await crmApi.getQuoteLineItems(q.id);
          setEditOppLineItems(items.map((it: any) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percentage: Number(it.discount_percentage) || 0,
            tax_percentage: Number(it.tax_percentage) || 21,
            product_name: it.product_name,
            product_sku: it.product_sku,
          })));
        } else {
          setEditOppLineItems([]);
        }
        setEditOppQuoteId(q.id);
      } else {
        setEditOppLineItems([]);
        setEditOppQuoteId(null);
      }
    } catch {
      setEditOppLineItems([]);
      setEditOppQuoteId(null);
    }
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOppId) return;
    try {
      await crmApi.updateOpportunity(editingOppId, {
        name: editOppForm.name,
        value: parseFloat(editOppForm.value) || 0,
        close_date: editOppForm.close_date || null,
        account_id: editOppForm.account_id ? parseInt(editOppForm.account_id, 10) : null,
        contact_id: editOppForm.contact_id ? parseInt(editOppForm.contact_id, 10) : null,
        pipeline_stage_id: editOppForm.pipeline_stage_id
          ? parseInt(editOppForm.pipeline_stage_id, 10)
          : stages[0]?.id,
      });

      // Guardar cotización si hay ítems
      if (editOppLineItems.length > 0) {
        const quotePayload = {
          quote_number: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          opportunity_id: editingOppId,
          status: 'draft' as QuoteStatus,
          items: editOppLineItems.map((it) => ({
            product_id: it.product_id,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            discount_percentage: Number(it.discount_percentage),
            tax_percentage: Number(it.tax_percentage),
          })),
        };

        if (editOppQuoteId) {
          await crmApi.updateQuote(editOppQuoteId, quotePayload);
        } else {
          await crmApi.createQuote(quotePayload);
        }
      } else if (editOppQuoteId) {
        // Si no hay ítems pero existía una cotización, la eliminamos
        await crmApi.deleteQuote(editOppQuoteId);
      }

      toast.success('Negociación y cotización guardadas con éxito.');
      setShowEditOppModal(false);
      setEditingOppId(null);
      setEditOppForm({
        name: '',
        value: '0',
        close_date: '',
        account_id: '',
        contact_id: '',
        pipeline_stage_id: '',
      });
      setEditOppLineItems([]);
      setEditOppQuoteId(null);
      if (selectedPipelineId) loadPipelineData(selectedPipelineId);
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar la negociación.');
    }
  };

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
    } else {
      setChatOpp(opp);
      setShowChatModal(true);
      loadOpportunityDetails(opp.id);
    }
  }, [onOpenChat]);

  const renderCard = useCallback(
    (opp: Opportunity) => (
      <OppCard
        opp={opp}
        isDropped={justDroppedId === opp.id}
        onOpenDetail={openDetailDrawer}
        onEdit={handleEditOpp}
        onDelete={handleDeleteOpp}
        onChat={handleChatOpp}
      />
    ),
    [justDroppedId, openDetailDrawer, handleEditOpp, handleDeleteOpp, handleChatOpp]
  );

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
            setOppForm((prev) => ({ ...prev, pipeline_stage_id: String(stages[0]?.id || '') }));
            setShowAddOppModal(true);
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

      {/* Modal - Nueva Oportunidad */}
      <Modal open={showAddOppModal} onClose={() => setShowAddOppModal(false)} title="Nueva Negociación">
        <form onSubmit={handleAddOppSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              NOMBRE DE LA NEGOCIACIÓN
            </label>
            <Input
              value={oppForm.name}
              onChange={(e) => setOppForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Licencias Enterprise KODAN"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                VALOR ESTIMADO (ARS)
              </label>
              <Input
                type="number"
                value={oppForm.value}
                onChange={(e) => setOppForm((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                FECHA CIERRE PROYECTADA
              </label>
              <Input
                type="date"
                value={oppForm.close_date}
                onChange={(e) => setOppForm((prev) => ({ ...prev, close_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              CUENTA B2B
            </label>
            <select
              className="input select"
              value={oppForm.account_id}
              onChange={(e) => setOppForm((prev) => ({ ...prev, account_id: e.target.value }))}
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
              value={oppForm.contact_id}
              onChange={(e) => setOppForm((prev) => ({ ...prev, contact_id: e.target.value }))}
            >
              <option value="">Selecciona un contacto corporativo</option>
              {contacts.map((c) => (
                <option key={c.contact_id} value={c.contact_id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              ETAPA INICIAL
            </label>
            <select
              className="input select"
              value={oppForm.pipeline_stage_id}
              onChange={(e) => setOppForm((prev) => ({ ...prev, pipeline_stage_id: e.target.value }))}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex justify-end gap-3 mt-4 pt-3"
            style={{ borderTop: '1px solid var(--sys-border-soft)' }}
          >
            <Button variant="secondary" type="button" onClick={() => setShowAddOppModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="btn-primary">
              Crear Negociación
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Editar Oportunidad (incluye productos + cotización) */}
      <Modal open={showEditOppModal} onClose={() => setShowEditOppModal(false)} title="Editar Negociación" className="modal-wide">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-2 max-h-[80vh] overflow-y-auto pr-2">
          {/* ── Datos básicos ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                NOMBRE DE LA NEGOCIACIÓN
              </label>
              <Input
                value={editOppForm.name}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, name: e.target.value }))}
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
                value={editOppForm.value}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                FECHA CIERRE PROYECTADA
              </label>
              <Input
                type="date"
                value={editOppForm.close_date}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, close_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                CUENTA B2B
              </label>
              <select
                className="input select"
                value={editOppForm.account_id}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, account_id: e.target.value }))}
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
                value={editOppForm.contact_id}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, contact_id: e.target.value }))}
              >
                <option value="">Selecciona un contacto corporativo</option>
                {contacts.map((c) => (
                  <option key={c.contact_id} value={c.contact_id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                ETAPA
              </label>
              <select
                className="input select"
                value={editOppForm.pipeline_stage_id}
                onChange={(e) => setEditOppForm((prev) => ({ ...prev, pipeline_stage_id: e.target.value }))}
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
              <QuoteLineItemsEditor items={editOppLineItems} onChange={setEditOppLineItems} />
            </div>
          </div>

          {/* ── Acciones ── */}
          <div
            className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
            style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
          >
            <Button variant="secondary" type="button" onClick={() => setShowEditOppModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="btn-primary">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Chat de Negociación */}
      {chatOpp && (
        <Modal open={showChatModal} onClose={() => { setShowChatModal(false); setChatOpp(null); }} title={`Mensajes - ${chatOpp.name}`}>
          <div className="flex flex-col gap-4 mt-2">
            <div
              className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto flex flex-col gap-3 p-2 rounded-lg"
              style={{ background: 'var(--sys-surface)' }}
            >
              {chats.map((c, i) => (
                <div key={i} className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold">{c.user_name || 'Miembro Equipo'}</span>
                  <div className="p-2 rounded-lg mt-0.5" style={{ background: 'var(--sys-surface-raised)' }}>
                    {c.content}
                  </div>
                  <span className="text-[9px] self-end mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
                    {c.created_at}
                  </span>
                </div>
              ))}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-10">
                  <MessageSquare size={24} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                  <p className="text-xs italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>
                    Sin comentarios comerciales aún.
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Escribe un comentario comercial..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="text-xs flex-1"
              />
              <button
                type="submit"
                className="p-2 rounded-lg btn-primary flex items-center justify-center text-white"
                style={{ background: 'var(--sys-primary)' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Detail Drawer (como Modal grande) */}
      {selectedOpp && (
        <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedOpp.name}>
          <div className="flex flex-col lg:flex-row gap-6 max-h-[80vh] overflow-y-auto mt-2">
            {/* Panel Izquierdo: Información y Líneas de Catálogo */}
            <div className="flex-1 flex flex-col gap-6">
              <div>
                <h3
                  className="text-sm font-semibold tracking-wider uppercase mb-3"
                  style={{ color: 'var(--sys-text-muted)' }}
                >
                  Detalles de Negociación
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-text-muted)' }}>Valor Actual</span>
                    <p className="font-bold text-sm mt-1">
                      {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                        parseFloat(selectedOpp.value) || 0
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-text-muted)' }}>Fecha de Cierre</span>
                    <p className="font-bold text-sm mt-1">{selectedOpp.close_date || 'No definida'}</p>
                  </div>
                </div>
              </div>

              {/* Catálogo de Productos */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <h3
                  className="text-sm font-semibold tracking-wider uppercase mb-3"
                  style={{ color: 'var(--sys-text-muted)' }}
                >
                  Catálogo de Productos Vinculados
                </h3>

                <div className="flex gap-2 mb-4">
                  <select
                    className="input select text-xs flex-1"
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const p = products.find((x) => x.id === parseInt(e.target.value, 10));
                      if (p) setLinePrice(p.price);
                    }}
                  >
                    <option value="">Vincular producto comercial...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - (
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                          parseFloat(p.price) || 0
                        )}
                        )
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    style={{ width: '70px' }}
                    className="text-xs"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    min="1"
                  />
                  <Button variant="primary" className="btn-primary text-xs" onClick={handleAddLineItem}>
                    Vincular
                  </Button>
                </div>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg text-xs"
                      style={{ background: 'var(--sys-surface)' }}
                    >
                      <div>
                        <p className="font-semibold">{item.product_name || `Producto #${item.product_id}`}</p>
                        <p style={{ color: 'var(--sys-text-muted)' }}>
                          {item.quantity} x{' '}
                          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                            parseFloat(item.unit_price) || 0
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {lineItems.length === 0 && (
                    <p className="text-xs text-center italic py-2" style={{ color: 'var(--sys-text-muted)' }}>
                      No hay productos comerciales asociados.
                    </p>
                  )}
                </div>
              </div>

              {/* Cotización integrada (solo vista, edición en modal de editar) */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} style={{ color: 'var(--sys-primary)' }} />
                  <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>
                    Cotización
                  </h3>
                </div>

                {oppQuotes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 rounded-lg" style={{ background: 'var(--sys-surface)' }}>
                    <FileText size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                    <p className="text-xs italic" style={{ color: 'var(--sys-text-muted)' }}>
                      Esta negociación aún no tiene cotización
                    </p>
                    <Button variant="primary" className="btn-primary text-xs gap-1" onClick={() => selectedOpp && handleEditOpp(selectedOpp)}>
                      <Plus size={14} />
                      Crear Cotización
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {oppQuotes.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-3 rounded-lg text-xs"
                        style={{ background: 'var(--sys-surface)' }}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{q.quote_number}</span>
                            <QuoteStatusBadge status={q.status} size="sm" />
                          </div>
                          <span style={{ color: 'var(--sys-text-muted)' }}>
                            Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                              parseFloat(q.total_amount) || 0
                            )}
                          </span>
                        </div>
                        <Button variant="ghost" className="text-xs" onClick={() => selectedOpp && handleEditOpp(selectedOpp)}>
                          Editar Cotización
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campos Personalizados */}
              {fieldDefs.length > 0 && (
                <div className="border-t pt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 size={16} style={{ color: 'var(--sys-primary)' }} />
                    <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>
                      Campos Personalizados
                    </h3>
                  </div>
                  <CustomFieldsForm
                    definitions={fieldDefs}
                    values={customFields}
                    onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
                  />
                  <div className="flex justify-end mt-3">
                    <Button variant="primary" className="btn-primary btn-sm" onClick={handleSaveCustomFields}>
                      Guardar Campos
                    </Button>
                  </div>
                </div>
              )}

              {/* Archivar / Restaurar */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <button
                  onClick={async () => {
                    try {
                      if (selectedOpp.is_archived) {
                        await crmApi.unarchiveOpportunity(selectedOpp.id)
                        toast.success('Negociación restaurada del archivo')
                      } else {
                        await crmApi.archiveOpportunity(selectedOpp.id)
                        toast.success('Negociación archivada')
                      }
                      setShowDetailModal(false)
                      if (selectedPipelineId) loadPipelineData(selectedPipelineId, showArchived)
                    } catch { toast.error('Error al archivar/restaurar') }
                  }}
                  className="btn"
                  style={{
                    color: selectedOpp.is_archived ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
                    border: '1px solid var(--sys-border-soft)',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {selectedOpp.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  {selectedOpp.is_archived ? 'Restaurar del Archivo' : 'Archivar Negociación'}
                </button>
              </div>

              {/* Tareas Comerciales */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <ListTodo size={16} style={{ color: 'var(--sys-primary)' }} />
                  <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>
                    Agenda Comercial Relacionada
                  </h3>
                </div>

                <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Planificar llamada, reunión..."
                    className="text-xs flex-1"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <Input
                    type="date"
                    className="text-xs"
                    style={{ width: '130px' }}
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                  <Button variant="primary" className="btn-primary text-xs" type="submit">
                    Agregar
                  </Button>
                </form>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg text-xs"
                      style={{ background: 'var(--sys-surface)' }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={t.status === 'completed'}
                          onChange={() => handleToggleTask(t)}
                          className="rounded"
                        />
                        <span className={t.status === 'completed' ? 'line-through text-slate-400' : 'font-medium'}>
                          {t.title}
                        </span>
                      </div>
                      {t.due_date && (
                        <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>
                          {t.due_date}
                        </span>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-xs text-center italic py-2" style={{ color: 'var(--sys-text-muted)' }}>
                      No hay tareas pendientes en la agenda.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Derecho: Chat Colaborativo */}
            <div
              className="w-full lg:w-80 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-6"
              style={{ borderColor: 'var(--sys-border-soft)' }}
            >
              <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>
                Muro de Colaboración
              </h3>

              <div
                className="flex-1 min-h-[200px] max-h-80 overflow-y-auto flex flex-col gap-3 p-2 rounded-lg"
                style={{ background: 'var(--sys-surface)' }}
              >
                {chats.map((c, i) => (
                  <div key={i} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold">{c.user_name || 'Miembro Equipo'}</span>
                    <div className="p-2 rounded-lg mt-0.5" style={{ background: 'var(--sys-surface-raised)' }}>
                      {c.content}
                    </div>
                    <span className="text-[9px] self-end mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
                      {c.created_at}
                    </span>
                  </div>
                ))}
                {chats.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 py-10">
                    <MessageSquare size={24} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                    <p className="text-xs italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>
                      Sin comentarios comerciales aún.
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Escribe un comentario comercial..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="text-xs flex-1"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg btn-primary flex items-center justify-center text-white"
                  style={{ background: 'var(--sys-primary)' }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

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
