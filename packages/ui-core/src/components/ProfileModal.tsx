import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { api } from '../api/client'
import { User, Camera, Lock, Save, Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileUser {
  id: number
  email: string
  display_name: string
  avatar_url?: string | null
  language?: string
}

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  user: ProfileUser | null
  appId: string
  onProfileUpdated: (user: Partial<ProfileUser>) => void
}

function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context not available')); return }
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

export function ProfileModal({ open, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const [croppedAvatar, setCroppedAvatar] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Cargamos datos del usuario cuando se abre el modal
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.display_name || '')
      setCroppedAvatar(null)
      setAvatarSrc(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
    }
  }, [open, user])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropConfirm = async () => {
    if (!avatarSrc || !croppedAreaPixels) return
    try {
      const cropped = await getCroppedImg(avatarSrc, croppedAreaPixels)
      setCroppedAvatar(cropped)
      setAvatarSrc(null)
    } catch {
      toast.error('Error al recortar la imagen')
    }
  }

  const handleCropCancel = () => {
    setAvatarSrc(null)
    setCroppedAreaPixels(null)
  }


  const handleSave = async () => {
    if (!user) return
    if (!displayName.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { display_name: displayName.trim() }
      if (croppedAvatar !== null) {
        payload.avatar_url = croppedAvatar
      }

      await api.patch('/api/auth/profile', payload)
      onProfileUpdated({ display_name: displayName.trim(), avatar_url: croppedAvatar || undefined })
      toast.success('Perfil actualizado')

      if (passwordOpen && newPassword) {
        if (newPassword.length < 8) {
          toast.error('La contraseña debe tener al menos 8 caracteres')
          setSaving(false)
          return
        }
        if (newPassword !== confirmPassword) {
          toast.error('Las contraseñas no coinciden')
          setSaving(false)
          return
        }
        try {
          await api.post('/api/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          })
          toast.success('Contraseña actualizada')
          setPasswordOpen(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        } catch (err: any) {
          toast.error(err?.data?.error || err?.message || 'Error al cambiar la contraseña')
          setSaving(false)
          return
        }
      }

      onClose()
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const displayAvatar = croppedAvatar || user.avatar_url || null

  const inputClass = 'w-full px-4 py-3 rounded-md border border-border-soft bg-surface-raised text-text text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25 disabled:opacity-50 disabled:cursor-not-allowed'
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-text-muted'

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" title="">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-primary-container text-on-primary-container text-2xl font-bold">
              {displayAvatar ? (
                <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={32} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center bg-surface-raised border border-border-soft text-text-muted hover:text-text hover:bg-surface-hover transition-all cursor-pointer shadow-sm"
              aria-label="Cambiar foto"
            >
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-text truncate">{user.display_name}</div>
            <div className="text-xs text-text-muted truncate">{user.email}</div>
            {displayAvatar && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-primary hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
              >
                Cambiar foto
              </button>
            )}
          </div>
        </div>

        {avatarSrc && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border-soft">
            <div className="relative w-full" style={{ height: '220px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <Cropper
                image={avatarSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-text-muted shrink-0">Zoom:</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCropCancel} className="flex-1">
                <X size={14} /> Cancelar
              </Button>
              <Button variant="primary" onClick={handleCropConfirm} className="flex-1">
                <Check size={14} /> Aplicar
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="profile-name">Nombre</label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="profile-email">Correo Electrónico</label>
          <input
            id="profile-email"
            type="email"
            value={user.email}
            disabled
            className={inputClass}
          />
          <span className="text-[11px] text-text-muted/60">El correo no puede modificarse</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Idioma</label>
          <Select
            options={[{ value: 'es', label: 'Español' }]}
            value="es"
            onChange={() => {}}
          />
        </div>

        <div className="border-t border-border-soft pt-4">
          <button
            type="button"
            onClick={() => setPasswordOpen(!passwordOpen)}
            className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer text-text hover:text-text-muted transition-colors p-0"
          >
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-text-muted" />
              <span className="text-sm font-medium">Cambiar Contraseña</span>
            </div>
            <ChevronDown
              size={16}
              className="text-text-muted transition-transform duration-200"
              style={{ transform: passwordOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {passwordOpen && (
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="current-password">Contraseña Actual</label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text bg-transparent border-none cursor-pointer"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="new-password">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text bg-transparent border-none cursor-pointer"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text bg-transparent border-none cursor-pointer"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-soft">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={16} />
                Guardar Cambios
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
