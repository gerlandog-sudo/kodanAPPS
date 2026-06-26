import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { SlidePanel } from './SlidePanel'
import { Toggle } from './Toggle'
import { ConfirmDialog } from './ConfirmDialog'
import { Table } from './Table'
import type { TableColumn, TableAction, BulkAction } from './Table'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import { UserPlus, Shield, Briefcase, TrendingUp, Eye, User, UserCheck, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export interface AppRoleInfo {
  role_id: number;
  role_name: string;
  role_description?: string;
}

export interface TenantUser {
  id: number;
  email: string;
  display_name: string;
  is_active: number;
  created_at: string;
  apps: Record<string, AppRoleInfo>;
}

export interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

export interface UsersSettingsPanelProps {
  appId?: string
}

export function UsersSettingsPanel({ appId = 'crm' }: UsersSettingsPanelProps) {
  const { user: currentUser } = useAuth(appId)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<Record<string, RoleOption[]>>({})
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formActive, setFormActive] = useState(true)
  
  // Estado local para los accesos y roles seleccionados
  const [appAccess, setAppAccess] = useState<Record<string, { enabled: boolean; roleId: number }>>({})

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {})
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [filters] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([
        api.get<TenantUser[]>('/api/tenant-users'),
        api.get<Record<string, RoleOption[]>>('/api/tenant-users/roles'),
      ])
      setUsers(usersData)
      setRoles(rolesData)
    } catch {
      toast.error('Error al cargar datos de usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setSelectedKeys([])
  }, [users])

  // Filtrado de usuarios en cliente
  const filteredUsers = useMemo(() => {
    let result = users
    if (filters.name) {
      const search = filters.name.toLowerCase()
      result = result.filter(u => 
        (u.display_name || '').toLowerCase().includes(search) || 
        (u.email || '').toLowerCase().includes(search)
      )
    }
    if (filters.status) {
      const activeVal = filters.status === 'active' ? 1 : 0
      result = result.filter(u => u.is_active === activeVal)
    }
    return result
  }, [users, filters])

  const resetForm = useCallback(() => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormActive(true)
    setEditingUser(null)
    
    // Inicializar accesos vacíos o desactivados
    const initialAccess: Record<string, { enabled: boolean; roleId: number }> = {}
    Object.keys(roles).forEach(appId => {
      initialAccess[appId] = {
        enabled: false,
        roleId: roles[appId][0]?.id ?? 0
      }
    })
    setAppAccess(initialAccess)
  }, [roles])

  const handleOpenCreate = () => {
    resetForm()
    setPanelOpen(true)
  }

  const handleOpenEdit = (u: TenantUser) => {
    setEditingUser(u)
    setFormName(u.display_name)
    setFormEmail(u.email)
    setFormPassword('')
    setFormActive(u.is_active === 1)
    
    // Mapear accesos existentes en el usuario
    const updatedAccess: Record<string, { enabled: boolean; roleId: number }> = {}
    Object.keys(roles).forEach(appId => {
      const userHasAccess = !!u.apps[appId]
      updatedAccess[appId] = {
        enabled: userHasAccess,
        roleId: userHasAccess ? u.apps[appId].role_id : (roles[appId][0]?.id ?? 0)
      }
    })
    setAppAccess(updatedAccess)
    setPanelOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return toast.error('El nombre visible es requerido')
    if (!formEmail.trim()) return toast.error('El correo electrónico es requerido')
    if (!editingUser && !formPassword) return toast.error('La contraseña es requerida')
    if (!editingUser && formPassword.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')

    // Estructurar el diccionario de aplicaciones a enviar
    const appsPayload: Record<string, number> = {}
    let hasAtLeastOneApp = false
    
    Object.entries(appAccess).forEach(([appId, access]) => {
      if (access.enabled) {
        if (access.roleId <= 0) {
          toast.error(`Selecciona un rol válido para la aplicación ${appId}`)
          return
        }
        appsPayload[appId] = access.roleId
        hasAtLeastOneApp = true
      }
    })

    if (formActive && !hasAtLeastOneApp) {
      return toast.error('Un operador activo debe tener acceso a al menos una aplicación.')
    }

    setSaveLoading(true)
    try {
      const payload: any = {
        display_name: formName.trim(),
        email: formEmail.trim(),
        is_active: formActive ? 1 : 0,
        apps: appsPayload
      }
      
      if (!editingUser) {
        payload.password = formPassword
        await api.post('/api/tenant-users', payload)
        toast.success('Operador creado con éxito')
      } else {
        await api.put(`/api/tenant-users/${editingUser.id}`, payload)
        toast.success('Operador actualizado con éxito')
      }
      setPanelOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar los cambios')
    } finally {
      setSaveLoading(false)
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
      toast.error('Ocurrió un error en el servidor')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleDelete = (u: TenantUser) => {
    if (currentUser && currentUser.id === u.id) {
      return toast.error('No puedes darte de baja a ti mismo')
    }
    openConfirm(`¿Está seguro de que desea dar de baja al operador "${u.display_name || u.email}"?`, async () => {
      await api.delete(`/api/tenant-users/${u.id}`)
      toast.success('Operador dado de baja del tenant')
      loadData()
    })
  }

  const getRoleIcon = (roleName: string) => {
    const n = (roleName || '').toLowerCase()
    if (n.includes('admin')) return <Shield size={13} className="text-red-400 shrink-0" />
    if (n.includes('pm')) return <Briefcase size={13} className="text-blue-400 shrink-0" />
    if (n.includes('commercial') || n.includes('venta')) return <TrendingUp size={13} className="text-green-400 shrink-0" />
    if (n.includes('viewer') || n.includes('visor')) return <Eye size={13} className="text-slate-400 shrink-0" />
    return <User size={13} className="text-slate-400 shrink-0" />
  }

  const columns: TableColumn<TenantUser>[] = [
    {
      key: 'name',
      header: 'Usuario / Operador',
      filterKey: 'name',
      render: (u) => {
        const isSelf = currentUser?.id === u.id
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '999px', background: 'var(--sys-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--sys-primary)' }}>{(u.display_name || u.email).substring(0, 2).toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {u.display_name}
                {isSelf && (
                  <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-primary)', background: 'var(--sys-primary-container)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>
                    tú
                  </span>
                )}
              </span>
              <div style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'apps',
      header: 'Accesos por Aplicación',
      render: (u) => {
        const appKeys = Object.keys(u.apps)
        if (appKeys.length === 0) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin accesos</span>
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {appKeys.map(appId => {
              const info = u.apps[appId]
              return (
                <span
                  key={appId}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--sys-border-soft)',
                    background: 'color-mix(in srgb, var(--sys-primary) 5%, var(--sys-bg))',
                    color: 'var(--sys-text)',
                  }}
                >
                  <span style={{ color: 'var(--sys-primary)', fontWeight: 800 }}>{appId.toUpperCase()}</span>
                  <span style={{ color: 'var(--sys-text-muted)' }}>•</span>
                  {getRoleIcon(info.role_name)}
                  <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>{info.role_name}</span>
                </span>
              )
            })}
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Estado',
      filterKey: 'status',
      align: 'center',
      render: (u) => (
        u.is_active === 1
          ? <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>● Activo</span>
          : <span style={{ color: 'var(--sys-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>○ Inactivo</span>
      ),
    },
  ]

  const bulkActions: BulkAction<TenantUser>[] = [
    {
      label: 'Activar Operadores',
      icon: <UserCheck size={14} />,
      onClick: (items) => 
        Promise.all(items.map(u => api.put(`/api/tenant-users/${u.id}`, { display_name: u.display_name, is_active: 1 })))
          .then(() => { toast.success('Operadores activados'); loadData() })
    },
    {
      label: 'Desactivar Operadores',
      icon: <AlertCircle size={14} />,
      onClick: (items) => {
        if (currentUser && items.some(u => u.id === currentUser.id)) {
          return toast.error('No puedes auto-desactivarte en lote')
        }
        return Promise.all(items.map(u => api.put(`/api/tenant-users/${u.id}`, { display_name: u.display_name, is_active: 0 })))
          .then(() => { toast.success('Operadores desactivados'); loadData() })
      }
    },
    {
      label: 'Dar de Baja',
      icon: <AlertCircle size={14} />,
      variant: 'danger',
      onClick: (items) => {
        if (currentUser && items.some(u => u.id === currentUser.id)) {
          return toast.error('No puedes auto-eliminarte')
        }
        openConfirm(`¿Dar de baja a ${items.length} operador(es) del tenant?`, async () => {
          await Promise.all(items.map(u => api.delete(`/api/tenant-users/${u.id}`)))
          toast.success('Bajas procesadas'); loadData()
        })
      }
    },
  ]

  const rowActions: TableAction<TenantUser>[] = [
    { 
      label: 'Editar Accesos', 
      icon: <Edit size={14} />, 
      onClick: handleOpenEdit 
    },
    { 
      label: 'Dar de Baja', 
      icon: <Trash2 size={14} />, 
      onClick: handleDelete, 
      variant: 'danger' 
    }
  ]

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>Usuarios / Operadores</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>Gestión de acceso transversal al tenant</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <UserPlus size={14} /> Nuevo Operador
        </Button>
      </div>

      {/* Tabla Principal */}
      <Table<TenantUser>
        data={filteredUsers}
        columns={columns}
        keyExtractor={u => u.id}
        loading={loading}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        bulkActions={bulkActions}
        actions={rowActions}
        emptyState={{
          icon: <User size={24} />,
          title: "Sin operadores",
          description: "No se encontraron operadores en este tenant."
        }}
      />

      {/* SlidePanel lateral para Alta / Edición */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingUser ? 'Editar Operador' : 'Nuevo Operador'}
        width="450px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Nombre visible</label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Ej. Juan Carlos"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Correo electrónico</label>
            <Input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="operador@empresa.com"
              disabled={!!editingUser}
              required
            />
          </div>

          {!editingUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Contraseña</label>
              <Input
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
          )}

          {editingUser && (
            <div style={{ fontSize: '11px', color: 'var(--sys-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '-0.5rem 0 0.25rem 0' }}>
              <AlertCircle size={12} />
              <span>La contraseña solo puede ser modificada por el usuario desde su perfil.</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--sys-border-soft)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sys-text)' }}>Habilitar Operador</span>
            <Toggle checked={formActive} onChange={e => setFormActive(e.target.checked)} />
          </div>

          {/* Gestión de Accesos por Aplicación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Accesos y Roles Habilitados
            </span>
            
            {Object.keys(roles).length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--sys-text-muted)', fontStyle: 'italic', margin: 0 }}>
                No hay aplicaciones habilitadas en el plan de su suscripción.
              </p>
            ) : (
              Object.entries(roles).map(([appId, roleOpts]) => {
                const access = appAccess[appId] || { enabled: false, roleId: 0 }
                return (
                  <div
                    key={appId}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--sys-border-soft)',
                      background: access.enabled 
                        ? 'color-mix(in srgb, var(--sys-primary) 3%, var(--sys-surface))'
                        : 'var(--sys-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-text)' }}>
                        Acceso a {appId.toUpperCase()}
                      </span>
                      <Toggle
                        checked={access.enabled}
                        onChange={e => setAppAccess(prev => ({
                          ...prev,
                          [appId]: { ...prev[appId], enabled: e.target.checked }
                        }))}
                      />
                    </div>
                    {access.enabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontWeight: 600 }}>Seleccionar Rol</label>
                        <select
                          value={access.roleId}
                          onChange={e => {
                            const val = parseInt(e.target.value)
                            setAppAccess(prev => ({
                              ...prev,
                              [appId]: { ...prev[appId], roleId: val }
                            }))
                          }}
                          style={{
                            width: '100%',
                            height: '2rem',
                            padding: '0 0.5rem',
                            fontSize: '13px',
                            color: 'var(--sys-text)',
                            background: 'var(--sys-bg)',
                            border: '1px solid var(--sys-border-soft)',
                            borderRadius: '0.25rem',
                            outline: 'none',
                          }}
                        >
                          {roleOpts.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name} ({opt.description ?? 'Sin descripción'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={saveLoading}
              style={{ flex: 1 }}
            >
              {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPanelOpen(false)}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SlidePanel>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar Acción"
        message={confirmMsg}
        onConfirm={handleConfirmAction}
        loading={confirmLoading}
      />
    </div>
  )
}
