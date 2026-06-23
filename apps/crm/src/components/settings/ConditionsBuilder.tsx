import React from 'react'
import { Select, Input } from '@kodan-apps/ui-core'
import { Plus, X } from 'lucide-react'

export interface ConditionRow {
  field: string
  operator: string
  value: any
}

interface FieldDef {
  value: string
  label: string
  operators: { value: string; label: string }[]
  renderValue: (row: ConditionRow, onChange: (v: any) => void) => React.ReactNode
}

interface Props {
  conditions: ConditionRow[]
  onChange: (conditions: ConditionRow[]) => void
  triggerEntity: string
  triggerEvent: string
  pipelines: any[]
  stages: any[]
  taskTypes: any[]
}

export function ConditionsBuilder({ conditions, onChange, triggerEntity, triggerEvent, pipelines, stages, taskTypes }: Props) {
  const isOpportunity = triggerEntity === 'opportunity'
  const isStageEvent = triggerEvent === 'stage_changed'

  const stageOpts = stages.map((s: any) => ({ value: s.id, label: s.name }))
  const pipelineOpts = pipelines.map((p: any) => ({ value: p.id, label: p.name }))
  const statusOpts = [
    { value: 'todo', label: 'Por hacer' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'done', label: 'Completada' },
  ]
  const taskTypeOpts = taskTypes.map((t: any) => ({ value: t.id, label: t.name }))

  const availableFields: FieldDef[] = []

  if (isOpportunity) {
    if (isStageEvent) {
      availableFields.push({
        value: 'from_stage_id',
        label: 'Etapa anterior',
        operators: [{ value: 'eq', label: '=' }],
        renderValue: (row, onChange) => (
          <Select options={stageOpts} value={row.value} onChange={onChange} placeholder="Seleccionar etapa" />
        ),
      })
      availableFields.push({
        value: 'to_stage_id',
        label: 'Etapa nueva',
        operators: [{ value: 'eq', label: '=' }],
        renderValue: (row, onChange) => (
          <Select options={stageOpts} value={row.value} onChange={onChange} placeholder="Seleccionar etapa" />
        ),
      })
    }
    availableFields.push({
      value: 'pipeline_id',
      label: 'Pipeline',
      operators: [{ value: 'eq', label: '=' }],
      renderValue: (row, onChange) => (
        <Select options={pipelineOpts} value={row.value} onChange={onChange} placeholder="Seleccionar pipeline" />
      ),
    })
    availableFields.push({
      value: 'pipeline_ids',
      label: 'Pipelines (múltiple)',
      operators: [{ value: 'in', label: 'in' }],
      renderValue: (row, onChange) => (
        <Select options={pipelineOpts} value={row.value || []} onChange={onChange} multiple placeholder="Seleccionar pipelines" />
      ),
    })
    availableFields.push({
      value: 'value_min',
      label: 'Valor mínimo',
      operators: [
        { value: 'gte', label: '>=' },
        { value: 'gt', label: '>' },
        { value: 'eq', label: '=' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '<=' },
      ],
      renderValue: (row, onChange) => (
        <Input type="number" min={0} value={String(row.value ?? '')} onChange={e => onChange(parseFloat(e.target.value) || 0)} placeholder="0" />
      ),
    })
  }

  if (!isOpportunity) {
    availableFields.push({
      value: 'from_status',
      label: 'Estado anterior',
      operators: [{ value: 'eq', label: '=' }],
      renderValue: (row, onChange) => (
        <Select options={statusOpts} value={row.value} onChange={onChange} placeholder="Seleccionar estado" />
      ),
    })
    availableFields.push({
      value: 'to_status',
      label: 'Estado nuevo',
      operators: [{ value: 'eq', label: '=' }],
      renderValue: (row, onChange) => (
        <Select options={statusOpts} value={row.value} onChange={onChange} placeholder="Seleccionar estado" />
      ),
    })
    availableFields.push({
      value: 'task_type_ids',
      label: 'Tipos de tarea (múltiple)',
      operators: [{ value: 'in', label: 'in' }],
      renderValue: (row, onChange) => (
        <Select options={taskTypeOpts} value={row.value || []} onChange={onChange} multiple placeholder="Seleccionar tipos" />
      ),
    })
  }

  const addCondition = () => {
    if (availableFields.length === 0) return
    const first = availableFields[0]
    onChange([...conditions, { field: first.value, operator: first.operators[0].value, value: '' }])
  }

  const updateCondition = (idx: number, patch: Partial<ConditionRow>) => {
    const next = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    onChange(next)
  }

  const removeCondition = (idx: number) => {
    onChange(conditions.filter((_, i) => i !== idx))
  }

  const getFieldDef = (field: string) => availableFields.find(f => f.value === field)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>
          CONDICIONES
          <span style={{ fontWeight: 400, marginLeft: '0.5rem', textTransform: 'none' }}>
            ({conditions.length})
          </span>
        </span>
        <button
          onClick={addCondition}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
            border: '1px solid var(--sys-border-soft)',
            background: 'transparent', color: 'var(--sys-text-muted)',
            cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
          }}
        >
          <Plus size={12} /> Agregar condición
        </button>
      </div>

      {conditions.length === 0 ? (
        <div style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--sys-border-soft)', textAlign: 'center', fontSize: '0.725rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>
          Sin condiciones — la regla se ejecutará en todos los eventos de este tipo
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {conditions.map((cond, idx) => {
            const def = getFieldDef(cond.field)
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem', borderRadius: '0.5rem',
                border: '1px solid var(--sys-border-soft)',
                background: 'var(--sys-surface)',
              }}>
                <Select
                  options={availableFields.map(f => ({ value: f.value, label: f.label }))}
                  value={cond.field}
                  onChange={v => {
                    const newDef = availableFields.find(f => f.value === v)
                    updateCondition(idx, { field: v as string, operator: newDef?.operators[0]?.value || 'eq', value: '' })
                  }}
                  className="min-w-[180px]"
                />
                {def && (
                  <Select
                    options={def.operators}
                    value={cond.operator}
                    onChange={v => updateCondition(idx, { operator: v as string })}
                    className="min-w-[80px]"
                  />
                )}
                {def && def.renderValue(cond, v => updateCondition(idx, { value: v }))}
                <button
                  onClick={() => removeCondition(idx)}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
