import { useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, SlidePanel, Toggle, EntityCard, ConfirmDialog, useAuth } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { TenantUser, CrmRole } from '../../types/admin'
import { UserPlus, RefreshCw, Shield, Briefcase, TrendingUp, Eye, User, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function UsersSettings() {
  const { user: currentUser } = useAuth('crm')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<CrmRole[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLimit, setUsersLimit] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoleId, setFormRoleId] = useState<number>(0)
  const [formActive, setFormActive] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

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
      const userLimitMetric = planStatus.find((m: any) => m.metric === 'users_max')
      if (userLimitMetric) setUsersLimit(userLimitMetric.limit_value)
      if (rolesData.length > 0 && formRoleId === 0) setFormRoleId(rolesData[0].id)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [formRoleId])

  useEffect(() => { loadData() }, [])

  const activeUsersCount = useMemo(() => users.filter(u => u.is_active === 1).length, [users])
  const usagePercent = useMemo(() => {
    if (!usersLimit || usersLimit === 0) return 0
    return Math.min(100, (activeUsersCount / usersLimit) * 100)
  }, [activeUsersCount, usersLimit])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    if (roles.length > 0) setFormRoleId(roles[0].id)
    setFormActive(true)
    setEditingUser(null)
    setShowPassword(false)
  }

  const handleOpenCreate = () => { resetForm(); setPanelOpen(true) }

  const handleOpenEdit = (u: TenantUser) => {
    setEditingUser(u)
    setFormName(u.display_name)
    setFormEmail(u.email)
    setFormPassword('')
    setFormRoleId(u.role_id || (roles[0]?.id ?? 0))
    setFormActive(u.is_active === 1)
    setPanelOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return toast.error('El nombre visible es requerido')
    if (!formEmail.trim()) return toast.error('El correo electrónico es requerido')
    if (!editingUser && !formPassword) return toast.error('La contraseña es requerida para nuevos usuarios')
    if (!editingUser && formPassword.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (formRoleId === 0) return toast.error('Debe seleccionar un rol')
    try {
      const payload: any = { display_name: formName.trim(), email: formEmail.trim(), role_id: formRoleId, is_active: formActive ? 1 : 0 }
      if (!editingUser) { payload.password = formPassword; await crmApi.createTenantUser(payload); toast.success('Usuario creado') }
      else { await crmApi.updateTenantUser(editingUser.id, payload); toast.success('Usuario actualizado') }
      setPanelOpen(false); resetForm(); loadData()
    } catch (err: any) { toast.error(err?.message || 'Error al guardar') }
  }

  const openConfirm = (msg: string, action: () => Promise<void>) => {
    setConfirmMsg(msg)
    setConfirmAction(() => action)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try { await confirmAction(); setConfirmOpen(false) }
    catch { toast.error('Error al ejecutar la acción') }
    finally { setConfirmLoading(false) }
  }

  const handleDelete = (u: TenantUser) => {
    if (currentUser && currentUser.id === u.id) return toast.error('No puedes darte de baja a ti mismo')
    openConfirm(`¿Dar de baja a "${u.display_name || u.email}"? Perderá el acceso de forma inmediata.`, async () => {
      await crmApi.deleteTenantUser(u.id); toast.success('Usuario dado de baja'); loadData()
    })
  }

  const getRoleIcon = (roleName: string) => {
    const name = roleName.toLowerCase()
    if (name.includes('admin')) return <Shield size={16} />
    if (name.includes('pm')) return <Briefcase size={16} />
    if (name.includes('commercial') || name.includes('venta')) return <TrendingUp size={16} />
    if (name.includes('viewer') || name.includes('visor')) return <Eye size={16} />
    return <User size={16} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'var(--font-montserrat, system-ui)', fontSize: '0.75rem', width: '100%' }}>
      {!loading && (
        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sys-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--sys-success, #22c55e)' }} /> Capacidad de Licencias
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 800, color: 'var(--sys-text)' }}>
              {usersLimit && usersLimit > 0 ? `${activeUsersCount} de ${usersLimit} utilizadas` : `${activeUsersCount} utilizadas (Ilimitado)`}
            </span>
          </div>
          {usersLimit && usersLimit > 0 && (
            <div style={{ width: '100%', background: 'var(--sys-border-soft)', borderRadius: '999px', height: '0.25rem', overflow: 'hidden' }}>
              <div style={{ width: `${usagePercent}%`, height: '0.25rem', borderRadius: '999px', background: 'linear-gradient(to right, var(--sys-primary), var(--sys-primary-hover))', transition: 'width 500ms ease-out' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sys-text)', margin: 0 }}>Miembros y Roles</h3>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>Operadores con acceso al CRM</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}><UserPlus size={14} /> Añadir Operador</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', color: 'var(--sys-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>Cargando...</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sys-border-soft)' }}>
                <th style={{ width: '2.5rem', padding: '0.5rem' }}>
                  <input type="checkbox"
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onChange={() => selectedIds.length === users.length ? setSelectedIds([]) : setSelectedIds(users.map(u => u.id))}
                  />
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sys-text-muted)', textAlign: 'left' }}>Nombre y Correo</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sys-text-muted)', textAlign: 'left' }}>Rol CRM</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sys-text-muted)', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sys-text-muted)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody style={{ borderCollapse: 'collapse' }}>
              {selectedIds.length > 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '0.5rem 1rem', background: 'var(--sys-primary-container)', borderRadius: '0.5rem', border: '1px solid var(--sys-primary-soft)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', marginRight: '0.75rem' }}>{selectedIds.length} seleccionado(s)</span>
                    <button onClick={() => { Promise.all(selectedIds.map(id => crmApi.updateTenantUser(id, { is_active: 1 }))).then(() => { toast.success('Activados'); setSelectedIds([]); loadData() }) }}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.6875rem', cursor: 'pointer', background: 'var(--sys-surface-raised)', border: '1px solid var(--sys-border-soft)', borderRadius: '0.375rem' }}>
                      Activar
                    </button>
                    <button onClick={() => { Promise.all(selectedIds.map(id => crmApi.updateTenantUser(id, { is_active: 0 }))).then(() => { toast.success('Desactivados'); setSelectedIds([]); loadData() }) }}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.6875rem', cursor: 'pointer', background: 'var(--sys-surface-raised)', border: '1px solid var(--sys-border-soft)', borderRadius: '0.375rem' }}>
                      Desactivar
                    </button>
                    <button onClick={() => openConfirm(`¿Eliminar ${selectedIds.length} usuario(s)?`, async () => {
                      await Promise.all(selectedIds.map(id => crmApi.deleteTenantUser(id)))
                      toast.success('Eliminados'); setSelectedIds([]); loadData()
                    })}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', cursor: 'pointer', background: 'var(--sys-error)', color: '#fff', border: 'none', borderRadius: '0.375rem' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = currentUser && currentUser.id === u.id
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--sys-border-soft)', transition: 'background 200ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--sys-surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(u.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter(k => k !== u.id) : [...prev, u.id])} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '999px', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.625rem', color: 'var(--sys-primary)' }}>{(u.display_name || u.email).substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text)' }}>{u.display_name}</span>
                            {isSelf && <span style={{ fontSize: '0.4375rem', fontWeight: 800, textTransform: 'uppercase', background: 'var(--sys-primary-container)', color: 'var(--sys-primary)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>tú</span>}
                          </div>
                          <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--sys-text-muted)', marginTop: '0.125rem', display: 'block' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.5625rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid var(--sys-primary-soft)', color: 'var(--sys-primary)' }}>
                        {getRoleIcon(u.role_name || '')} {u.role_name}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {u.is_active === 1 ? (
                        <span style={{ position: 'relative', display: 'inline-flex', width: '0.5rem', height: '0.5rem' }}>
                          <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: '#22c55e', opacity: 0.75, animation: 'ping 1.5s infinite' }} />
                          <span style={{ position: 'relative', width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: '#22c55e' }} />
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: 'var(--sys-error)', opacity: 0.6 }} />
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button onClick={() => handleOpenEdit(u)}
                          style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--sys-text-muted)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(u)} disabled={isSelf}
                          style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: isSelf ? 'not-allowed' : 'pointer', color: 'var(--sys-error)', opacity: isSelf ? 0.3 : 1 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar acción" message={confirmMsg}
        confirmLabel="Confirmar" cancelLabel="Cancelar" variant="danger" onConfirm={handleConfirm} loading={confirmLoading} />

      {panelOpen && createPortal(
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingUser ? 'Editar Operador' : 'Nuevo Operador'}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Nombre Completo *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Juan Pérez" /></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Correo Electrónico *</label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="juan@empresa.com" disabled={!!editingUser} /></div>
            {!editingUser && (
              <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Contraseña Inicial *</label>
                <div style={{ position: 'relative' }}>
                  <Input type={showPassword ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sys-text-muted)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div></div>
            )}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>Rol *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {roles.map(r => (
                  <EntityCard key={r.id} icon={getRoleIcon(r.name)} title={r.name} description={r.description}
                    selected={formRoleId === r.id} onSelect={() => setFormRoleId(r.id)} />
                ))}
              </div>
            </div>
            {editingUser && currentUser && currentUser.id !== editingUser.id && (
              <div style={{ borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem' }}>
                <Toggle checked={formActive} onChange={e => setFormActive(e.target.checked)} label="Usuario Activo" />
                <p style={{ fontSize: '0.5625rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>Si se desactiva, se revocarán todos los permisos de acceso al CRM.</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingUser ? 'Guardar Cambios' : 'Añadir Operador'}</Button>
            </div>
          </form>
        </SlidePanel>,
        document.body
      )}
    </div>
  )
}
