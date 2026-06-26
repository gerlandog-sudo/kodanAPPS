import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Input } from './Input'
import { SlidePanel } from './SlidePanel'
import { ConfirmDialog } from './ConfirmDialog'
import { Table } from './Table'
import { ColorPicker } from './ColorPicker'
import type { TableColumn } from './Table'
import { api } from '../api/client'
import {
  Plus, Video, Monitor, Phone, MapPin, Mail, Users, Calendar, ListTodo, List
} from 'lucide-react'
import { toast } from 'sonner'

export interface TaskTypesSettingsPanelProps {
  moduleContext?: string
}

interface TaskType {
  id: number
  tenant_id: number
  module: string
  name: string
  icon: string
  color_hex: string
  created_at: string
}

const AVAILABLE_ICONS = [
  { name: 'video', label: 'Reuni&oacute;n / Videollamada', component: Video },
  { name: 'monitor', label: 'Demo / Presentaci&oacute;n', component: Monitor },
  { name: 'phone', label: 'Llamada', component: Phone },
  { name: 'map-pin', label: 'Visita / Presencial', component: MapPin },
  { name: 'mail', label: 'Email', component: Mail },
  { name: 'users', label: 'Trabajo en Equipo', component: Users },
  { name: 'calendar', label: 'Evento / Calendario', component: Calendar },
  { name: 'list', label: 'General / Lista', component: ListTodo },
]

export function TaskTypesSettingsPanel({ moduleContext = 'crm' }: TaskTypesSettingsPanelProps) {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingType, setEditingType] = useState<TaskType | null>(null)

  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6366F1')
  const [formIcon, setFormIcon] = useState('list')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const TT_BASE = '/api/app-config/task-types'
  const params = moduleContext !== 'crm' ? { module: moduleContext } : undefined

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<TaskType[]>(TT_BASE, params)
      setTaskTypes(data)
    } catch {
      toast.error('Error al cargar tipos de tareas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setFormName('')
    setFormColor('#6366F1')
    setFormIcon('list')
    setEditingType(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setPanelOpen(true)
  }

  const handleOpenEdit = (t: TaskType) => {
    setEditingType(t)
    setFormName(t.name)
    setFormColor(t.color_hex || '#6366F1')
    setFormIcon(t.icon || 'list')
    setPanelOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return toast.error('El nombre es requerido')

    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        color_hex: formColor,
        icon: formIcon,
        module: moduleContext,
      }

      if (!editingType) {
        await api.post(TT_BASE, payload)
        toast.success('Tipo de tarea creado')
      } else {
        await api.patch(`${TT_BASE}/${editingType.id}`, payload)
        toast.success('Tipo de tarea actualizado')
      }
      setPanelOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar')
    }
  }

  const openConfirm = (msg: string, action: () => Promise<void>) => {
    setConfirmMsg(msg)
    setConfirmAction(() => action)
    setConfirmOpen(true)
  }

  const handleConfirmAction = async () => {
    setConfirmLoading(true)
    try {
      await confirmAction()
      setConfirmOpen(false)
    } catch {
      toast.error('Error al realizar la acci&oacute;n')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleDelete = (t: TaskType) => {
    openConfirm(`?Est&aacute; seguro que desea eliminar el tipo de tarea "${t.name}"?`, async () => {
      await api.delete(`${TT_BASE}/${t.id}`)
      toast.success('Tipo de tarea eliminado')
      loadData()
    })
  }

  const getIconComponent = (iconName: string) => {
    const matched = AVAILABLE_ICONS.find(i => i.name === iconName)
    return matched ? matched.component : List
  }

  const columns: TableColumn<TaskType>[] = [
    {
      key: 'name',
      header: 'Nombre del Tipo de Tarea',
      render: (t) => {
        const IconComponent = getIconComponent(t.icon)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.375rem',
              background: `color-mix(in srgb, ${t.color_hex} 10%, var(--sys-surface-raised))`,
              border: `1px solid ${t.color_hex}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.color_hex, flexShrink: 0
            }}>
              <IconComponent size={16} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)' }}>
              {t.name}
            </span>
          </div>
        )
      }
    },
    {
      key: 'color_hex',
      header: 'Color Asignado',
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: '0.75rem', height: '0.75rem', borderRadius: '50%',
            background: t.color_hex, display: 'inline-block',
            border: '1px solid var(--sys-border-soft)'
          }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--sys-text-muted)' }}>
            {t.color_hex.toUpperCase()}
          </span>
        </div>
      )
    },
    {
      key: 'icon',
      header: 'Icono',
      render: (t) => {
        const matched = AVAILABLE_ICONS.find(i => i.name === t.icon)
        return (
          <span style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)' }}>
            {matched ? matched.label : `Personalizado (${t.icon})`}
          </span>
        )
      }
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>Tipos de Tareas</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>
            Define las categor&iacute;as para organizar las tareas del m&oacute;dulo
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus size={14} /> Nuevo Tipo
        </Button>
      </div>

      <Table<TaskType>
        data={taskTypes}
        columns={columns}
        keyExtractor={t => t.id}
        loading={loading}
        pageSize={15}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        editable={{ onClick: handleOpenEdit }}
        deletable={{ onClick: handleDelete }}
        emptyState={{
          icon: <ListTodo size={24} />,
          title: 'Sin tipos de tareas',
          description: 'Crea un tipo de tarea para organizar las actividades.'
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar eliminaci&oacute;n"
        message={confirmMsg}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmAction}
        loading={confirmLoading}
      />

      {panelOpen && createPortal(
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingType ? 'Editar Tipo de Tarea' : 'Nuevo Tipo de Tarea'}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>
                Nombre del Tipo *
              </label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ej: Reuni&oacute;n Inicial, Demo T&eacute;cnica..."
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>
                Color Distintivo *
              </label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>

            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Icono *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {AVAILABLE_ICONS.map(item => {
                  const Icon = item.component
                  const isSelected = formIcon === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setFormIcon(item.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                        borderRadius: '0.375rem', border: '1px solid', cursor: 'pointer', textAlign: 'left',
                        background: isSelected ? 'var(--sys-surface-hover)' : 'transparent',
                        borderColor: isSelected ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span style={{
                        padding: '0.25rem', borderRadius: '0.25rem', display: 'flex',
                        color: isSelected ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
                        background: isSelected ? 'var(--sys-surface-raised)' : 'transparent',
                      }}>
                        <Icon size={14} />
                      </span>
                      <span style={{ fontSize: '0.75rem', color: isSelected ? 'var(--sys-text)' : 'var(--sys-text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem', marginTop: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingType ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </SlidePanel>,
        document.body
      )}
    </div>
  )
}