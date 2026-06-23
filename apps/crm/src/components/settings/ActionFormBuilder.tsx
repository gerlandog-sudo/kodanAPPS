import React from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input, Select, Toggle } from '@kodan-apps/ui-core'
import { Plus, X, GripVertical } from 'lucide-react'
import type { WorkflowAction } from '../../types/admin'
import type { SelectOption } from '@kodan-apps/ui-core'

type ActionType = WorkflowAction['type']

interface UserPickerOption {
  value: string
  label: string
}

interface Props {
  actions: WorkflowAction[]
  onChange: (actions: WorkflowAction[]) => void
  users: any[]
  stages: any[]
  taskTypes: any[]
}

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'create_task', label: 'Crear tarea' },
  { value: 'update_task_status', label: 'Actualizar estado de tarea' },
  { value: 'assign_task', label: 'Asignar tarea' },
  { value: 'add_task_participants', label: 'Agregar participantes a tarea' },
  { value: 'create_followup_task', label: 'Crear tarea de seguimiento' },
  { value: 'update_opportunity_stage', label: 'Cambiar etapa de negociación' },
  { value: 'assign_opportunity', label: 'Asignar negociación' },
  { value: 'update_opportunity_field', label: 'Actualizar campo de negociación' },
  { value: 'create_followup_opportunity', label: 'Crear negociación de seguimiento' },
  { value: 'send_notification', label: 'Enviar notificación' },
]

const STATUS_OPTS: SelectOption[] = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Completada' },
]

const FIELD_OPTS: SelectOption[] = [
  { value: 'title', label: 'Título' },
  { value: 'value', label: 'Valor' },
  { value: 'currency', label: 'Moneda' },
  { value: 'close_date', label: 'Fecha de cierre' },
  { value: 'close_reason', label: 'Motivo de cierre' },
]

function userPickerOptions(users: any[]): UserPickerOption[] {
  return [
    { value: 'owner', label: 'Dueño del registro' },
    { value: 'creator', label: 'Creador' },
    { value: 'trigger_user', label: 'Usuario actual' },
    ...users.map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name}`.trim() || u.email })),
  ]
}

function SortableAction({ action, idx, users, stages, taskTypes, onChange, onRemove }: {
  action: WorkflowAction
  idx: number
  users: any[]
  stages: any[]
  taskTypes: any[]
  onChange: (action: WorkflowAction) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `action-${idx}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const stageOpts = stages.map((s: any) => ({ value: s.id, label: s.name }))
  const taskTypeOpts = taskTypes.map((t: any) => ({ value: t.id, label: t.name }))
  const userOpts = userPickerOptions(users)
  const multiUserOpts = users.map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}`.trim() || u.email }))

  const setParam = (key: string, value: any) => {
    onChange({ ...action, params: { ...action.params, [key]: value } })
  }

  const fieldRow = (label: string, children: React.ReactNode, key?: string) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>{label}</label>
      {children}
    </div>
  )

  const renderUserPicker = (key: string, label: string) => fieldRow(label, (
    <Select
      options={userOpts}
      value={String(action.params[key] ?? 'owner')}
      onChange={v => setParam(key, v)}
      searchable
    />
  ), key)

  const renderMultiUser = (key: string, label: string) => fieldRow(label, (
    <Select
      options={multiUserOpts}
      value={action.params[key] || []}
      onChange={v => setParam(key, v)}
      multiple
      searchable
      placeholder="Seleccionar usuarios"
    />
  ), key)

  const renderForm = () => {
    switch (action.type) {
      case 'create_task':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('Título *', <Input value={action.params.title ?? ''} onChange={e => setParam('title', e.target.value)} placeholder='Seguimiento {{opportunity_title}}' />, 'title')}
            <div style={{ gridColumn: '1 / -1' }}>
              {fieldRow('Descripción', (
                <textarea
                  value={action.params.description ?? ''}
                  onChange={e => setParam('description', e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                    border: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface-raised)',
                    color: 'var(--sys-text)', fontSize: '0.7rem', fontFamily: 'inherit',
                    outline: 'none', resize: 'vertical',
                  }}
                  placeholder='Descripción con {{variables}}'
                />
              ), 'description')}
            </div>
            {renderUserPicker('assigned_to', 'Asignar a')}
            {fieldRow('Estado', <Select options={STATUS_OPTS} value={action.params.status ?? 'todo'} onChange={v => setParam('status', v)} />, 'status')}
            {fieldRow('Días hasta vencimiento', <Input type="number" min={0} value={String(action.params.due_date_offset_days ?? '')} onChange={e => setParam('due_date_offset_days', parseInt(e.target.value) || 0)} placeholder="0" />, 'due_date')}
            {fieldRow('Tipo de tarea', <Select options={taskTypeOpts} value={action.params.task_type_id ?? ''} onChange={v => setParam('task_type_id', v)} placeholder="Sin tipo" />, 'task_type')}
            {fieldRow('Vincular a oportunidad', <Toggle checked={action.params.link_to_trigger_opportunity ?? false} onChange={e => setParam('link_to_trigger_opportunity', e.target.checked)} />, 'link')}
            {renderMultiUser('participants', 'Participantes adicionales')}
          </div>
        )

      case 'update_task_status':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('ID de tarea (opcional)', <Input type="number" min={0} value={String(action.params.task_id ?? '')} onChange={e => setParam('task_id', parseInt(e.target.value) || 0)} placeholder="Usar tarea actual" />, 'task_id')}
            {fieldRow('Nuevo estado *', <Select options={STATUS_OPTS} value={action.params.to_status ?? 'done'} onChange={v => setParam('to_status', v)} />, 'to_status')}
          </div>
        )

      case 'assign_task':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('ID de tarea (opcional)', <Input type="number" min={0} value={String(action.params.task_id ?? '')} onChange={e => setParam('task_id', parseInt(e.target.value) || 0)} placeholder="Usar tarea actual" />, 'task_id')}
            {renderUserPicker('assigned_to', 'Asignar a *')}
          </div>
        )

      case 'add_task_participants':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('ID de tarea (opcional)', <Input type="number" min={0} value={String(action.params.task_id ?? '')} onChange={e => setParam('task_id', parseInt(e.target.value) || 0)} placeholder="Usar tarea actual" />, 'task_id')}
            {renderMultiUser('user_ids', 'Participantes *')}
          </div>
        )

      case 'create_followup_task':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('Prefijo título', <Input value={action.params.title_prefix ?? 'Seguimiento: '} onChange={e => setParam('title_prefix', e.target.value)} placeholder="Seguimiento: " />, 'title_prefix')}
            {renderUserPicker('assigned_to', 'Asignar a')}
            {fieldRow('Días hasta vencimiento', <Input type="number" min={0} value={String(action.params.due_date_offset_days ?? '')} onChange={e => setParam('due_date_offset_days', parseInt(e.target.value) || 0)} placeholder="0" />, 'due_date')}
          </div>
        )

      case 'update_opportunity_stage':
        return fieldRow('Etapa destino *', <Select options={stageOpts} value={action.params.to_stage_id ?? ''} onChange={v => setParam('to_stage_id', v)} placeholder="Seleccionar etapa" />)

      case 'assign_opportunity':
        return renderUserPicker('assigned_to', 'Asignar a *')

      case 'update_opportunity_field':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('Campo *', <Select options={FIELD_OPTS} value={action.params.field ?? ''} onChange={v => setParam('field', v)} placeholder="Seleccionar campo" />, 'field')}
            {fieldRow('Valor *', <Input value={String(action.params.value ?? '')} onChange={e => setParam('value', e.target.value)} placeholder='{{value}} * 0.9' />, 'value')}
          </div>
        )

      case 'create_followup_opportunity':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('Template título', <Input value={action.params.title_template ?? 'Seguimiento: {{opportunity_title}}'} onChange={e => setParam('title_template', e.target.value)} />, 'title_template')}
            {fieldRow('Etapa inicial', <Select options={stageOpts} value={action.params.stage_id ?? ''} onChange={v => setParam('stage_id', v)} placeholder="Misma etapa" />, 'stage_id')}
            {fieldRow('% del valor', <Input type="number" min={0} max={100} value={String(action.params.value_percentage ?? '100')} onChange={e => setParam('value_percentage', parseFloat(e.target.value) || 0)} placeholder="100" />, 'value_pct')}
          </div>
        )

      case 'send_notification':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {fieldRow('Título *', <Input value={action.params.title ?? ''} onChange={e => setParam('title', e.target.value)} placeholder="Notificación automática" />, 'title')}
            <div style={{ gridColumn: '1 / -1' }}>
              {fieldRow('Mensaje *', (
                <textarea
                  value={action.params.message ?? ''}
                  onChange={e => setParam('message', e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                    border: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface-raised)',
                    color: 'var(--sys-text)', fontSize: '0.7rem', fontFamily: 'inherit',
                    outline: 'none', resize: 'vertical',
                  }}
                  placeholder='Mensaje con {{variables}}'
                />
              ), 'message')}
            </div>
            {renderUserPicker('assigned_to', 'Notificar a')}
            {fieldRow('Tipo', <Input value={action.params.type ?? 'workflow_auto'} onChange={e => setParam('type', e.target.value)} />, 'type')}
          </div>
        )

      default:
        return <span style={{ fontSize: '0.7rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Seleccioná un tipo de acción</span>
    }
  }

  return (
    <div ref={setNodeRef} style={{
      ...style,
      padding: '0.75rem', borderRadius: '0.5rem',
      border: '1px solid var(--sys-border-soft)',
      background: 'var(--sys-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <button
          {...attributes}
          {...listeners}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', borderRadius: '0.25rem',
            border: 'none', background: 'transparent',
            color: 'var(--sys-text-muted)', cursor: 'grab',
            flexShrink: 0, marginTop: '0.125rem',
          }}
        >
          <GripVertical size={14} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <Select
                options={ACTION_TYPE_OPTIONS}
                value={action.type}
                onChange={v => onChange({ type: v as ActionType, params: {} })}
                placeholder="Seleccionar tipo de acción"
              />
            </div>
            <button
              onClick={onRemove}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '24px', height: '24px', borderRadius: '0.25rem',
                border: 'none', background: 'transparent',
                color: 'var(--sys-text-muted)', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
          {action.type && renderForm()}
        </div>
      </div>
    </div>
  )
}

export function ActionFormBuilder({ actions, onChange, users, stages, taskTypes }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const addAction = () => {
    if (actions.length >= 10) return
    onChange([...actions, { type: '' as any, params: {} }])
  }

  const updateAction = (idx: number, action: WorkflowAction) => {
    const next = actions.map((a, i) => (i === idx ? action : a))
    onChange(next)
  }

  const removeAction = (idx: number) => {
    onChange(actions.filter((_, i) => i !== idx))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = parseInt(active.id.replace('action-', ''))
    const newIdx = parseInt(over.id.replace('action-', ''))
    const next = [...actions]
    const [moved] = next.splice(oldIdx, 1)
    next.splice(newIdx, 0, moved)
    onChange(next)
  }

  const actionIds = actions.map((_, i) => `action-${i}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>
          ACCIONES
          <span style={{ fontWeight: 400, marginLeft: '0.5rem', textTransform: 'none' }}>
            ({actions.length}/10)
          </span>
        </span>
        <button
          onClick={addAction}
          disabled={actions.length >= 10}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
            border: '1px solid var(--sys-border-soft)',
            background: 'transparent', color: actions.length >= 10 ? 'var(--sys-text-muted)' : 'var(--sys-text)',
            cursor: actions.length >= 10 ? 'not-allowed' : 'pointer',
            fontSize: '0.7rem', fontWeight: 600, opacity: actions.length >= 10 ? 0.4 : 1,
          }}
        >
          <Plus size={12} /> Agregar acción
        </button>
      </div>

      {actions.length === 0 ? (
        <div style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--sys-border-soft)', textAlign: 'center', fontSize: '0.725rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>
          Sin acciones — agregá al menos una acción para que la regla haga algo
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={actionIds} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {actions.map((action, idx) => (
                <SortableAction
                  key={actionIds[idx]}
                  action={action}
                  idx={idx}
                  users={users}
                  stages={stages}
                  taskTypes={taskTypes}
                  onChange={a => updateAction(idx, a)}
                  onRemove={() => removeAction(idx)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
