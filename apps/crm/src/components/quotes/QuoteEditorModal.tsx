import { useEffect, useState } from 'react'
import { Button, Modal, Input } from '@kodan-apps/ui-core'
import { toast } from 'sonner'
import { crmApi } from '../../api/client'
import { QuoteLineItemsEditor } from './QuoteLineItemsEditor'
import type { Quote, QuoteLineItem, QuoteStatus } from '../../types/admin'

export interface QuoteEditorModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editQuote: Quote | null
  preselectedOpportunityId?: number | null
}

export function QuoteEditorModal({ open, onClose, onSaved, editQuote, preselectedOpportunityId }: QuoteEditorModalProps) {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loadingOpps, setLoadingOpps] = useState(false)
  const [saving, setSaving] = useState(false)

  const [quoteNumber, setQuoteNumber] = useState('')
  const [opportunityId, setOpportunityId] = useState<number>(0)
  const [status, setStatus] = useState<QuoteStatus>('draft')
  const [items, setItems] = useState<QuoteLineItem[]>([])

  // Load opportunities for dropdown
  useEffect(() => {
    if (!open) return
    setLoadingOpps(true)
    crmApi.listOpportunities()
      .then((data) => setOpportunities(data))
      .catch(() => toast.error('Error al cargar oportunidades'))
      .finally(() => setLoadingOpps(false))
  }, [open])

  // Populate form on edit / preselected
  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }

    if (editQuote) {
      setQuoteNumber(editQuote.quote_number)
      setOpportunityId(editQuote.opportunity_id)
      setStatus(editQuote.status)
      setItems(editQuote.items as QuoteLineItem[] || [])
    } else {
      setQuoteNumber(generateQuoteNumber())
      setOpportunityId(preselectedOpportunityId ?? 0)
      setStatus('draft')
      setItems([])
    }
  }, [open, editQuote, preselectedOpportunityId])

  const resetForm = () => {
    setQuoteNumber('')
    setOpportunityId(0)
    setStatus('draft')
    setItems([])
  }

  const generateQuoteNumber = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
    return `Q-${year}-${rand}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteNumber.trim()) {
      toast.error('El número de cotización es obligatorio.')
      return
    }
    if (opportunityId <= 0) {
      toast.error('Debe seleccionar una oportunidad.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        quote_number: quoteNumber.trim(),
        opportunity_id: opportunityId,
        status,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_percentage: Number(it.discount_percentage),
          tax_percentage: Number(it.tax_percentage),
        })),
      }

      if (editQuote) {
        await crmApi.updateQuote(editQuote.id, payload)
        toast.success('Cotización actualizada.')
      } else {
        await crmApi.createQuote(payload)
        toast.success('Cotización creada.')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar cotización.')
    } finally {
      setSaving(false)
    }
  }

  const selectedOpportunity = opportunities.find((o) => o.id === opportunityId)

  return (
    <Modal open={open} onClose={onClose} title={editQuote ? 'Editar Cotización' : 'Nueva Cotización'} className="modal-wide">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        {/* Quote Number */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NÚMERO DE COTIZACIÓN *</label>
          <Input
            value={quoteNumber}
            onChange={(e) => setQuoteNumber(e.target.value)}
            placeholder="Q-2026-0001"
            required
          />
        </div>

        {/* Opportunity */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>OPORTUNIDAD *</label>
          <select
            className="input select text-xs"
            value={opportunityId}
            onChange={(e) => setOpportunityId(parseInt(e.target.value, 10))}
            disabled={loadingOpps || !!preselectedOpportunityId}
            required
          >
            <option value={0}>Seleccionar oportunidad...</option>
            {loadingOpps && <option disabled>Cargando...</option>}
            {opportunities.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {opp.title || opp.name} — {opp.account_name || `Cuenta #${opp.account_id}`}
              </option>
            ))}
          </select>
          {selectedOpportunity && selectedOpportunity.items && (
            <span className="text-[0.6rem] mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
              {selectedOpportunity.items.length} ítem(s) en la oportunidad
            </span>
          )}
        </div>

        {/* Status (only for edit) */}
        {editQuote && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>ESTADO</label>
            <select
              className="input select text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            >
              <option value="draft">Borrador</option>
              <option value="sent">Enviada</option>
              <option value="accepted">Aceptada</option>
              <option value="rejected">Rechazada</option>
            </select>
          </div>
        )}

        {/* Line Items Editor */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            PRODUCTOS / SERVICIOS
          </label>
          <QuoteLineItemsEditor items={items} onChange={setItems} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="spinner" />
                Guardando...
              </span>
            ) : (
              editQuote ? 'Actualizar Cotización' : 'Crear Cotización'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
