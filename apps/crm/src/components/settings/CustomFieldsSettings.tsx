import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, SlidePanel, MultiSelect, Toggle, EntityCard, ConfirmDialog } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { CustomFieldDef } from '../../api/client'
import type { EntityType } from '../../types/admin'
import { Plus, Edit2, Trash2, Copy, Building2, Users, Briefcase, Type, Hash, List, CheckSquare, ToggleRight, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const ENTITY_TABS: { key: EntityType; label: string; icon: React.ReactNode }[] = [
  { key: 'account', label: 'Cuentas B2B', icon: <Building2 size={14} /> },
  { key: 'contact', label: 'Contactos', icon: <Users size={14} /> },
  { key: 'opportunity', label: 'Negociaciones', icon: <Briefcase size={14} /> },
]

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto', desc: 'Línea de texto estándar', icon: <Type size={14} />, color: '#3B82F6' },
  { value: 'number', label: 'Número', desc: 'Valores numéricos', icon: <Hash size={14} />, color: '#22C55E' },
  { value: 'select', label: 'Lista Desplegable', desc: 'Opción única de un listado', icon: <List size={14} />, color: '#8B5CF6' },
  { value: 'multi_select', label: 'Selección Múltiple', desc: 'Múltiples opciones', icon: <CheckSquare size={14} />, color: '#EC4899' },
  { value: 'date', label: 'Fecha', desc: 'Selector de fecha', icon: <Calendar size={14} />, color: '#F97316' },
  { value: 'boolean', label: 'Sí/No', desc: 'Interruptor on/off', icon: <ToggleRight size={14} />, color: '#06B6D4' },
]

export function CustomFieldsSettings() {
  const [entity, setEntity] = useState<EntityType>('account')
  const [fields, setFields] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null)

  const [formKey, setFormKey] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formType, setFormType] = useState<string>('text')
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState<string[]>([])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadFields = useCallback(async () => {
    setLoading(true)
    try { setFields((await crmApi.listCustomFields(entity)).sort((a: CustomFieldDef, b: CustomFieldDef) => a.sort_order - b.sort_order)) }
    catch { toast.error('Error al cargar campos') }
    finally { setLoading(false) }
  }, [entity])

  useEffect(() => { loadFields() }, [entity])

  const resetForm = () => { setFormKey(''); setFormLabel(''); setFormType('text'); setFormRequired(false); setFormOptions([]); setEditingField(null) }
  const handleOpenCreate = () => { resetForm(); setPanelOpen(true) }

  const handleOpenEdit = (f: CustomFieldDef) => {
    setEditingField(f); setFormKey(f.field_key); setFormLabel(f.field_label); setFormType(f.field_type); setFormRequired(f.is_required); setFormOptions(f.options || []); setPanelOpen(true)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return toast.error('El nombre visible es requerido')
    if (!formKey.trim()) return toast.error('La clave técnica es requerida')
    let finalKey = formKey.trim()
    if (!editingField) {
      finalKey = formKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      if (!finalKey) return toast.error('Clave técnica inválida')
    }
    try {
      const payload: any = { entity_type: entity, field_key: finalKey, field_label: formLabel.trim(), field_type: formType, is_required: formRequired }
      if (['select', 'multi_select'].includes(formType)) payload.options = formOptions.filter(o => o.trim())
      if (editingField) { await crmApi.updateCustomField(editingField.id, payload); toast.success('Campo actualizado') }
      else { await crmApi.createCustomField(payload); toast.success('Campo creado') }
      setPanelOpen(false); resetForm(); loadFields()
    } catch (err: any) { toast.error(err?.message || 'Error al guardar') }
  }

  const openConfirm = (msg: string, action: () => Promise<void>) => { setConfirmMsg(msg); setConfirmAction(() => action); setConfirmOpen(true) }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try { await confirmAction(); setConfirmOpen(false) }
    catch { toast.error('Error al ejecutar') }
    finally { setConfirmLoading(false) }
  }

  const handleDelete = (f: CustomFieldDef) => {
    openConfirm(`¿Eliminar "${f.field_label}" permanentemente?`, async () => { await crmApi.deleteCustomField(f.id, true); toast.success('Campo eliminado'); loadFields() })
  }

  const handleReorder = async (fromIdx: number, toIdx: number) => {
    const newFields = [...fields]; [newFields[fromIdx], newFields[toIdx]] = [newFields[toIdx], newFields[fromIdx]]
    newFields.forEach((f, i) => { f.sort_order = (i + 1) * 10 }); setFields(newFields)
    try { await crmApi.reorderCustomFields(newFields.map(f => ({ id: f.id, sort_order: f.sort_order }))) }
    catch { toast.error('Error al reordenar'); loadFields() }
  }

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  const getFieldTypeBadge = (type: string) => {
    const opt = FIELD_TYPE_OPTIONS.find(o => o.value === type)
    return (
      <span style={{ padding: '0.125rem 0.375rem', borderRadius: '0.375rem', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', border: '1px solid', background: `${opt?.color}15`, color: opt?.color, borderColor: `${opt?.color}30` }}>
        {opt?.label || type}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'var(--font-montserrat, system-ui)', fontSize: '0.75rem' }}>
      <div style={{ display: 'flex', padding: '0.25rem', borderRadius: '0.75rem', background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
        {ENTITY_TABS.map(tab => {
          const isSelected = entity === tab.key
          return (
            <button key={tab.key} onClick={() => setEntity(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: isSelected ? '1px solid var(--sys-border-soft)' : '1px solid transparent', background: isSelected ? 'var(--sys-surface-raised)' : 'transparent', color: isSelected ? 'var(--sys-primary)' : 'var(--sys-text-muted)', boxShadow: isSelected ? 'var(--shadow-sm)' : 'none' }}>
              {tab.icon} {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text)', margin: 0 }}>Campos Adicionales</h3>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>{fields.length} campo{fields.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}><Plus size={14} /> Nuevo Campo</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'var(--sys-primary-container)', border: '1px solid var(--sys-primary-soft)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{selectedIds.length} seleccionado(s)</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem' }}>
                <button onClick={() => openConfirm(`¿Duplicar ${selectedIds.length} campo(s)?`, async () => {
                  const selectedFields = fields.filter(f => selectedIds.includes(f.id))
                  await Promise.all(selectedFields.map(f => crmApi.createCustomField({
                    entity_type: f.entity_type, field_key: `${f.field_key}_copy`, field_label: `${f.field_label} (copia)`, field_type: f.field_type, options: f.options, is_required: f.is_required,
                  })))
                  toast.success('Campos duplicados'); setSelectedIds([]); loadFields()
                })}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', cursor: 'pointer', background: 'var(--sys-surface-raised)', border: '1px solid var(--sys-border-soft)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Copy size={12} /> Duplicar
                </button>
                <button onClick={() => openConfirm(`¿Eliminar ${selectedIds.length} campo(s)?`, async () => {
                  await Promise.all(selectedIds.map(id => crmApi.deleteCustomField(id, true)))
                  toast.success('Campos eliminados'); setSelectedIds([]); loadFields()
                })}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', cursor: 'pointer', background: 'var(--sys-error)', color: '#fff', border: 'none', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </div>
          )}
          {fields.map((f, idx) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid var(--sys-border-soft)', borderRadius: '0.75rem', background: 'var(--sys-surface-raised)', cursor: draggedIdx === idx ? 'grabbing' : 'default', opacity: draggedIdx === idx ? 0.5 : 1 }}
              draggable onDragStart={() => setDraggedIdx(idx)} onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedIdx !== null && draggedIdx !== idx) handleReorder(draggedIdx, idx) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={selectedIds.includes(f.id)}
                  onChange={() => setSelectedIds(prev => prev.includes(f.id) ? prev.filter(k => k !== f.id) : [...prev, f.id])} />
                <span style={{ cursor: 'grab', color: 'var(--sys-text-muted)', display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)' }}>{f.field_label}</span>
                  {getFieldTypeBadge(f.field_type)}
                  {f.is_required && <span style={{ padding: '0.125rem 0.375rem', borderRadius: '0.375rem', fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', background: 'var(--sys-error)15', color: 'var(--sys-error)', border: '1px solid var(--sys-error)30' }}>Requerido</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem', fontSize: '0.625rem', color: 'var(--sys-text-muted)' }}>
                  <span>Key: <code style={{ background: 'var(--sys-surface)', padding: '0.0625rem 0.25rem', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.5625rem', color: 'var(--sys-text)', border: '1px solid var(--sys-border-soft)' }}>{f.field_key}</code></span>
                  {f.options && f.options.length > 0 && <><span>·</span><span>{f.options.slice(0, 3).join(', ')}{f.options.length > 3 ? '...' : ''}</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => handleOpenEdit(f)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sys-text-muted)' }}><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(f)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sys-error)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', border: '1px dashed var(--sys-border-soft)', borderRadius: '1rem' }}>
              <Building2 size={40} style={{ color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin campos personalizados para esta entidad.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar acción" message={confirmMsg}
        confirmLabel="Confirmar" cancelLabel="Cancelar" variant="danger" onConfirm={handleConfirm} loading={confirmLoading} />

      {panelOpen && createPortal(
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}>
          <form onSubmit={e => { e.preventDefault(); handleSave() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!editingField && (
              <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>CLAVE TÉCNICA *</label>
                <Input value={formKey} onChange={e => setFormKey(e.target.value)} placeholder="Ej: numero_empleados" /></div>
            )}
            <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>NOMBRE VISIBLE *</label>
              <Input value={formLabel} onChange={e => { setFormLabel(e.target.value); if (!editingField) setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/[\s_-]+/g, '_')) }}
                placeholder="Ej: Número de empleados" /></div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>TIPO DE CAMPO *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                {FIELD_TYPE_OPTIONS.filter(o => !editingField || o.value === editingField.field_type).map(o => (
                  <EntityCard key={o.value} icon={o.icon} title={o.label} description={o.desc}
                    selected={formType === o.value} onSelect={() => setFormType(o.value)} disabled={!!editingField && editingField.field_type !== o.value} />
                ))}
              </div>
            </div>
            {['select', 'multi_select'].includes(formType) && (
              <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>OPCIONES</label>
                <MultiSelect options={formOptions.map(o => ({ value: o, label: o }))} values={formOptions} onChange={setFormOptions} />
                <Input placeholder="Escribe y presiona Enter..." value={''} onChange={() => {}}
                  onKeyDown={(e: any) => { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); const val = e.target.value.trim(); if (!formOptions.includes(val)) setFormOptions(prev => [...prev, val]); e.target.value = '' } }} />
                {formOptions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {formOptions.map((opt, i) => (
                      <span key={i} style={{ padding: '0.125rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.625rem', fontWeight: 600, background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', color: 'var(--sys-text)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {opt}
                        <button type="button" onClick={() => setFormOptions(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--sys-error)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div><Toggle checked={formRequired} onChange={e => setFormRequired(e.target.checked)} label="Campo obligatorio" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingField ? 'Actualizar' : 'Crear Campo'}</Button>
            </div>
          </form>
        </SlidePanel>,
        document.body
      )}
    </div>
  )
}
