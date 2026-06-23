import { useState, useEffect } from 'react'
import { Button, Input, Select, Toggle, SlidePanel } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { toast } from 'sonner'
import type { WorkflowRule, WorkflowAction } from '../../types/admin'
import { ConditionsBuilder, type ConditionRow } from './ConditionsBuilder'
import { ActionFormBuilder } from './ActionFormBuilder'

const TRIGGER_ENTITY_OPTIONS = [
  { value: 'opportunity', label: 'Oportunidad (Negociación)' },
  { value: 'task', label: 'Tarea Comercial' },
]

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
    { value: 'task_created', label: 'Creación' },
    { value: 'task_status_changed', label: 'Cambio de estado' },
    { value: 'task_completed', label: 'Completada' },
    { value: 'task_assigned', label: 'Cambio de asignado' },
    { value: 'task_due_date_changed', label: 'Cambio de fecha límite' },
    { value: 'task_archived', label: 'Archivada' },
    { value: 'task_unarchived', label: 'Restaurada' },
  ],
}

interface Props {
  open: boolean
  rule: WorkflowRule | null
  onClose: () => void
  onSaved: () => void
}

export function WorkflowRuleEditor({ open, rule, onClose, onSaved }: Props) {
  const isEditing = rule !== null

  const [pipelines, setPipelines] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [taskTypes, setTaskTypes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEntity, setTriggerEntity] = useState<'opportunity' | 'task'>('opportunity')
  const [triggerEvent, setTriggerEvent] = useState('stage_changed')
  const [executionOrder, setExecutionOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [conditions, setConditions] = useState<ConditionRow[]>([])
  const [actions, setActions] = useState<WorkflowAction[]>([])

  useEffect(() => {
    if (!open) return
    if (rule) {
      setName(rule.name)
      setDescription(rule.description || '')
      setTriggerEntity(rule.trigger_entity)
      setTriggerEvent(rule.trigger_event)
      setExecutionOrder(rule.execution_order)
      setIsActive(rule.is_active === 1)
      const rawConditions = typeof rule.trigger_conditions === 'string' ? JSON.parse(rule.trigger_conditions) : rule.trigger_conditions
      setConditions(conditionsFromRecord(rawConditions || {}))
      const rawActions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions
      setActions(Array.isArray(rawActions) ? rawActions : [])
    } else {
      setName('')
      setDescription('')
      setTriggerEntity('opportunity')
      setTriggerEvent('stage_changed')
      setExecutionOrder(0)
      setIsActive(true)
      setConditions([])
      setActions([])
    }
  }, [open, rule])

  useEffect(() => {
    async function loadRefs() {
      try {
        const [pps, tts, us] = await Promise.all([
          crmApi.listPipelines(),
          crmApi.listTaskTypes(),
          crmApi.listTenantUsers(),
        ])
        setPipelines(pps)
        setTaskTypes(tts)
        setUsers(us)
      } catch {
        toast.error('Error al cargar datos de referencia')
      }
    }
    if (open) loadRefs()
  }, [open])

  useEffect(() => {
    async function loadStagesForPipelines() {
      const allStages: any[] = []
      for (const p of pipelines) {
        try {
          const ss = await crmApi.listStages(p.id)
          allStages.push(...ss.map((s: any) => ({ ...s, pipeline_id: p.id, pipeline_name: p.name })))
        } catch { /* skip */ }
      }
      setStages(allStages)
    }
    if (pipelines.length > 0) loadStagesForPipelines()
  }, [pipelines])

  const conditionsToRecord = (conds: ConditionRow[]): Record<string, any> => {
    const record: Record<string, any> = {}
    for (const c of conds) {
      if (c.value === '' || c.value === null) continue
      if (c.operator === 'in' || c.operator === 'not_in') {
        record[c.field] = Array.isArray(c.value) ? c.value : []
      } else {
        record[c.field] = c.value
      }
    }
    return record
  }

  function conditionsFromRecord(record: Record<string, any>): ConditionRow[] {
    return Object.entries(record)
      .filter(([_, v]) => v !== null && v !== undefined && v !== '')
      .map(([field, value]) => {
        const isArray = Array.isArray(value)
        return { field, operator: isArray ? 'in' : 'eq', value }
      })
  }

  const handleSave = async () => {
    if (!name.trim()) return toast.error('El nombre es requerido')
    if (actions.length === 0) return toast.error('Agregá al menos una acción')

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        trigger_entity: triggerEntity,
        trigger_event: triggerEvent,
        trigger_conditions: conditionsToRecord(conditions),
        actions,
        is_active: isActive ? 1 : 0,
        execution_order: executionOrder,
      }

      if (isEditing) {
        await crmApi.updateWorkflowRule(rule.id, payload)
        toast.success('Regla actualizada')
      } else {
        await crmApi.createWorkflowRule(payload)
        toast.success('Regla creada')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlidePanel open={open} onClose={onClose} title={isEditing ? `Editar: ${rule.name}` : 'Nueva Regla de Automatización'} width="48rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>NOMBRE *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Crear tarea al ganar" required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>DESCRIPCIÓN</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional de la regla" />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>ENTIDAD DISPARADORA</label>
            <Select
              options={TRIGGER_ENTITY_OPTIONS}
              value={triggerEntity}
              onChange={v => { setTriggerEntity(v as 'opportunity' | 'task'); setTriggerEvent('') }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>EVENTO DISPARADOR</label>
            <Select
              options={TRIGGER_EVENT_OPTIONS[triggerEntity] || []}
              value={triggerEvent}
              onChange={v => setTriggerEvent(v as string)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>ORDEN DE EJECUCIÓN</label>
            <Input type="number" min={0} value={String(executionOrder)} onChange={e => setExecutionOrder(parseInt(e.target.value) || 0)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
            <Toggle checked={isActive} onChange={e => setIsActive(e.target.checked)} label="Regla activa" />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }} />

        <ConditionsBuilder
          conditions={conditions}
          onChange={setConditions}
          triggerEntity={triggerEntity}
          triggerEvent={triggerEvent}
          pipelines={pipelines}
          stages={stages}
          taskTypes={taskTypes}
        />

        <div style={{ borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }} />

        <ActionFormBuilder
          actions={actions}
          onChange={setActions}
          users={users}
          stages={stages}
          taskTypes={taskTypes}
        />

        <div style={{
          borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem',
          display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
          marginTop: 'auto',
        }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Actualizar Regla' : 'Crear Regla')}
          </Button>
        </div>
      </div>
    </SlidePanel>
  )
}
