import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { crmApi, type CustomFieldDef } from '../api/client';
import type { Opportunity, Pipeline, PipelineStage, B2BAccount, B2BContact, TenantUser } from '@kodan-apps/shared';

// ── Local types (extends shared) ──────────────────────────────────────
export interface NegotiationOpportunity extends Opportunity {
  is_archived?: boolean;
  owner_name?: string;
  owner_avatar?: string | null;
  line_items_count?: number;
  quote_total?: number;
  chat_unread_count?: number;
  contact_name?: string;
}

export interface Stage extends PipelineStage {
  color_hex: string;
  is_won_stage: number;
  is_lost_stage: number;
}

interface LocalPipeline extends Pipeline {
  is_default: number;
  ui_config?: {
    won_reasons?: string[];
    lost_reasons?: string[];
  } | null;
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useNegotiationsData() {
  const [pipelines, setPipelines] = useState<LocalPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<NegotiationOpportunity[]>([]);
  const [accounts, setAccounts] = useState<B2BAccount[]>([]);
  const [contacts, setContacts] = useState<B2BContact[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);

  // ── Data loaders ──────────────────────────────────────────────────
  const loadPipelines = useCallback(async () => {
    try {
      const data = await crmApi.listPipelines();
      setPipelines(data as LocalPipeline[]);
      if (data.length > 0) {
        const def = data.find(p => (p as LocalPipeline).is_default === 1) || data[0];
        setSelectedPipelineId(def.id);
      }
    } catch {
      toast.error('Error al cargar los canales.');
    }
  }, []);

  const loadAccountsAndContacts = useCallback(async () => {
    try {
      const [accs, conts, userList] = await Promise.all([
        crmApi.listAccounts(),
        crmApi.listContacts(),
        crmApi.listTenantUsers(),
      ]);
      setAccounts(accs);
      setContacts(conts);
      setUsers(userList);
    } catch {
      console.error('[Negotiations] Error al cargar entidades secundarias.');
    }
  }, []);

  const loadPipelineData = useCallback(async (pipelineId: number, includeArchived = false) => {
    try {
      const stagesList = await crmApi.listStages(pipelineId);
      const sortedStages = [...stagesList].sort((a, b) => a.sort_order - b.sort_order);
      setStages(sortedStages as Stage[]);

      const params: Record<string, string> = { pipeline_id: String(pipelineId) };
      if (includeArchived) params.include_archived = '1';
      const oppsList = await crmApi.listOpportunities(params);
      setOpportunities(oppsList as NegotiationOpportunity[]);
    } catch {
      toast.error('Error al cargar datos del canal.');
    }
  }, []);

  const loadOppCustomFields = useCallback(async () => {
    try {
      setFieldDefs(await crmApi.listCustomFields('opportunity'));
    } catch {
      console.warn('[Negotiations] No se pudieron cargar los campos personalizados.');
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadPipelines();
    loadAccountsAndContacts();
    loadOppCustomFields();
  }, [loadPipelines, loadAccountsAndContacts, loadOppCustomFields]);

  // Reload when pipeline or archive filter changes
  useEffect(() => {
    if (selectedPipelineId) {
      loadPipelineData(selectedPipelineId, showArchived);
    }
  }, [selectedPipelineId, showArchived, loadPipelineData]);

  // ── Computed select options ───────────────────────────────────────
  const pipelineSelectOptions = useMemo(() => {
    return pipelines.map(p => ({ value: p.id, label: p.name }));
  }, [pipelines]);

  const accountSelectOptions = useMemo(() => {
    return accounts.map(a => ({ value: a.account_id, label: a.name }));
  }, [accounts]);

  const contactSelectOptions = useMemo(() => {
    return contacts.map(c => ({
      value: c.contact_id,
      label: `${c.first_name} ${c.last_name}`,
    }));
  }, [contacts]);

  const stageSelectOptions = useMemo(() => {
    return stages.map(s => ({ value: s.id, label: s.name }));
  }, [stages]);

  const userSelectOptions = useMemo(() => {
    const list = users.map((u) => ({
      value: String(u.id),
      label: u.name || u.email,
    }));
    return [
      { value: '', label: 'Sin Asignar / Ninguno' },
      ...list,
    ];
  }, [users]);

  // ── Kanban computed ──────────────────────────────────────────────
  const columns = useMemo(
    () =>
      stages.map((s) => ({
        id: String(s.id),
        label: s.name,
        dotColor: s.color_hex,
      })),
    [stages],
  );

  const itemsByStage = useMemo(() => {
    const groups: Record<string, NegotiationOpportunity[]> = {};
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

  // ── Business logic ───────────────────────────────────────────────
  const updateOppStage = useCallback(
    async (oppId: number, stageId: number, status: 'open' | 'won' | 'lost', extraData: Record<string, unknown> = {}) => {
      const previousOpps = [...opportunities];
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, pipeline_stage_id: stageId, status, ...extraData } : o)),
      );

      try {
        await crmApi.updateOpportunity(oppId, {
          pipeline_stage_id: stageId,
          status,
          ...extraData,
        } as Partial<Opportunity>);
        toast.success('Estado actualizado correctamente.');
      } catch (err: unknown) {
        setOpportunities(previousOpps);
        toast.error(err instanceof Error ? err.message : 'Error al actualizar etapa.');
      }
    },
    [opportunities],
  );

  const handleDrop = useCallback(
    (_itemId: string | number, _toStage: string) => {
      const oppId = Number(_itemId);
      const targetStageId = Number(_toStage);
      const opp = opportunities.find((o) => o.id === oppId);
      if (!opp) return;

      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) return;

      // If it's a Won stage, trigger the Won modal
      if (targetStage.is_won_stage === 1) {
        return { action: 'won' as const, oppId, oppName: opp.name, targetStageId };
      }

      // If it's a Lost stage, trigger the Lost modal
      if (targetStage.is_lost_stage === 1) {
        return { action: 'lost' as const, oppId, oppName: opp.name, targetStageId };
      }

      // Don't update if same stage
      if (opp.pipeline_stage_id === targetStageId) return;

      updateOppStage(oppId, targetStageId, 'open');
      setJustDroppedId(oppId);
      setTimeout(() => setJustDroppedId(null), 550);

      return undefined;
    },
    [opportunities, stages, updateOppStage],
  );

  const handleConfirmDeleteOpp = useCallback(
    async (oppToDelete: NegotiationOpportunity | null) => {
      if (!oppToDelete) return;
      try {
        await crmApi.deleteOpportunity(oppToDelete.id);
        toast.success('Negociación eliminada');
        if (selectedPipelineId) loadPipelineData(selectedPipelineId, showArchived);
      } catch {
        toast.error('Error al eliminar');
      }
    },
    [selectedPipelineId, showArchived, loadPipelineData],
  );

  const handleArchiveToggle = useCallback(
    async (editingOppId: number) => {
      try {
        const opp = opportunities.find(o => o.id === editingOppId);
        if (!opp) return;
        if (opp.is_archived) {
          await crmApi.unarchiveOpportunity(editingOppId);
          toast.success('Negociación restaurada del archivo');
        } else {
          await crmApi.archiveOpportunity(editingOppId);
          toast.success('Negociación archivada');
        }
        if (selectedPipelineId) loadPipelineData(selectedPipelineId, showArchived);
        return true;
      } catch {
        toast.error('Error al archivar/restaurar');
        return false;
      }
    },
    [opportunities, selectedPipelineId, showArchived, loadPipelineData],
  );

  const notifyRefresh = useCallback(() => {
    if (selectedPipelineId) loadPipelineData(selectedPipelineId, showArchived);
  }, [selectedPipelineId, showArchived, loadPipelineData]);

  return {
    // Data
    pipelines,
    selectedPipelineId,
    stages,
    opportunities,
    accounts,
    contacts,
    users,
    fieldDefs,
    showArchived,
    justDroppedId,

    // Setters
    setSelectedPipelineId,
    setShowArchived,
    setJustDroppedId,
    setOpportunities,

    // Actions
    loadPipelineData,
    updateOppStage,
    handleDrop,
    handleConfirmDeleteOpp,
    handleArchiveToggle,
    notifyRefresh,

    // Computed
    columns,
    itemsByStage,
    pipelineSelectOptions,
    accountSelectOptions,
    contactSelectOptions,
    stageSelectOptions,
    userSelectOptions,
  };
}
