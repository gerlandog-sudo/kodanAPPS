import { useEffect, useState, useMemo } from 'react'
import { Button, Modal, ConfirmDialog, Table } from '@kodan-apps/ui-core'
import type { TableColumn } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { toast } from 'sonner'
import { Plus, Trash2, History, Power, PowerOff, Workflow, Settings } from 'lucide-react'
import type { WorkflowRule, WorkflowExecution } from '../../types/admin'
import { WorkflowRuleEditor } from './WorkflowRuleEditor'

const TRIGGER_EVENT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  opportunity: [
    { value: 'stage_changed', label: 'Cambio de etapa' },
    { value: 'created', label: 'Creación' },
    { value: 'won', label: 'Ganada (Won)' },
    { value: 'lost', label: 'Perdida (Lost)' },
    { value: 'assigned', label: 'Cambio de asignado' },
    { value: 'archived', label: 'Archivada' },
    { value: 'unarchived', label: 'Restaurada' },
    { value: 'value_changed', label: 'Cambio de valor' },
    { value: 'close_date_changed', label: 'Cambio de fecha cierre' },
  ],
  task: [
    { value: 'task_created', label: 'Creación de tarea' },
    { value: 'task_status_changed', label: 'Cambio de estado' },
    { value: 'task_completed', label: 'Tarea completada' },
    { value: 'task_assigned', label: 'Cambio de asignado' },
    { value: 'task_due_date_changed', label: 'Cambio de fecha límite' },
    { value: 'task_archived', label: 'Tarea archivada' },
    { value: 'task_unarchived', label: 'Tarea restaurada' },
  ],
}

export function WorkflowManager() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleIdToDelete, setRuleIdToDelete] = useState<number | null>(null)

  const [showExecutions, setShowExecutions] = useState<WorkflowRule | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [executionsLoading, setExecutionsLoading] = useState(false)

  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await crmApi.listWorkflowRules()
      setRules(data)
    } catch {
      toast.error('Error al cargar reglas de workflow')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRules() }, [])

  const handleOpenCreate = () => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  const handleOpenEdit = (rule: WorkflowRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  const handleEditorSaved = () => {
    loadRules()
  }

  const handleDeleteClick = (id: number) => {
    setRuleIdToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (ruleIdToDelete === null) return
    try {
      await crmApi.deleteWorkflowRule(ruleIdToDelete)
      toast.success('Regla eliminada')
      loadRules()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleteConfirmOpen(false)
      setRuleIdToDelete(null)
    }
  }

  const handleToggleActive = async (rule: WorkflowRule) => {
    try {
      await crmApi.updateWorkflowRule(rule.id, { is_active: rule.is_active ? 0 : 1 })
      toast.success(rule.is_active ? 'Regla desactivada' : 'Regla activada')
      loadRules()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const handleOpenExecutions = async (rule: WorkflowRule) => {
    setShowExecutions(rule)
    setExecutionsLoading(true)
    try {
      const data = await crmApi.getWorkflowExecutions(rule.id)
      setExecutions(data)
    } catch {
      toast.error('Error al cargar historial')
    } finally {
      setExecutionsLoading(false)
    }
  }

  const getTriggerLabel = (rule: WorkflowRule) => {
    const entityLabel = rule.trigger_entity === 'opportunity' ? 'Oportunidad' : 'Tarea'
    const events = TRIGGER_EVENT_OPTIONS[rule.trigger_entity] || []
    const eventLabel = events.find(e => e.value === rule.trigger_event)?.label || rule.trigger_event
    return `${entityLabel} → ${eventLabel}`
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { success: '#10B981', partial: '#F59E0B', failed: '#EF4444' }
    return (
      <span style={{
        display: 'inline-block', padding: '0.125rem 0.375rem', borderRadius: '999px',
        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
        color: colors[status] || '#6B7280',
        background: `color-mix(in srgb, ${colors[status] || '#6B7280'} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${colors[status] || '#6B7280'} 20%, transparent)`,
      }}>{status}</span>
    )
  }

  const columns: TableColumn<WorkflowRule>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Regla',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--sys-text)' }}>{r.name}</span>
          {r.description && <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)' }}>{r.description}</span>}
        </div>
      ),
    },
    {
      key: 'trigger',
      header: 'Disparador',
      render: (r) => (
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sys-text)' }}>
          {getTriggerLabel(r)}
        </span>
      ),
    },
    {
      key: 'actions_count',
      header: 'Acciones',
      render: (r) => (
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>
          {r.actions?.length || 0} acción(es)
        </span>
      ),
    },
    {
      key: 'execution_order',
      header: 'Orden',
      render: (r) => <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)' }}>{r.execution_order}</span>,
    },
    {
      key: 'is_active',
      header: 'Activo',
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
            border: '1px solid var(--sys-border-soft)',
            background: r.is_active
              ? 'color-mix(in srgb, var(--sys-success) 10%, transparent)'
              : 'transparent',
            color: r.is_active ? 'var(--sys-success)' : 'var(--sys-text-muted)',
            cursor: 'pointer', fontSize: '10px', fontWeight: 700,
          }}
        >
          {r.is_active ? <Power size={12} /> : <PowerOff size={12} />}
          {r.is_active ? 'Activo' : 'Inactivo'}
        </button>
      ),
    },
  ], [rules])

  const actions = useMemo(() => [
    {
      icon: <History size={14} />,
      label: 'Historial',
      onClick: (r: WorkflowRule) => handleOpenExecutions(r),
    },
    {
      icon: <Trash2 size={14} />,
      label: 'Eliminar',
      onClick: (r: WorkflowRule) => handleDeleteClick(r.id),
    },
  ], [])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          <Workflow size={14} style={{ display: 'inline', marginRight: '0.375rem' }} />
          REGLAS DE AUTOMATIZACIÓN
        </h3>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus size={14} /> Nueva Regla
        </Button>
      </div>

      {rules.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', border: '1px dashed var(--sys-border-soft)', borderRadius: '0.75rem', gap: '0.5rem' }}>
          <Settings size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--sys-text-muted)', fontWeight: 600 }}>Sin reglas de automatización</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>
            Crea reglas como "Cuando una oportunidad pase a etapa X, crear tarea Y"
          </p>
        </div>
      ) : (
        <Table<WorkflowRule>
          data={rules}
          columns={columns}
          keyExtractor={(r) => r.id}
          editable={{ onClick: handleOpenEdit }}
          actions={actions}
          pageSize={20}
          emptyState={{
            icon: <Workflow size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
            title: 'Sin reglas de automatización',
            description: 'Crea tu primera regla de workflow.',
          }}
        />
      )}

      <WorkflowRuleEditor
        open={editorOpen}
        rule={editingRule}
        onClose={() => setEditorOpen(false)}
        onSaved={handleEditorSaved}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar regla de automatización"
        message="¿Está seguro? Esta acción no se puede deshacer. Las ejecuciones pasadas se conservarán."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <Modal open={showExecutions !== null} onClose={() => setShowExecutions(null)}
        title={showExecutions ? `Historial: ${showExecutions.name}` : 'Historial'}>
        {executionsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : executions.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
            Sin ejecuciones registradas aún
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {executions.map(ex => (
              <div key={ex.id} style={{
                padding: '0.75rem', borderRadius: '0.5rem',
                border: '1px solid var(--sys-border-soft)',
                background: 'var(--sys-surface)', fontSize: '0.75rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--sys-text)' }}>
                    #{ex.id} · {ex.trigger_entity === 'opportunity' ? 'Opp' : 'Tarea'} #{ex.trigger_entity_id}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusBadge(ex.status)}
                    <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>
                      {new Date(ex.executed_at).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
                {ex.executed_actions && ex.executed_actions.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {(ex.executed_actions as any[]).map((a, i) => (
                      <span key={i} style={{
                        padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
                        fontSize: '10px', fontWeight: 600,
                        color: a.status === 'success' ? 'var(--sys-success)' : 'var(--sys-error)',
                        background: `color-mix(in srgb, ${a.status === 'success' ? 'var(--sys-success)' : 'var(--sys-error)'} 10%, transparent)`,
                      }}>
                        {a.type}{a.status === 'failed' ? `: ${a.error}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {ex.error_message && (
                  <p style={{ fontSize: '10px', color: 'var(--sys-error)', marginTop: '0.25rem' }}>{ex.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
