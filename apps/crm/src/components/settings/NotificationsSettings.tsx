import { useEffect, useState } from 'react'
import { Button, Input } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { BellRing, Save } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationsSettings() {
  const [days, setDays] = useState<number>(15)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await crmApi.getNotificationsConfig()
        if (config && typeof config.stalled_deal_days === 'number') {
          setDays(config.stalled_deal_days)
        }
      } catch {
        toast.error('Error al cargar la configuración de alertas')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (days <= 0) {
      toast.error('La cantidad de días debe ser mayor a 0')
      return
    }

    setSaving(true)
    try {
      await crmApi.saveNotificationsConfig({ stalled_deal_days: days })
      toast.success('Configuración guardada exitosamente')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-fade-in">
      <div className="double-bevel-card p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
          <div className="size-10 rounded-lg flex items-center justify-center bg-[var(--sys-primary-container)] text-[var(--color-on-primary-container)]">
            <BellRing size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold m-0" style={{ fontFamily: 'var(--font-montserrat)' }}>Alertas de Negociación</h3>
            <p className="text-xs text-[var(--sys-text-muted)] mt-1">Configura las reglas automáticas de detección para negociaciones estancadas.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
              DÍAS DE INACTIVIDAD (NEGOCIACIÓN ESTANCADA)
            </label>
            <Input
              type="number"
              value={String(days)}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value, 10) || 0))}
              placeholder="15"
              required
              min={1}
            />
            <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>
              Las negociaciones que no registren cambios en su etapa, valor, cotizaciones, tareas o notas en este período de tiempo se mostrarán en el Centro de Alertas como "Negociación estancada".
            </span>
          </div>

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
