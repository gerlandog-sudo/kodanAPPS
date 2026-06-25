import { useEffect, useState, useCallback } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { ConfirmDialog } from './ConfirmDialog'
import { api } from '../api/client'
import { Server, Shield, Send, Trash2, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface SmtpConfig {
  configured: boolean
  source: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  has_password: boolean
  smtp_secure: string
  from_email: string
  from_name: string
  is_active: number
  updated_at: string | null
  message?: string
}

const EMPTY_FORM = {
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: 'tls' as 'tls' | 'ssl' | 'none',
  from_email: '',
  from_name: '',
  is_active: 1,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--sys-text-muted)',
  marginBottom: 4,
}

export function SmtpSettingsPanel() {
  const [config, setConfig] = useState<SmtpConfig | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SmtpConfig>('/api/mail/smtp-config')
      setConfig(data)
      if (data.configured) {
        setForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_pass: '',
          smtp_secure: (data.smtp_secure as 'tls' | 'ssl' | 'none') || 'tls',
          from_email: data.from_email || '',
          from_name: data.from_name || '',
          is_active: data.is_active ?? 1,
        })
      } else {
        setForm(EMPTY_FORM)
      }
    } catch {
      toast.error('Error al cargar la configuración SMTP')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async () => {
    if (!form.smtp_host.trim()) return toast.error('El host SMTP es requerido')
    if (!form.smtp_user.trim()) return toast.error('El usuario SMTP es requerido')
    if (!form.from_email.trim()) return toast.error('El email remitente es requerido')
    if (!config?.configured && !form.smtp_pass) return toast.error('La contraseña SMTP es requerida')

    setSaving(true)
    try {
      await api.put('/api/mail/smtp-config', form)
      toast.success('Configuración SMTP guardada')
      loadConfig()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await api.post<{ success: boolean; message: string }>('/api/mail/smtp-config/test', form)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la prueba'
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete('/api/mail/smtp-config')
      toast.success('Configuración SMTP eliminada. Se usará la global del sistema.')
      setForm(EMPTY_FORM)
      loadConfig()
    } catch {
      toast.error('Error al eliminar la configuración')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--sys-text-muted)' }} />
      </div>
    )
  }

  const isConfigured = config?.configured === true

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>
            Configuración SMTP
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>
            Configura el servidor de correo saliente para este tenant
          </p>
        </div>

        {/* Status Badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            background: isConfigured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: isConfigured ? 'rgb(16, 185, 129)' : 'rgb(245, 158, 11)',
            border: `1px solid ${isConfigured ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          }}
        >
          {isConfigured ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {isConfigured ? 'Configuración propia activa' : 'Usando config. global del sistema'}
        </div>
      </div>

      {/* Form Card */}
      <div
        className="bg-surface-raised border border-solid border-border-soft rounded-lg p-6"
        style={{ maxWidth: 640 }}
      >
        {/* Server Connection */}
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} style={{ color: 'var(--sys-text-muted)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--sys-text)' }}>
            Servidor SMTP
          </span>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 100px' }}>
          <div>
            <label style={labelStyle}>Host SMTP</label>
            <Input
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label style={labelStyle}>Puerto</label>
            <Input
              type="number"
              value={String(form.smtp_port)}
              onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })}
              placeholder="587"
            />
          </div>
        </div>

        <div className="mt-3">
          <label style={labelStyle}>Encriptación</label>
          <div className="flex gap-2">
            {(['tls', 'ssl', 'none'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, smtp_secure: opt })}
                className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors border border-solid"
                style={{
                  background: form.smtp_secure === opt ? 'var(--sys-accent)' : 'var(--sys-surface)',
                  color: form.smtp_secure === opt ? '#fff' : 'var(--sys-text)',
                  borderColor: form.smtp_secure === opt ? 'var(--sys-accent)' : 'var(--sys-border-soft)',
                }}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Authentication */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          <Shield size={16} style={{ color: 'var(--sys-text-muted)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--sys-text)' }}>
            Autenticación
          </span>
        </div>

        <div className="grid gap-3">
          <div>
            <label style={labelStyle}>Usuario SMTP</label>
            <Input
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
              placeholder="usuario@tuempresa.com"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>
              {isConfigured && config?.has_password ? 'Contraseña SMTP (dejar vacío para mantener actual)' : 'Contraseña SMTP'}
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.smtp_pass}
              onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
              placeholder={isConfigured && config?.has_password ? '••••••••' : 'Ingresa la contraseña'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center cursor-pointer"
              style={{
                position: 'absolute',
                right: 10,
                bottom: 10,
                background: 'none',
                border: 'none',
                color: 'var(--sys-text-muted)',
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Sender Identity */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          <Send size={16} style={{ color: 'var(--sys-text-muted)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--sys-text)' }}>
            Identidad del Remitente
          </span>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={labelStyle}>Email Remitente</label>
            <Input
              type="email"
              value={form.from_email}
              onChange={(e) => setForm({ ...form, from_email: e.target.value })}
              placeholder="no-reply@tuempresa.com"
            />
          </div>
          <div>
            <label style={labelStyle}>Nombre Remitente</label>
            <Input
              value={form.from_name}
              onChange={(e) => setForm({ ...form, from_name: e.target.value })}
              placeholder="Mi Empresa"
            />
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-solid border-border-soft">
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)' }}>
            <input
              type="checkbox"
              checked={form.is_active === 1}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
              style={{ width: 16, height: 16, accentColor: 'var(--sys-accent)', cursor: 'pointer' }}
            />
            Configuración activa
          </label>
          <span style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>
            Si se desactiva, se usará la configuración global del sistema
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-solid border-border-soft">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1 inline-block" /> : null}
            Guardar Configuración
          </Button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !form.smtp_host}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border border-solid"
            style={{
              background: 'transparent',
              color: 'rgb(59, 130, 246)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              opacity: testing || !form.smtp_host ? 0.5 : 1,
            }}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Probar Conexión
          </button>

          {isConfigured && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border border-solid ml-auto"
              style={{
                background: 'transparent',
                color: 'rgb(239, 68, 68)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 size={14} />
              Eliminar Config.
            </button>
          )}
        </div>

        {/* Last updated */}
        {isConfigured && config?.updated_at && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', marginTop: 12 }}>
            Última actualización: {new Date(config.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar Configuración SMTP"
        message="¿Estás seguro? Se eliminará la configuración SMTP personalizada y se utilizará la del sistema global. Los correos seguirán funcionando con la config. global."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
