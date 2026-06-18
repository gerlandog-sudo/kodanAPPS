import { useEffect, useState, useCallback } from 'react'
import { Button, Input, SlidePanel, Toggle, useAuth } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { Users, UserPlus, Edit2, Trash2, Shield, Mail, X, RefreshCw, Key } from 'lucide-react'
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
      const [usersData, rolesData] = await Promise.all([
        crmApi.listTenantUsers(),
        crmApi.listCrmRoles(),
      ])
      setUsers(usersData)
      setRoles(rolesData)
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

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--sys-border-soft)] pb-4">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase text-white m-0">
            Usuarios y Permisos de CRM
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--sys-text-muted)', marginTop: '2px' }}>
            {users.length} operador{users.length !== 1 ? 'es' : ''} registrado{users.length !== 1 ? 's' : ''} en este inquilino
          </p>
        </div>
        <Button variant="primary" className="btn-primary flex items-center gap-1.5" onClick={handleOpenCreate}>
          <UserPlus size={14} /> Añadir Operador
        </Button>
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] py-12 text-center">
          <RefreshCw className="w-6 h-6 text-[var(--sys-primary)] animate-spin mb-2" />
          <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500">
            Consultando Base de Datos...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = currentUser && currentUser.id === u.id
            return (
              <div
                key={u.id}
                className="card p-4 flex items-center justify-between gap-3 hover:bg-[var(--sys-surface-hover)] border border-[var(--sys-border-soft)] rounded-xl transition-all duration-200"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border border-[var(--sys-border-soft)] bg-[var(--sys-surface-light)] flex items-center justify-center shrink-0">
                    <span className="font-bold text-xs text-[var(--sys-primary)]">
                      {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {u.display_name}
                      </span>
                      {isSelf && (
                        <span className="bg-[var(--sys-primary-container)] text-[var(--sys-primary)] border border-[var(--sys-primary-soft)] px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0">
                          TÚ
                        </span>
                      )}
                      <span
                        className={`text-[8px] font-sans uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          u.is_active === 1
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                      >
                        {u.is_active === 1 ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
                      <span className="flex items-center gap-1 truncate text-xs">
                        <Mail size={11} /> {u.email}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-xs">
                        <Shield size={11} /> {u.role_name || 'Sin Rol'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem' }}
                    title="Editar Operador"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={!!isSelf}
                    className="btn btn-ghost"
                    style={{
                      padding: '0.35rem',
                      color: isSelf ? 'var(--sys-text-muted)' : 'var(--sys-error)',
                      opacity: isSelf ? 0.3 : 1,
                      cursor: isSelf ? 'not-allowed' : 'pointer',
                    }}
                    title={isSelf ? 'No se puede eliminar a ti mismo' : 'Dar de Baja'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {users.length === 0 && (
            <div
              className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl text-center"
              style={{ borderColor: 'var(--sys-border-soft)' }}
            >
              <Users className="w-10 h-10 text-[var(--sys-text-muted)] mx-auto mb-3" />
              <p className="text-sm italic" style={{ color: 'var(--sys-text-muted)' }}>
                No se encontraron operadores registrados.
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
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              NOMBRE COMPLETO *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              CORREO ELECTRÓNICO *
            </label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="juan.perez@empresa.com"
              disabled={!!editingUser}
              required
            />
            {editingUser && (
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>
                El correo electrónico de un usuario registrado no se puede modificar.
              </p>
            )}
          </div>

          {!editingUser && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                CONTRASEÑA INICIAL *
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sys-text-muted)] hover:text-white"
                >
                  {showPassword ? <X size={14} /> : <Key size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              ROL EN CRM *
            </label>
            <select
              className="input"
              value={formRoleId}
              onChange={(e) => setFormRoleId(Number(e.target.value))}
              style={{ appearance: 'auto', cursor: 'pointer' }}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} - {r.description}
                </option>
              ))}
            </select>
          </div>

          {editingUser && currentUser && currentUser.id !== editingUser.id && (
            <div className="flex flex-col gap-1 pt-2">
              <Toggle
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                label="Usuario Activo"
              />
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)', marginTop: '2px' }}>
                Si se desactiva, el operador no podrá acceder al CRM ni a ninguna de las herramientas.
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
