import { useState, useEffect, useCallback } from 'react'
import { AdminLayout, Table, Modal, Button, Input, Select, ConfirmDialog, UsersSettingsPanel, CustomFieldsSettingsPanel, TaskTypesSettingsPanel } from '@kodan-apps/ui-core'
import type { AdminSection, TableColumn, SelectOption } from '@kodan-apps/ui-core'
import { trackerApi, UserProfile, CatalogItem } from '../api/client'
import { Users, UserCog, Settings2, ListTodo, Briefcase, Award, Plus } from 'lucide-react'

type SettingsPanel = 'users' | 'profiles' | 'positions' | 'seniorities' | 'custom-fields' | 'task-types'

const STORAGE_KEY = 'kodan_tracker_settings_panel'

function getStoredSection(): SettingsPanel {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored && ['users', 'profiles', 'positions', 'seniorities', 'custom-fields', 'task-types'].includes(stored)) {
    return stored as SettingsPanel
  }
  return 'users'
}

function UserProfilesPanel() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [positions, setPositions] = useState<CatalogItem[]>([])
  const [seniorities, setSeniorities] = useState<CatalogItem[]>([])
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [editHourlyCost, setEditHourlyCost] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editSeniority, setEditSeniority] = useState('')

  const load = useCallback(async () => {
    setProfiles(await trackerApi.listProfiles())
    setPositions(await trackerApi.listPositions())
    setSeniorities(await trackerApi.listSeniorities())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!editing) return
    await trackerApi.upsertProfile({
      user_id: editing.user_id,
      hourly_cost: parseFloat(editHourlyCost) || 0,
      weekly_capacity: Math.round((parseFloat(editCapacity) || 40) * 60),
      position_id: editPosition ? parseInt(editPosition) : undefined,
      seniority_id: editSeniority ? parseInt(editSeniority) : undefined,
    })
    setEditing(null)
    load()
  }

  const positionOptions: SelectOption[] = positions.map((p) => ({ value: String(p.id), label: p.name }))
  const seniorityOptions: SelectOption[] = seniorities.map((s) => ({ value: String(s.id), label: s.name }))

  const columns: TableColumn<UserProfile>[] = [
    { key: 'user_name', header: 'Usuario', render: (p) => p.user_name },
    { key: 'position_name', header: 'Posición', render: (p) => p.position_name || '-' },
    { key: 'seniority_name', header: 'Seniority', render: (p) => p.seniority_name || '-' },
    { key: 'hourly_cost', header: 'Costo/hora', render: (p) => `$${Number(p.hourly_cost).toFixed(2)}` },
    { key: 'weekly_capacity', header: 'Capacidad', render: (p) => `${(Number(p.weekly_capacity) / 60).toFixed(1).replace('.0', '')}h/sem` },
  ]
  return (
    <div className="space-y-4">
      <Table
        columns={columns}
        data={profiles}
        keyExtractor={(p) => p.user_id}
        emptyState={{
          icon: <UserCog size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
          title: 'No hay perfiles configurados',
          description: 'Los perfiles aparecen automáticamente cuando los usuarios existen en el sistema.',
        }}
        editable={{
          onClick: (row) => {
            setEditing(row)
            setEditHourlyCost(String(row.hourly_cost || 0))
            setEditCapacity(String((row.weekly_capacity || 2400) / 60))
            setEditPosition(row.position_id ? String(row.position_id) : '')
            setEditSeniority(row.seniority_id ? String(row.seniority_id) : '')
          }
        }}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <div className="p-6 space-y-4 min-w-[400px]">
          <h2 className="text-lg font-semibold">Perfil: {editing?.user_name}</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Costo por hora ($)</label>
            <Input type="number" step="0.01" value={editHourlyCost} onChange={(e) => setEditHourlyCost(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Capacidad semanal (horas)</label>
            <Input type="number" step="0.5" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Posición</label>
            <Select options={positionOptions} value={editPosition} onChange={setEditPosition} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Seniority</label>
            <Select options={seniorityOptions} value={editSeniority} onChange={setEditSeniority} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface CatalogSettingsPanelProps {
  title: string
  emptyTitle: string
  emptyDesc: string
  listFn: () => Promise<CatalogItem[]>
  createFn: (name: string) => Promise<CatalogItem>
  deleteFn: (id: number) => Promise<any>
}

function CatalogSettingsPanel({
  title,
  emptyTitle,
  emptyDesc,
  listFn,
  createFn,
  deleteFn,
}: CatalogSettingsPanelProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<CatalogItem | null>(null)

  const load = useCallback(async () => {
    setItems(await listFn())
  }, [listFn])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createFn(name.trim())
    setName('')
    setIsOpen(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    await deleteFn(deleting.id)
    setDeleting(null)
    load()
  }

  const columns: TableColumn<CatalogItem>[] = [
    { key: 'name', header: 'Nombre', render: (item) => item.name },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} className="mr-1" /> Nuevo
        </Button>
      </div>

      <Table
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        emptyState={{
          icon: <Award size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
          title: emptyTitle,
          description: emptyDesc,
        }}
        deletable={{
          onClick: (item) => setDeleting(item),
        }}
      />

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form onSubmit={handleSave} className="p-6 space-y-4 min-w-[400px]">
          <h2 className="text-lg font-semibold">Crear {title}</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} type="button">Cancelar</Button>
            <Button variant="primary" type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Eliminar ${title.toLowerCase()}`}
        message={`¿Estás seguro de que deseas eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

export function SettingsPage() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(
    () => getStoredSection()
  )

  const navigate = (section: string) => {
    sessionStorage.setItem(STORAGE_KEY, section)
    setActivePanel(section as SettingsPanel)
  }

  const SETTINGS_SECTIONS: AdminSection[] = [
    { key: 'users', label: 'Usuarios', icon: <Users size={16} />, href: '' },
    { key: 'profiles', label: 'Perfiles', icon: <UserCog size={16} />, href: '' },
    { key: 'positions', label: 'Posiciones', icon: <Briefcase size={16} />, href: '' },
    { key: 'seniorities', label: 'Seniorities', icon: <Award size={16} />, href: '' },
    { key: 'custom-fields', label: 'Campos Personalizados', icon: <Settings2 size={16} />, href: '' },
    { key: 'task-types', label: 'Tipos de Tareas', icon: <ListTodo size={16} />, href: '' },
  ]

  return (
    <AdminLayout sections={SETTINGS_SECTIONS} activeSection={activePanel} onNavigate={navigate}>
      {activePanel === 'users' && <UsersSettingsPanel appId="tracker" />}
      {activePanel === 'profiles' && <UserProfilesPanel />}
      {activePanel === 'positions' && (
        <CatalogSettingsPanel
          title="Posiciones"
          emptyTitle="No hay posiciones creadas"
          emptyDesc="Las posiciones te permiten clasificar a los usuarios por su rol."
          listFn={trackerApi.listPositions}
          createFn={trackerApi.createPosition}
          deleteFn={trackerApi.deletePosition}
        />
      )}
      {activePanel === 'seniorities' && (
        <CatalogSettingsPanel
          title="Seniorities"
          emptyTitle="No hay seniorities creados"
          emptyDesc="Los seniorities te permiten clasificar a los usuarios por su nivel de experiencia."
          listFn={trackerApi.listSeniorities}
          createFn={trackerApi.createSeniority}
          deleteFn={trackerApi.deleteSeniority}
        />
      )}
      {activePanel === 'custom-fields' && <CustomFieldsSettingsPanel />}
      {activePanel === 'task-types' && <TaskTypesSettingsPanel moduleContext="tracker" />}
    </AdminLayout>
  )
}
