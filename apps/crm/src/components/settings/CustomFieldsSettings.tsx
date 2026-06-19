import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, SlidePanel, Toggle, EntityCard, ConfirmDialog, Table } from '@kodan-apps/ui-core'
import type { TableColumn } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { CustomFieldDef } from '../../api/client'
import type { EntityType } from '../../types/admin'
import { Plus, Trash2, Copy, Building2, Users, Briefcase, Type, Hash, List, CheckSquare, ToggleRight, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const ENTITY_TABS: { key: EntityType; label: string; icon: React.ReactNode }[] = [
  { key: 'account', label: 'Cuentas', icon: <Building2 size={14} /> },
  { key: 'contact', label: 'Contactos', icon: <Users size={14} /> },
  { key: 'opportunity', label: 'Oportunidades', icon: <Briefcase size={14} /> },
]

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto', desc: 'Línea de texto', icon: <Type size={14} />, color: '#3B82F6' },
  { value: 'number', label: 'Número', desc: 'Valores numéricos', icon: <Hash size={14} />, color: '#22C55E' },
  { value: 'select', label: 'Lista', desc: 'Opción única', icon: <List size={14} />, color: '#8B5CF6' },
  { value: 'multi_select', label: 'Multi', desc: 'Múltiples opciones', icon: <CheckSquare size={14} />, color: '#EC4899' },
  { value: 'date', label: 'Fecha', desc: 'Selector de fecha', icon: <Calendar size={14} />, color: '#F97316' },
  { value: 'boolean', label: 'Sí/No', desc: 'Interruptor', icon: <ToggleRight size={14} />, color: '#06B6D4' },
]

export function CustomFieldsSettings() {
  const [entity, setEntity] = useState<EntityType>('account')
  const [fields, setFields] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null)

  const [formKey, setFormKey] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formType, setFormType] = useState<string>('text')
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState<string[]>([])
  const [optionInput, setOptionInput] = useState('')
  const [hoveredTab, setHoveredTab] = useState<EntityType | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadFields = useCallback(async () => {
    setLoading(true)
    try { setFields((await crmApi.listCustomFields(entity)).sort((a, b) => a.sort_order - b.sort_order)) }
    catch { toast.error('Error al cargar campos') }
    finally { setLoading(false) }
  }, [entity])

  useEffect(() => { loadFields() }, [entity])
  useEffect(() => { setSelectedKeys([]) }, [entity])

  const resetForm = () => { 
    setFormKey('')
    setFormLabel('')
    setFormType('text')
    setFormRequired(false)
    setFormOptions([])
    setOptionInput('')
    setEditingField(null)
  }

  const handleOpenCreate = () => { resetForm(); setPanelOpen(true) }

  const handleOpenEdit = (f: CustomFieldDef) => {
    setEditingField(f); setFormKey(f.field_key); setFormLabel(f.field_label); setFormType(f.field_type)
    setFormRequired(f.is_required); setFormOptions(f.options || []); setPanelOpen(true)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return toast.error('El nombre es requerido')
    if (!formKey.trim()) return toast.error('La clave técnica es requerida')
    let finalKey = formKey.trim()
    if (!editingField) {
      finalKey = formKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      if (!finalKey) return toast.error('Clave inválida')
    }
    try {
      const p: any = { entity_type: entity, field_key: finalKey, field_label: formLabel.trim(), field_type: formType, is_required: formRequired }
      if (['select', 'multi_select'].includes(formType)) p.options = formOptions.filter(o => o.trim())
      if (editingField) { await crmApi.updateCustomField(editingField.id, p); toast.success('Campo actualizado') }
      else { await crmApi.createCustomField(p); toast.success('Campo creado') }
      setPanelOpen(false); resetForm(); loadFields()
    } catch (err: any) { toast.error(err?.message || 'Error al guardar') }
  }

  const openConfirm = (msg: string, action: () => Promise<void>) => { setConfirmMsg(msg); setConfirmAction(() => action); setConfirmOpen(true) }

  const handleConfirmAction = async () => {
    setConfirmLoading(true)
    try { await confirmAction(); setConfirmOpen(false) }
    catch { toast.error('Error') }
    finally { setConfirmLoading(false) }
  }

  const handleDelete = (f: CustomFieldDef) => {
    openConfirm(`¿Eliminar "${f.field_label}" permanentemente?`, async () => {
      await crmApi.deleteCustomField(f.id, true); toast.success('Eliminado'); loadFields()
    })
  }

  const getFieldTypeBadge = (type: string) => {
    const opt = FIELD_TYPE_OPTIONS.find(o => o.value === type)
    return (
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: opt?.color }}>
        {opt?.label || type}
      </span>
    )
  }

  const columns: TableColumn<CustomFieldDef>[] = [
    {
      key: 'label', header: 'Campo', filterKey: 'label',
      render: (f) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)' }}>{f.field_label}</span>
            {getFieldTypeBadge(f.field_type)}
            {f.is_required && <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-error)', background: 'var(--sys-error-container)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>Req</span>}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', fontFamily: 'monospace' }}>{f.field_key}</span>
        </div>
      ),
    },
    {
      key: 'options', header: 'Opciones',
      render: (f) => (
        f.options && f.options.length > 0
          ? <span style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)' }}>{f.options.slice(0, 2).join(', ')}{f.options.length > 2 ? ` +${f.options.length - 2}` : ''}</span>
          : <span style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>—</span>
      ),
    },
    {
      key: 'type', header: 'Tipo',
      render: (f) => getFieldTypeBadge(f.field_type),
    },
  ]

  const bulkActions = [
    { label: 'Duplicar', icon: <Copy size={14} />, onClick: (items: CustomFieldDef[]) => Promise.all(items.map(f => crmApi.createCustomField({
      entity_type: f.entity_type, field_key: `${f.field_key}_copy`, field_label: `${f.field_label} (copia)`, field_type: f.field_type, options: f.options, is_required: f.is_required,
    }))).then(() => { toast.success('Duplicados'); loadFields() }) },
    { label: 'Eliminar', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: (items: CustomFieldDef[]) => {
      openConfirm(`¿Eliminar ${items.length} campo(s)?`, async () => {
        await Promise.all(items.map(f => crmApi.deleteCustomField(f.id, true)))
        toast.success('Eliminados'); loadFields()
      })
    }},
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>Campos Personalizados</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>{fields.length} campo{fields.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}><Plus size={14} /> Nuevo Campo</Button>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '0.5rem', background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content', marginBottom: '1rem' }}>
        {ENTITY_TABS.map(tab => {
          const isSelected = entity === tab.key
          const isHovered = hoveredTab === tab.key
          return (
            <button key={tab.key} onClick={() => setEntity(tab.key)}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: isSelected 
                  ? 'var(--sys-primary-container)' 
                  : (isHovered ? 'var(--sys-surface-hover)' : 'transparent'),
                color: isSelected ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
                transition: 'all 120ms ease',
              }}>
              {tab.icon} {tab.label}
            </button>
          )
        })}
      </div>

      <Table<CustomFieldDef>
        data={fields}
        columns={columns}
        keyExtractor={f => f.id}
        loading={loading}
        pageSize={20}
        selectable={false}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        bulkActions={bulkActions}
        editable={{ onClick: handleOpenEdit }}
        deletable={{ onClick: handleDelete }}
        emptyState={{ icon: <Building2 size={24} />, title: 'Sin campos', description: 'Crea el primer campo personalizado' }}
      />

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar"
        message={confirmMsg} confirmLabel="Confirmar" cancelLabel="Cancelar" variant="danger"
        onConfirm={handleConfirmAction} loading={confirmLoading} />

      {panelOpen && createPortal(
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingField ? 'Editar Campo' : 'Nuevo Campo'}>
          <form onSubmit={e => { e.preventDefault(); handleSave() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!editingField && (
              <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Clave técnica *</label>
                <Input value={formKey} onChange={e => setFormKey(e.target.value)} placeholder="Ej: numero_empleados" /></div>
            )}
            <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Nombre visible *</label>
              <Input value={formLabel} onChange={e => { setFormLabel(e.target.value); if (!editingField) setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/[\s_-]+/g, '_')) }}
                placeholder="Ej: Número de empleados" /></div>
            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Tipo *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginTop: '0.5rem' }}>
                {FIELD_TYPE_OPTIONS.filter(o => !editingField || o.value === editingField.field_type).map(o => (
                  <EntityCard key={o.value} icon={o.icon} title={o.label} description={o.desc}
                    selected={formType === o.value} onSelect={() => setFormType(o.value)} disabled={!!editingField && editingField.field_type !== o.value} />
                ))}
              </div>
            </div>
            {['select', 'multi_select'].includes(formType) && (
              <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Opciones</label>
                <Input placeholder="Escribe y Enter..." value={optionInput} onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = optionInput.trim();
                      if (v) {
                        if (!formOptions.includes(v)) {
                          setFormOptions(prev => [...prev, v]);
                        }
                        setOptionInput('');
                      }
                    }
                  }} />
                {formOptions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.375rem' }}>
                    {formOptions.map((opt, i) => (
                      <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {opt}
                        <button type="button" onClick={() => setFormOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sys-error)', padding: 0, fontSize: '0.75rem' }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div><Toggle checked={formRequired} onChange={e => setFormRequired(e.target.checked)} label="Requerido" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingField ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </SlidePanel>,
        document.body
      )}
    </div>
  )
}
