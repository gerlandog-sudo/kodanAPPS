import { Input as UiInput } from './Input'
import { MultiSelect } from './MultiSelect'
import { Toggle } from './Toggle'

interface FieldDefinition {
  id: number
  field_key: string
  field_label: string
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'boolean'
  options: string[] | null
  is_required: boolean
}

interface CustomFieldsFormProps {
  definitions: FieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
}

const selectOptions = (options: string[] | null): { label: string; value: string }[] =>
  (options || []).map(opt => {
    const label = typeof opt === 'string' ? opt : String(opt)
    const value = typeof opt === 'string' ? opt : String(opt)
    return { label, value }
  })

export function CustomFieldsForm({ definitions, values, onChange }: CustomFieldsFormProps) {
  if (!definitions || definitions.length === 0) {
    return (
      <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--sys-text-muted)', fontSize: '0.875rem' }}>
        No hay campos personalizados definidos para esta entidad.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
      {definitions.map(def => {
        const val = values[def.field_key]
        const label = (
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--sys-text)', marginBottom: '0.375rem' }}>
            {def.field_label}
            {def.is_required && <span style={{ color: 'var(--sys-error)' }}> *</span>}
          </label>
        )

        switch (def.field_type) {
          case 'text':
            return (
              <div key={def.id}>
                {label}
                <UiInput
                  value={val ?? ''}
                  onChange={e => onChange(def.field_key, e.target.value)}
                />
              </div>
            )

          case 'number':
            return (
              <div key={def.id}>
                {label}
                <UiInput
                  type="number"
                  value={val ?? ''}
                  onChange={e => onChange(def.field_key, e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            )

          case 'select': {
            const opts = selectOptions(def.options)
            return (
              <div key={def.id}>
                {label}
                <select
                  className="input"
                  value={val ?? ''}
                  onChange={e => onChange(def.field_key, e.target.value)}
                  style={{ appearance: 'auto', cursor: 'pointer' }}
                >
                  <option value="">Seleccionar...</option>
                  {opts.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )
          }

          case 'multi_select': {
            const opts = selectOptions(def.options)
            return (
              <div key={def.id}>
                {label}
                <MultiSelect
                  options={opts}
                  values={val ?? []}
                  onChange={v => onChange(def.field_key, v)}
                />
              </div>
            )
          }

          case 'date':
            return (
              <div key={def.id}>
                {label}
                <UiInput
                  type="date"
                  value={val ?? ''}
                  onChange={e => onChange(def.field_key, e.target.value)}
                />
              </div>
            )

          case 'boolean':
            return (
              <div key={def.id}>
                <Toggle
                  checked={!!val}
                  onChange={e => onChange(def.field_key, e.target.checked)}
                  label={def.field_label}
                />
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
