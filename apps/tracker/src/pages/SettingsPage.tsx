import { useState, useEffect, useCallback } from 'react'
import { AdminLayout, Table, Modal, Button, Input, Select, UsersSettingsPanel, CustomFieldsSettingsPanel, TaskTypesSettingsPanel } from '@kodan-apps/ui-core'
import type { AdminSection, TableColumn, TableAction, SelectOption } from '@kodan-apps/ui-core'
import { trackerApi, UserProfile, CatalogItem } from '../api/client'
import { Users, UserCog, Settings2, ListTodo } from 'lucide-react'

type SettingsPanel = 'users' | 'profiles' | 'custom-fields' | 'task-types'

function getSectionFromHash(): SettingsPanel | null {
  const hash = window.location.hash.replace('#', '')
  if (['users', 'profiles', 'custom-fields', 'task-types'].includes(hash)) return hash as SettingsPanel
  return null
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
      weekly_capacity: parseInt(editCapacity) || 2400,
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
    { key: 'weekly_capacity', header: 'Capacidad', render: (p) => `${Math.floor(Number(p.weekly_capacity) / 60)}h/sem` },
  ]

  const actions: TableAction<UserProfile>[] = [
    {
      icon: null!, label: 'Editar',
      onClick: (row) => {
        setEditing(row)
        setEditHourlyCost(String(row.hourly_cost || 0))
        setEditCapacity(String(row.weekly_capacity || 2400))
        setEditPosition(row.position_id ? String(row.position_id) : '')
        setEditSeniority(row.seniority_id ? String(row.seniority_id) : '')
      },
    },
  ]

  return (
    <div className="space-y-4">
      <Table
        columns={columns}
        data={profiles}
        keyExtractor={(p) => p.id}
        emptyState={{
          icon: <UserCog size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
          title: 'No hay perfiles configurados',
          description: 'Los perfiles aparecen automáticamente cuando los usuarios existen en el sistema.',
        }}
        actions={actions}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <div className="p-6 space-y-4 min-w-[400px]">
          <h2 className="text-lg font-semibold">Perfil: {editing?.user_name}</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Costo por hora ($)</label>
            <Input type="number" step="0.01" value={editHourlyCost} onChange={(e) => setEditHourlyCost(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Capacidad semanal (minutos)</label>
            <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
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

export function SettingsPage() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(
    () => getSectionFromHash() || 'users'
  )

  useEffect(() => {
    const onHashChange = () => {
      const section = getSectionFromHash()
      if (section) setActivePanel(section)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (section: string) => {
    window.history.pushState(null, '', `#${section}`)
    setActivePanel(section as SettingsPanel)
  }

  const SETTINGS_SECTIONS: AdminSection[] = [
    { key: 'users', label: 'Usuarios', icon: <Users size={16} />, href: '#users' },
    { key: 'profiles', label: 'Perfiles', icon: <UserCog size={16} />, href: '#profiles' },
    { key: 'custom-fields', label: 'Campos Personalizados', icon: <Settings2 size={16} />, href: '#custom-fields' },
    { key: 'task-types', label: 'Tipos de Tareas', icon: <ListTodo size={16} />, href: '#task-types' },
  ]

  return (
    <AdminLayout sections={SETTINGS_SECTIONS} activeSection={activePanel} onNavigate={navigate}>
      {activePanel === 'users' && <UsersSettingsPanel appId="tracker" />}
      {activePanel === 'profiles' && <UserProfilesPanel />}
      {activePanel === 'custom-fields' && <CustomFieldsSettingsPanel />}
      {activePanel === 'task-types' && <TaskTypesSettingsPanel moduleContext="tracker" />}
    </AdminLayout>
  )
}
