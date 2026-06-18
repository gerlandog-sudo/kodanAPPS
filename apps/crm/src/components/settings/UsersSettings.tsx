import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button, Input, SlidePanel, Toggle, useAuth } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { 
  Users, UserPlus, Edit2, Trash2, Shield, X, RefreshCw, Key, 
  Briefcase, TrendingUp, User, Eye, CheckCircle2 
} from 'lucide-react'
import { toast } from 'sonner'

interface TenantUser {
  id: number
  email: string
  display_name: string
  is_active: number
  created_at: string
  role_id: number | null
  role_name: string | null
  role_description: string | null
}

interface CrmRole {
  id: number
  name: string
  description: string
}

export function UsersSettings() {
  const { user: currentUser } = useAuth('crm')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<CrmRole[]>([])
  const [loading, setLoading] = useState(true)

  // Límites del Plan
  const [usersLimit, setUsersLimit] = useState<number | null>(null)

  // SlidePanel State
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoleId, setFormRoleId] = useState<number>(0)
  const [formActive, setFormActive] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

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
      
      // Obtener el límite de usuarios de la métrica del plan
      const userLimitMetric = planStatus.find((m: any) => m.metric === 'users_max')
      if (userLimitMetric) {
        setUsersLimit(userLimitMetric.limit_value)
      }

      if (rolesData.length > 0 && formRoleId === 0) {
        setFormRoleId(rolesData[0].id)
      }
    } catch {
      toast.error('Error al cargar la información de usuarios')
    } finally {
      setLoading(false)
    }
  }, [formRoleId])

  useEffect(() => {
    loadData()
  }, [])

  const activeUsersCount = useMemo(() => {
    return users.filter(u => u.is_active === 1).length
  }, [users])

  const usagePercent = useMemo(() => {
    if (!usersLimit || usersLimit === 0) return 0
    return Math.min(100, (activeUsersCount / usersLimit) * 100)
  }, [activeUsersCount, usersLimit])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    if (roles.length > 0) {
      setFormRoleId(roles[0].id)
    }
    setFormActive(true)
    setEditingUser(null)
    setShowPassword(false)
  }

  const handleOpenCreate = () => {
    resetForm()
    setPanelOpen(true)
  }

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
    if (formRoleId === 0) return toast.error('Debe seleccionar un rol para el usuario')

    try {
      const payload: any = {
        display_name: formName.trim(),
        email: formEmail.trim(),
        role_id: formRoleId,
        is_active: formActive ? 1 : 0,
      }

      if (!editingUser) {
        payload.password = formPassword
        await crmApi.createTenantUser(payload)
        toast.success('Usuario creado con éxito')
      } else {
        await crmApi.updateTenantUser(editingUser.id, payload)
        toast.success('Usuario actualizado con éxito')
      }
      setPanelOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el usuario')
    }
  }

  const handleDelete = async (u: TenantUser) => {
    if (currentUser && currentUser.id === u.id) {
      return toast.error('No puedes dar de baja a tu propio usuario administrador')
    }
    
    const confirmed = confirm(`¿Estás seguro de que deseas dar de baja a "${u.display_name || u.email}"? Perderá el acceso de forma inmediata.`)
    if (!confirmed) return

    try {
      await crmApi.deleteTenantUser(u.id)
      toast.success('Usuario dado de baja correctamente')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar el usuario')
    }
  }

  // Helper para obtener iconos de rol específicos de lucide-react
  const getRoleIcon = (roleName: string) => {
    const name = roleName.toLowerCase()
    if (name.includes('admin')) return <Shield size={16} />
    if (name.includes('pm')) return <Briefcase size={16} />
    if (name.includes('commercial') || name.includes('venta')) return <TrendingUp size={16} />
    if (name.includes('viewer') || name.includes('visor')) return <Eye size={16} />
    return <User size={16} />
  }

  // Estilos de badge por rol de CRM
  const getRoleBadgeStyle = (roleName: string) => {
    const name = roleName.toLowerCase()
    if (name.includes('admin')) {
      return 'bg-[var(--sys-primary-container)]/10 text-[var(--sys-primary)] border-[var(--sys-primary-soft)]/30'
    }
    if (name.includes('commercial')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    }
    if (name.includes('pm')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    }
    return 'bg-[var(--sys-border-soft)] text-[var(--sys-text-muted)] border-transparent'
  }

  return (
    <div className="flex flex-col gap-6 font-sans text-xs">
      
      {/* Barra superior de Licencias y Capacidad (Premium Tier) */}
      {!loading && (
        <div className="p-4 rounded-xl bg-[var(--sys-surface)] border border-[var(--sys-border-soft)] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sys-text-muted)] flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" /> Capacidad de Licencias en CRM
            </span>
            <span className="font-mono text-[10px] font-extrabold text-[var(--sys-text)]">
              {usersLimit && usersLimit > 0 
                ? `${activeUsersCount} de ${usersLimit} Utilizadas` 
                : `${activeUsersCount} Utilizadas (Ilimitado)`
              }
            </span>
          </div>
          {usersLimit && usersLimit > 0 && (
            <div className="w-full bg-[var(--sys-border-soft)] rounded-full h-1 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[var(--sys-primary)] to-[var(--sys-primary-hover)] h-1 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--sys-border-soft)] pb-4">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase text-[var(--sys-text)] m-0">
            Miembros y Roles
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--sys-text-muted)', marginTop: '2px' }}>
            Operadores con acceso al entorno de relaciones del CRM
          </p>
        </div>
        <Button variant="primary" className="btn-primary flex items-center gap-1.5" onClick={handleOpenCreate}>
          <UserPlus size={14} /> Añadir Operador
        </Button>
      </div>

      {/* Lista de usuarios (Tabla de Contraste Extremo) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] py-12 text-center">
          <RefreshCw className="w-6 h-6 text-[var(--sys-primary)] animate-spin mb-2" />
          <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500">
            Consultando Base de Datos...
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--sys-border-soft)]">
                <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[var(--sys-text-muted)] select-none">Nombre y Correo</th>
                <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[var(--sys-text-muted)] select-none">Rol CRM</th>
                <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[var(--sys-text-muted)] select-none text-center">Estado</th>
                <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[var(--sys-text-muted)] select-none text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sys-border-soft)]/40">
              {users.map((u) => {
                const isSelf = currentUser && currentUser.id === u.id
                return (
                  <tr key={u.id} className="group hover:bg-[var(--sys-surface-hover)]/30 transition-colors">
                    
                    {/* Nombre e Email */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[var(--sys-border-soft)] bg-[var(--sys-surface)] flex items-center justify-center shrink-0">
                          <span className="font-extrabold text-[10px] text-[var(--sys-primary)]">
                            {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--sys-text)] truncate">{u.display_name}</span>
                            {isSelf && (
                              <span className="bg-[var(--sys-primary-container)]/10 text-[var(--sys-primary)] border border-[var(--sys-primary-soft)]/20 px-1 py-0.2 rounded text-[7px] font-extrabold uppercase shrink-0">
                                tú
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[var(--sys-text-muted)] block mt-0.5 truncate select-all">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="py-3.5 px-4 vertical-middle">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${getRoleBadgeStyle(u.role_name || '')}`}>
                        {getRoleIcon(u.role_name || '')}
                        {u.role_name}
                      </span>
                    </td>

                    {/* Estado con Pulso Animado */}
                    <td className="py-3.5 px-4 text-center vertical-middle">
                      <div className="flex items-center justify-center">
                        {u.is_active === 1 ? (
                          <span className="relative flex h-2 w-2" title="Activo">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        ) : (
                          <span className="relative flex h-2 w-2" title="Inactivo">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500/60"></span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acciones con Opacidad */}
                    <td className="py-3.5 px-4 text-right vertical-middle">
                      <div className="inline-flex items-center gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-md hover:bg-[var(--sys-surface)] text-[var(--sys-text-muted)] hover:text-[var(--sys-text)] transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={!!isSelf}
                          className="p-1.5 rounded-md hover:bg-[var(--sys-surface)] text-[var(--sys-text-muted)] hover:text-[var(--sys-error)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title={isSelf ? 'No se permite la auto-baja' : 'Dar de Baja'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl text-center mt-4" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <Users className="w-8 h-8 text-[var(--sys-text-muted)] mx-auto mb-3" />
              <p className="text-xs italic" style={{ color: 'var(--sys-text-muted)' }}>
                No hay operadores registrados en este inquilino.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SlidePanel Crear/Editar */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingUser ? 'Editar Operador' : 'Nuevo Operador de CRM'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
              Nombre Completo *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
              Correo Electrónico *
            </label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="juan.perez@empresa.com"
              disabled={!!editingUser}
              required
            />
          </div>

          {!editingUser && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                Contraseña Inicial *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sys-text-muted)] hover:text-[var(--sys-text)]"
                >
                  {showPassword ? <X size={13} /> : <Key size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* Tarjetas Interactivas de Selección de Rol (Card Selectors) */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
              Seleccionar Rol del Operador *
            </label>
            <div className="grid grid-cols-1 gap-2.5 mt-1">
              {roles.map((r) => {
                const isSelected = formRoleId === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormRoleId(r.id)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 focus:outline-none"
                    style={{
                      background: isSelected ? 'var(--sys-surface-hover)' : 'transparent',
                      borderColor: isSelected ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                    }}
                  >
                    <div className={`p-2 rounded-lg border shrink-0 transition-transform ${isSelected ? 'text-[var(--sys-primary)] bg-[var(--sys-surface-raised)] border-[var(--sys-primary-soft)]/30 scale-105' : 'text-[var(--sys-text-muted)] border-[var(--sys-border-soft)]'}`}>
                      {getRoleIcon(r.name)}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-extrabold uppercase tracking-wide block ${isSelected ? 'text-[var(--sys-primary)]' : 'text-[var(--sys-text)]'}`}>
                        {r.name}
                      </span>
                      <span className="text-[10px] text-[var(--sys-text-muted)] block mt-0.5 leading-relaxed">
                        {r.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {editingUser && currentUser && currentUser.id !== editingUser.id && (
            <div className="flex flex-col gap-1 pt-2 border-t border-[var(--sys-border-soft)]/50 mt-2">
              <Toggle
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                label="Usuario Activo"
              />
              <p className="text-[9px]" style={{ color: 'var(--sys-text-muted)', marginTop: '2px' }}>
                Si se desactiva, se revocarán todos los permisos de acceso al CRM de forma inmediata.
              </p>
            </div>
          )}

          <div
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: '1px solid var(--sys-border-soft)' }}
          >
            <Button variant="secondary" type="button" onClick={() => setPanelOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {editingUser ? 'Guardar Cambios' : 'Añadir Operador'}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
