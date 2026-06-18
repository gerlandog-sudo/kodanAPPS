import { useEffect, useState, useCallback } from 'react'
import { Button, Input, SlidePanel, MultiSelect, Toggle } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { CustomFieldDef } from '../../api/client'
import { Plus, Edit2, Trash2, GripVertical, Building2, Users, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

type EntityType = 'account' | 'contact' | 'opportunity'

const ENTITY_TABS: { key: EntityType; label: string; icon: React.ReactNode }[] = [
  { key: 'account', label: 'Cuentas B2B', icon: <Building2 size={14} /> },
  { key: 'contact', label: 'Contactos', icon: <Users size={14} /> },
  { key: 'opportunity', label: 'Negociaciones', icon: <Briefcase size={14} /> },
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
    const purge = confirm(`¿Eliminar "${f.field_label}" permanentemente? Esto borrará los datos asociados de forma irreversible.`)
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

  const getFieldTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      text: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      number: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      select: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      multi_select: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      boolean: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      date: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    }

    const label = FIELD_TYPE_OPTIONS.find(o => o.value === type)?.label || type
    const badgeStyle = styles[type] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'

    return (
      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border tracking-wider ${badgeStyle}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5 font-sans text-xs">
      
      {/* Entity Tabs (Slider premium tipo Apple) */}
      <div className="flex p-1 rounded-xl bg-[var(--sys-surface)] border border-[var(--sys-border-soft)] w-fit">
        {ENTITY_TABS.map(tab => {
          const isSelected = entity === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setEntity(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer focus:outline-none"
              style={{
                background: isSelected ? 'var(--sys-surface-raised)' : 'transparent',
                color: isSelected ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                border: isSelected ? '1px solid var(--sys-border-soft)' : '1px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--sys-border-soft)] pb-4">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase text-[var(--sys-text)] m-0">
            Campos Adicionales
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--sys-text-muted)', marginTop: '2px' }}>
            {fields.length} campo{fields.length !== 1 ? 's' : ''} personalizado{fields.length !== 1 ? 's' : ''} activo{fields.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" className="btn-primary flex items-center gap-1.5" onClick={handleOpenCreate}>
          <Plus size={14} /> Nuevo Campo
        </Button>
      </div>

      {/* Field List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]"><span className="spinner" /></div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {fields.map((f, idx) => (
            <div
              key={f.id}
              className="double-bevel-card p-4 flex items-center justify-between gap-3 hover:bg-[var(--sys-surface-hover)]"
              draggable
              onDragStart={() => setDraggedIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedIdx !== null && draggedIdx !== idx) handleReorder(draggedIdx, idx) }}
              style={{ cursor: draggedIdx === idx ? 'grabbing' : 'default', opacity: draggedIdx === idx ? 0.5 : 1 }}
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <span style={{ cursor: 'grab', color: 'var(--sys-text-muted)', display: 'flex' }}>
                  <GripVertical size={14} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--sys-text)]">{f.field_label}</span>
                    {getFieldTypeBadge(f.field_type)}
                    {f.is_required && (
                      <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider">
                        Requerido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>
                    <span>Key: <code className="bg-[var(--sys-surface)] px-1 py-0.2 rounded font-mono text-[9px] text-[var(--sys-text)] border border-[var(--sys-border-soft)]">{f.field_key}</code></span>
                    {f.options && f.options.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="truncate">Opciones: {f.options.slice(0, 3).join(', ')}{f.options.length > 3 ? '...' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleOpenEdit(f)} className="btn btn-ghost" style={{ padding: '0.35rem' }} title="Editar">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(f)} className="btn btn-ghost" style={{ padding: '0.35rem', color: 'var(--sys-error)' }} title="Eliminar">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl text-center" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <Building2 className="w-10 h-10 text-[var(--sys-text-muted)] mx-auto mb-3" />
              <p className="text-xs italic" style={{ color: 'var(--sys-text-muted)' }}>Sin campos personalizados para esta entidad.</p>
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
                required
              />
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>
                Solo minúsculas, números y guión bajo. Se auto-genera a partir del nombre visible.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE VISIBLE *</label>
            <Input
              value={formLabel}
              onChange={e => {
                setFormLabel(e.target.value)
                if (!editingField) {
                  const generated = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s_-]/g, '')
                    .trim()
                    .replace(/[\s_-]+/g, '_')
                  setFormKey(generated)
                }
              }}
              placeholder="Ej: Número de empleados"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>TIPO DE CAMPO</label>
            <select
              className="input"
              value={formType}
              onChange={e => setFormType(e.target.value)}
              style={{ appearance: 'auto', cursor: 'pointer' }}
              disabled={!!editingField}
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
                  placeholder="Escribe y presiona Enter para agregar..."
                  value={''}
                  onChange={() => {}}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      const val = e.target.value.trim()
                      if (!formOptions.includes(val)) {
                        setFormOptions(prev => [...prev, val])
                      }
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
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5"
                      style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', color: 'var(--sys-text)' }}
                    >
                      {opt}
                      <button type="button" onClick={() => setFormOptions(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--sys-error)', cursor: 'pointer' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Toggle
              checked={formRequired}
              onChange={e => setFormRequired(e.target.checked)}
              label="Campo obligatorio"
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
