import { useEffect, useState, useCallback } from 'react'
import { Button, Input, SlidePanel, MultiSelect, Toggle } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { CustomFieldDef } from '../../api/client'
import { Plus, Edit2, Trash2, GripVertical, Building2, Users, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

type EntityType = 'account' | 'contact' | 'opportunity'

const ENTITY_TABS: { key: EntityType; label: string; icon: React.ReactNode }[] = [
  { key: 'account', label: 'Cuentas', icon: <Building2 size={16} /> },
  { key: 'contact', label: 'Contactos', icon: <Users size={16} /> },
  { key: 'opportunity', label: 'Negociaciones', icon: <Briefcase size={16} /> },
]

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'multi_select', label: 'Selección múltiple' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí/No (Toggle)' },
]

export function CustomFieldsSettings() {
  const [entity, setEntity] = useState<EntityType>('account')
  const [fields, setFields] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)

  // SlidePanel
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null)

  // Form
  const [formKey, setFormKey] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formType, setFormType] = useState<string>('text')
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState<string[]>([])

  // Drag reorder
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  const loadFields = useCallback(async () => {
    setLoading(true)
    try {
      const data = await crmApi.listCustomFields(entity)
      setFields(data.sort((a: CustomFieldDef, b: CustomFieldDef) => a.sort_order - b.sort_order))
    } catch {
      toast.error('Error al cargar campos personalizados')
    } finally {
      setLoading(false)
    }
  }, [entity])

  useEffect(() => { loadFields() }, [entity])

  const resetForm = () => {
    setFormKey('')
    setFormLabel('')
    setFormType('text')
    setFormRequired(false)
    setFormOptions([])
    setEditingField(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    // Auto-generate key suggestion from first field or empty
    setPanelOpen(true)
  }

  const handleOpenEdit = (f: CustomFieldDef) => {
    setEditingField(f)
    setFormKey(f.field_key)
    setFormLabel(f.field_label)
    setFormType(f.field_type)
    setFormRequired(f.is_required)
    setFormOptions(f.options || [])
    setPanelOpen(true)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return toast.error('El nombre visible del campo es requerido')
    if (!formKey.trim()) return toast.error('La clave técnica (field_key) es requerida')

    // Auto-generate key from label if not editing
    let finalKey = formKey.trim()
    if (!editingField) {
      finalKey = formKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      if (!finalKey) return toast.error('La clave técnica no es válida')
    }

    try {
      const payload: any = {
        entity_type: entity,
        field_key: finalKey,
        field_label: formLabel.trim(),
        field_type: formType,
        is_required: formRequired,
      }
      if (['select', 'multi_select'].includes(formType)) {
        payload.options = formOptions.filter(o => o.trim())
      }

      if (editingField) {
        await crmApi.updateCustomField(editingField.id, payload)
        toast.success('Campo actualizado')
      } else {
        await crmApi.createCustomField(payload)
        toast.success('Campo creado')
      }
      setPanelOpen(false)
      resetForm()
      loadFields()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar campo')
    }
  }

  const handleDelete = async (f: CustomFieldDef) => {
    const purge = confirm(`¿Eliminar "${f.field_label}" permanentemente? Esto borrará los datos asociados.`)
    if (!purge && !confirm('¿Desactivar campo? Los datos se conservarán.')) return
    try {
      await crmApi.deleteCustomField(f.id, purge)
      toast.success('Campo eliminado')
      loadFields()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar campo')
    }
  }

  const handleReorder = async (fromIdx: number, toIdx: number) => {
    const newFields = [...fields];
    [newFields[fromIdx], newFields[toIdx]] = [newFields[toIdx], newFields[fromIdx]]
    newFields.forEach((f, i) => { f.sort_order = (i + 1) * 10 })
    setFields(newFields)
    setDraggedIdx(null)

    try {
      await crmApi.reorderCustomFields(newFields.map(f => ({ id: f.id, sort_order: f.sort_order })))
    } catch {
      toast.error('Error al reordenar')
      loadFields()
    }
  }

  const typeLabel = (t: string) => FIELD_TYPE_OPTIONS.find(o => o.value === t)?.label || t

  return (
    <div className="flex flex-col gap-4">
      {/* Entity tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
        {ENTITY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setEntity(tab.key)}
            className="btn"
            style={{
              background: entity === tab.key ? 'var(--sys-primary-container)' : 'transparent',
              color: entity === tab.key ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
              fontWeight: entity === tab.key ? 600 : 500,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
          {fields.length} campo{fields.length !== 1 ? 's' : ''} definido{fields.length !== 1 ? 's' : ''}
        </p>
        <Button variant="primary" className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={14} /> Nuevo Campo
        </Button>
      </div>

      {/* Field list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]"><span className="spinner" /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((f, idx) => (
            <div
              key={f.id}
              className="card p-4 flex items-center gap-3"
              draggable
              onDragStart={() => setDraggedIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedIdx !== null && draggedIdx !== idx) handleReorder(draggedIdx, idx) }}
              style={{ cursor: draggedIdx === idx ? 'grabbing' : 'default', opacity: draggedIdx === idx ? 0.5 : 1 }}
            >
              <span style={{ cursor: 'grab', color: 'var(--sys-text-muted)', display: 'flex' }}>
                <GripVertical size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.field_label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
                    {typeLabel(f.field_type)}
                  </span>
                  {f.is_required && <span className="text-xs" style={{ color: 'var(--sys-error)' }}>Requerido</span>}
                </div>
                <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  <code style={{ fontSize: '0.75rem' }}>{f.field_key}</code>
                  {f.options && f.options.length > 0 && ` · ${f.options.slice(0, 3).join(', ')}${f.options.length > 3 ? '...' : ''}`}
                </p>
              </div>
              <button onClick={() => handleOpenEdit(f)} className="btn btn-ghost" style={{ padding: '0.25rem' }} title="Editar">
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDelete(f)} className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--sys-error)' }} title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-xl" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <p className="text-sm italic" style={{ color: 'var(--sys-text-muted)' }}>Sin campos personalizados para esta entidad.</p>
            </div>
          )}
        </div>
      )}

      {/* SlidePanel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}>
        <form onSubmit={e => { e.preventDefault(); handleSave() }} className="flex flex-col gap-4">
          {!editingField && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>CLAVE TÉCNICA (field_key) *</label>
              <Input
                value={formKey}
                onChange={e => setFormKey(e.target.value)}
                placeholder="Ej: numero_empleados"
                disabled={!!editingField}
              />
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>
                Solo minúsculas, números y guión bajo. Se auto-genera.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE VISIBLE *</label>
            <Input
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="Ej: Número de empleados"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>TIPO DE CAMPO</label>
            <select
              className="input"
              value={formType}
              onChange={e => setFormType(e.target.value)}
              style={{ appearance: 'auto', cursor: 'pointer' }}
            >
              {FIELD_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {['select', 'multi_select'].includes(formType) && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>OPCIONES</label>
              <MultiSelect
                options={formOptions.map(o => ({ value: o, label: o }))}
                values={formOptions}
                onChange={setFormOptions}
              />
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Nueva opción..."
                  value={''}
                  onChange={() => {}}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      setFormOptions(prev => [...prev, e.target.value.trim()])
                      e.target.value = ''
                    }
                  }}
                />
              </div>
              {formOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {formOptions.map((opt, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}
                    >
                      {opt}
                      <button type="button" onClick={() => setFormOptions(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--sys-error)' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Toggle
              checked={formRequired}
              onChange={e => setFormRequired(e.target.checked)}
              label="Campo requerido"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {editingField ? 'Actualizar' : 'Crear Campo'}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
