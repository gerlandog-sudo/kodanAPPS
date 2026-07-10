import { useEffect, useState } from 'react'
import { SlidePanel, Button, ConfirmDialog, formatCurrency, formatDate } from '@kodan-apps/ui-core'
import { FileText, Send, CheckCircle, XCircle, Printer, Trash2, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { crmApi } from '../../api/client'
import { QuoteStatusBadge } from './QuoteStatusBadge'
import { QuoteLineItemsEditor } from './QuoteLineItemsEditor'
import type { Quote, QuoteLineItem, QuoteStatus } from '../../types/admin'

interface QuoteDetailPanelProps {
  open: boolean
  quoteId: number | null
  onClose: () => void
  onUpdated: () => void
  onEdit: (quote: Quote) => void
}

export function QuoteDetailPanel({ open, quoteId, onClose, onUpdated, onEdit }: QuoteDetailPanelProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState<QuoteStatus | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open || !quoteId) {
      setQuote(null)
      return
    }
    setLoading(true)
    crmApi.getQuote(quoteId)
      .then((data) => setQuote(data))
      .catch(() => toast.error('Error al cargar cotización'))
      .finally(() => setLoading(false))
  }, [open, quoteId])

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return
    setStatusLoading(newStatus)
    try {
      await crmApi.updateQuote(quote.id, { status: newStatus })
      toast.success(`Cotización ${newStatus === 'sent' ? 'enviada' : newStatus === 'accepted' ? 'aceptada' : 'rechazada'}`)
      setQuote((prev) => prev ? { ...prev, status: newStatus } : prev)
      onUpdated()
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar estado')
    } finally {
      setStatusLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!quote) return
    try {
      await crmApi.deleteQuote(quote.id)
      toast.success('Cotización eliminada')
      setDeleteConfirmOpen(false)
      onClose()
      onUpdated()
    } catch {
      toast.error('Error al eliminar cotización')
    }
  }

  const handlePrint = () => {
    if (!quote) return
    const url = `/quotes/${quote.id}/print`
    window.open(url, '_blank', 'noopener,noreferrer')
  }


  return (
    <>
      <SlidePanel open={open} onClose={onClose} title="" width="52rem">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="size-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !quote && (
          <div className="text-center py-20" style={{ color: 'var(--sys-text-muted)' }}>
            Cotización no encontrada
          </div>
        )}

        {!loading && quote && (
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <FileText size={18} style={{ color: 'var(--sys-primary)' }} />
                  <h2 className="text-lg font-bold" style={{ color: 'var(--sys-text)' }}>
                    {quote.quote_number}
                  </h2>
                </div>
                <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  Creada el {formatDate(quote.created_at)}
                </p>
              </div>
              <QuoteStatusBadge status={quote.status} />
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-bg-card) 50%, transparent)', border: '1px solid var(--sys-border-soft)' }}>
              <div className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Oportunidad</span>
                <span className="text-sm font-medium">{quote.opportunity_title || `#${quote.opportunity_id}`}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Cliente</span>
                <span className="text-sm font-medium">{quote.account_name || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Total</span>
                <span className="text-lg font-bold" style={{ color: 'var(--sys-primary)' }}>{formatCurrency(quote.total_amount)}</span>
              </div>
            </div>

            {/* Items (read-only) */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
                Productos / Servicios ({quote.items?.length ?? 0})
              </h3>
              <QuoteLineItemsEditor
                items={quote.items as QuoteLineItem[] || []}
                onChange={() => {}}
                readOnly
              />
            </div>

            {/* Status Actions */}
            {quote.status === 'draft' && (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--sys-primary) 15%, transparent)' }}>
                <span className="text-xs font-semibold w-full" style={{ color: 'var(--sys-primary)' }}>Acciones de estado</span>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('sent')}
                  disabled={statusLoading !== null}
                  className="gap-1"
                >
                  {statusLoading === 'sent' ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Send size={14} />}
                  Marcar como Enviada
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onEdit(quote)}
                  className="gap-1"
                >
                  <Edit3 size={14} /> Editar
                </Button>
              </div>
            )}
            {quote.status === 'sent' && (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--sys-primary) 15%, transparent)' }}>
                <span className="text-xs font-semibold w-full" style={{ color: 'var(--sys-primary)' }}>Acciones de estado</span>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('accepted')}
                  disabled={statusLoading !== null}
                  className="gap-1"
                >
                  {statusLoading === 'accepted' ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <CheckCircle size={14} />}
                  Marcar como Aceptada
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={statusLoading !== null}
                  className="gap-1"
                >
                  {statusLoading === 'rejected' ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <XCircle size={14} />}
                  Marcar como Rechazada
                </Button>
              </div>
            )}

            {/* Utility actions */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="ghost" onClick={handlePrint} className="gap-1">
                <Printer size={14} /> Imprimir / PDF
              </Button>
              <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)} className="gap-1">
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar cotización"
        message="¿Está seguro de eliminar esta cotización? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
