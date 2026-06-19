import { useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, SlidePanel, Toggle, ConfirmDialog, Table, useAuth } from '@kodan-apps/ui-core'
import type { TableColumn } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { TenantUser, CrmRole } from '../../types/admin'
import { UserPlus, Shield, Briefcase, TrendingUp, Eye, User, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function UsersSettings() {
  const { user: currentUser } = useAuth('crm')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<CrmRole[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLimit, setUsersLimit] = useState<number | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoleId, setFormRoleId] = useState<number>(0)
  const [formActive, setFormActive] = useState(true)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [filters, setFilters] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersData, rolesData, planStatus] = await Promise.all([
        crmApi.listTenantUsers(),
        crmApi.listCrmRoles(),
        crmApi.getPlanStatus(),
      ])
      setUsers(usersData)
      setRoles(rolesData)
      const m = planStatus.find((x: any) => x.metric === 'users_max')
      if (m) setUsersLimit(m.limit_value)
      if (rolesData.length > 0 && formRoleId === 0) setFormRoleId(rolesData[0].id)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [formRoleId])

  useEffect(() => { loadData() }, [formRoleId])
  useEffect(() => { setSelectedKeys([]) }, [users])

  const activeUsersCount = useMemo(() => users.filter(u => u.is_active === 1).length, [users])
  const usagePercent = useMemo(() => {
    if (!usersLimit || usersLimit === 0) return 0
    return Math.min(100, (activeUsersCount / usersLimit) * 100)
  }, [activeUsersCount, usersLimit])

  const filteredUsers = useMemo(() => {
    let result = users
    if (filters.name) result = result.filter(u => (u.display_name + ' ' + u.email).toLowerCase().includes(filters.name.toLowerCase()))
    if (filters.role) result = result.filter(u => (u.role_name || '').toLowerCase().includes(filters.role.toLowerCase()))
    if (filters.status) result = result.filter(u => filters.status === 'active' ? u.is_active === 1 : u.is_active === 0)
    return result
  }, [users, filters])

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('')
    if (roles.length > 0) setFormRoleId(roles[0].id)
    setFormActive(true); setEditingUser(null)
  }

  const handleOpenCreate = () => { resetForm(); setPanelOpen(true) }

  const handleOpenEdit = (u: TenantUser) => {
    setEditingUser(u); setFormName(u.display_name); setFormEmail(u.email); setFormPassword('')
    setFormRoleId(u.role_id || (roles[0]?.id ?? 0)); setFormActive(u.is_active === 1); setPanelOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return toast.error('El nombre es requerido')
    if (!formEmail.trim()) return toast.error('El correo es requerido')
    if (!editingUser && !formPassword) return toast.error('La contraseña es requerida')
    if (!editingUser && formPassword.length < 8) return toast.error('Mínimo 8 caracteres')
    if (formRoleId === 0) return toast.error('Selecciona un rol')
    try {
      const p: any = { display_name: formName.trim(), email: formEmail.trim(), role_id: formRoleId, is_active: formActive ? 1 : 0 }
      if (!editingUser) { p.password = formPassword; await crmApi.createTenantUser(p); toast.success('Usuario creado') }
      else { await crmApi.updateTenantUser(editingUser.id, p); toast.success('Usuario actualizado') }
      setPanelOpen(false); resetForm(); loadData()
    } catch (err: any) { toast.error(err?.message || 'Error al guardar') }
  }

  const openConfirm = (msg: string, action: () => Promise<void>) => { setConfirmMsg(msg); setConfirmAction(() => action); setConfirmOpen(true) }

  const handleConfirmAction = async () => {
    setConfirmLoading(true)
    try { await confirmAction(); setConfirmOpen(false) }
    catch { toast.error('Error') }
    finally { setConfirmLoading(false) }
  }

  const handleDelete = (u: TenantUser) => {
    if (currentUser && currentUser.id === u.id) return toast.error('No puedes darte de baja')
    openConfirm(`¿Dar de baja a "${u.display_name || u.email}"?`, async () => {
      await crmApi.deleteTenantUser(u.id); toast.success('Usuario dado de baja'); loadData()
    })
  }

  const getRoleIcon = (roleName: string) => {
    const n = (roleName || '').toLowerCase()
    if (n.includes('admin')) return <Shield size={14} />
    if (n.includes('pm')) return <Briefcase size={14} />
    if (n.includes('commercial') || n.includes('venta')) return <TrendingUp size={14} />
    if (n.includes('viewer') || n.includes('visor')) return <Eye size={14} />
    return <User size={14} />
  }

  const columns: TableColumn<TenantUser>[] = [
    {
      key: 'name', header: 'Usuario', filterKey: 'name',
      render: (u) => {
        const isSelf = currentUser?.id === u.id
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '999px', background: 'var(--sys-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: 'var(--sys-primary)' }}>{(u.display_name || u.email).substring(0, 2).toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)' }}>{u.display_name}</span>
              {isSelf && <span style={{ marginLeft: '0.25rem', fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-primary)', background: 'var(--sys-primary-container)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>tú</span>}
              <div style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>{u.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'role', header: 'Rol', filterKey: 'role',
      render: (u) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>
          {getRoleIcon(u.role_name || '')} {u.role_name || '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Estado', filterKey: 'status', align: 'center',
      render: (u) => (
        u.is_active === 1
          ? <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>● Activo</span>
          : <span style={{ color: 'var(--sys-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>○ Inactivo</span>
      ),
    },
  ]

  const bulkActions = [
    { label: 'Activar', icon: <CheckCircle2 size={14} />, onClick: (items: TenantUser[]) => Promise.all(items.map(u => crmApi.updateTenantUser(u.id, { is_active: 1 }))).then(() => loadData()) },
    { label: 'Desactivar', icon: <UserPlus size={14} />, onClick: (items: TenantUser[]) => Promise.all(items.map(u => crmApi.updateTenantUser(u.id, { is_active: 0 }))).then(() => loadData()) },
    { label: 'Eliminar', icon: <UserPlus size={14} />, variant: 'danger' as const, onClick: (items: TenantUser[]) => {
      if (currentUser && items.some(u => u.id === currentUser.id)) return toast.error('No puedes auto-eliminarte')
      openConfirm(`¿Eliminar ${items.length} usuario(s)?`, async () => {
        await Promise.all(items.map(u => crmApi.deleteTenantUser(u.id)))
        toast.success('Eliminados'); loadData()
      })
    }},
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>Usuarios</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>{users.length} operadores</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}><UserPlus size={14} /> Nuevo Operador</Button>
      </div>

      {!loading && usersLimit && usersLimit > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', fontSize: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--sys-text-muted)' }}>Licencias:</span>
          <div style={{ flex: 1, height: '0.375rem', background: 'var(--sys-border-soft)', borderRadius: '999px', overflow: 'hidden', maxWidth: '12rem' }}>
            <div style={{ width: `${usagePercent}%`, height: '100%', borderRadius: '999px', background: 'var(--sys-primary)', transition: 'width 500ms' }} />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sys-text)' }}>{activeUsersCount}/{usersLimit}</span>
        </div>
      )}

      <Table<TenantUser>
        data={filteredUsers}
        columns={columns}
        keyExtractor={u => u.id}
        loading={loading}
        pageSize={15}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        bulkActions={bulkActions}
        filterable
        filters={filters}
        onFilterChange={setFilters}
        editable={{ onClick: handleOpenEdit }}
        deletable={{ onClick: handleDelete }}
        emptyState={{ icon: <UserPlus size={24} />, title: 'Sin operadores', description: 'Añade el primer operador al CRM' }}
      />

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar"
        message={confirmMsg} confirmLabel="Confirmar" cancelLabel="Cancelar" variant="danger"
        onConfirm={handleConfirmAction} loading={confirmLoading} />

      {panelOpen && createPortal(
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingUser ? 'Editar Operador' : 'Nuevo Operador'}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Nombre *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Juan Pérez" /></div>
            <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Email *</label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="juan@empresa.com" disabled={!!editingUser} /></div>
            {!editingUser && (
              <div><label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Contraseña *</label>
                <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
            )}
            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Rol *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
                {roles.map(r => {
                  const isSelected = formRoleId === r.id
                  return (
                    <button key={r.id} type="button" onClick={() => setFormRoleId(r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem',
                        borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', textAlign: 'left', width: '100%',
                        background: isSelected ? 'var(--sys-surface-hover)' : 'transparent',
                        borderColor: isSelected ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span style={{
                        padding: '0.25rem', borderRadius: '0.375rem', display: 'flex', flexShrink: 0,
                        color: isSelected ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
                        background: isSelected ? 'var(--sys-surface-raised)' : 'transparent',
                        border: '1px solid', borderColor: isSelected ? 'var(--sys-primary-soft)' : 'var(--sys-border-soft)',
                      }}>{getRoleIcon(r.name)}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: isSelected ? 'var(--sys-primary)' : 'var(--sys-text)' }}>{r.name}</div>
                        {r.description && <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.5625rem', color: 'var(--sys-text-muted)', lineHeight: 1.4 }}>{r.description}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            {editingUser && currentUser && currentUser.id !== editingUser.id && (
              <div style={{ borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem' }}>
                <Toggle checked={formActive} onChange={e => setFormActive(e.target.checked)} label="Activo" />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingUser ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </SlidePanel>,
        document.body
      )}
    </div>
  )
}
