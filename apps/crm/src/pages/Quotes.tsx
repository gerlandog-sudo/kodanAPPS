import { useEffect, useState } from 'react'
import { Button, Modal, Input, Table, ConfirmDialog } from '@kodan-apps/ui-core'
import { Plus, FileText, FileSpreadsheet, Search } from 'lucide-react'
import { toast } from 'sonner'
import { crmApi } from '../api/client'
import { QuoteStatusBadge } from '../components/quotes/QuoteStatusBadge'
import { QuoteLineItemsEditor } from '../components/quotes/QuoteLineItemsEditor'
import { QuoteDetailPanel } from '../components/quotes/QuoteDetailPanel'
import type { Quote, QuoteLineItem, QuoteStatus } from '../types/admin'

// ─── QuoteEditorModal ──────────────────────────────────────────

interface QuoteEditorModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editQuote: Quote | null
  preselectedOpportunityId?: number | null
}

function QuoteEditorModal({ open, onClose, onSaved, editQuote, preselectedOpportunityId }: QuoteEditorModalProps) {
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
    <Modal open={open} onClose={onClose} title={editQuote ? 'Editar Cotización' : 'Nueva Cotización'}>
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

// ─── Quotes List Page ───────────────────────────────────────────

export function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dropdown for "Nueva Cotización"
  const [showNewDropdown, setShowNewDropdown] = useState(false)

  // Create / Edit modal
  const [editorOpen, setEditorOpen] = useState(false)
  const [editQuote, setEditQuote] = useState<Quote | null>(null)
  const [preselectedOppId, setPreselectedOppId] = useState<number | null>(null)

  // Detail slide panel
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailQuoteId, setDetailQuoteId] = useState<number | null>(null)

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)

  // Filters
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadQuotes()

    // Check if we navigated here from Negotiations with a preselected opportunity
    const preselectedId = sessionStorage.getItem('preselectOpportunityId')
    if (preselectedId) {
      sessionStorage.removeItem('preselectOpportunityId')
      const oppId = parseInt(preselectedId, 10)
      if (!isNaN(oppId) && oppId > 0) {
        setEditQuote(null)
        setPreselectedOppId(oppId)
        setEditorOpen(true)
      }
    }
  }, [])

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const data = await crmApi.listQuotes()
      setQuotes(data)
    } catch {
      toast.error('Error al cargar cotizaciones.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setShowNewDropdown(false)
    setEditQuote(null)
    setPreselectedOppId(null)
    setEditorOpen(true)
  }

  const handleOpenCreateFromOpportunity = () => {
    setShowNewDropdown(false)
    setEditQuote(null)
    setPreselectedOppId(null)
    // Opens modal with opportunity dropdown focused on selection
    setEditorOpen(true)
  }

  const handleOpenEdit = (quote: Quote) => {
    setEditQuote(quote)
    setPreselectedOppId(null)
    setEditorOpen(true)
  }

  const handleRowClick = (quote: Quote) => {
    setDetailQuoteId(quote.id)
    setDetailOpen(true)
  }

  const handleDeleteClick = (quote: Quote) => {
    setQuoteToDelete(quote)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return
    try {
      await crmApi.deleteQuote(quoteToDelete.id)
      toast.success('Cotización eliminada.')
      loadQuotes()
    } catch {
      toast.error('Error al eliminar cotización.')
    } finally {
      setDeleteConfirmOpen(false)
      setQuoteToDelete(null)
    }
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(String(val)) || 0)
  }

  const filteredQuotes = search
    ? quotes.filter(
        (q) =>
          q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
          q.opportunity_title?.toLowerCase().includes(search.toLowerCase()) ||
          q.account_name?.toLowerCase().includes(search.toLowerCase())
      )
    : quotes

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Buscar cotización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <Button className="btn-primary" onClick={() => setShowNewDropdown(!showNewDropdown)}>
              <Plus size={16} /> Nueva Cotización
            </Button>
            {showNewDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewDropdown(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-lg shadow-lg py-1"
                  style={{ background: 'var(--sys-bg-card)', border: '1px solid var(--sys-border-soft)' }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--sys-hover)] transition-colors"
                    onClick={handleOpenCreate}
                  >
                    <FileSpreadsheet size={14} />
                    En blanco
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--sys-hover)] transition-colors"
                    onClick={handleOpenCreateFromOpportunity}
                  >
                    <FileText size={14} />
                    Desde oportunidad
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <Table
          data={filteredQuotes}
          columns={[
            {
              key: 'quote_number',
              header: 'Cotización',
              render: (q: any) => (
                <span className="font-semibold text-sm">{q.quote_number}</span>
              ),
            },
            {
              key: 'opportunity',
              header: 'Oportunidad',
              render: (q: any) => (
                <span className="text-xs">{q.opportunity_title || `#${q.opportunity_id}`}</span>
              ),
            },
            {
              key: 'account',
              header: 'Cliente',
              render: (q: any) => (
                <span className="text-xs">{q.account_name || '—'}</span>
              ),
            },
            {
              key: 'total_amount',
              header: 'Total',
              align: 'right',
              render: (q: any) => (
                <span className="font-semibold text-sm">{formatCurrency(q.total_amount)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (q: any) => (
                <QuoteStatusBadge status={q.status} size="sm" />
              ),
            },
            {
              key: 'created_at',
              header: 'Fecha',
              render: (q: any) => (
                <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  {new Date(q.created_at).toLocaleDateString('es-AR')}
                </span>
              ),
            },
          ]}
          keyExtractor={(q: any) => q.id}
          loading={loading}
          emptyState={{
            icon: <FileText size={40} />,
            title: 'No hay cotizaciones registradas',
            description: 'Creá tu primera cotización desde una oportunidad o en blanco.',
          }}
          editable={{ onClick: (q: any) => handleOpenEdit(q) }}
          deletable={{ onClick: (q: any) => handleDeleteClick(q) }}
          onRowClick={(q: any) => handleRowClick(q)}
          pageSize={15}
        />
      </div>

      {/* Editor Modal */}
      <QuoteEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setEditQuote(null)
          setPreselectedOppId(null)
        }}
        onSaved={loadQuotes}
        editQuote={editQuote}
        preselectedOpportunityId={preselectedOppId}
      />

      {/* Detail Slide Panel */}
      <QuoteDetailPanel
        open={detailOpen}
        quoteId={detailQuoteId}
        onClose={() => {
          setDetailOpen(false)
          setDetailQuoteId(null)
        }}
        onUpdated={loadQuotes}
        onEdit={(quote) => {
          setDetailOpen(false)
          setDetailQuoteId(null)
          handleOpenEdit(quote)
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar cotización"
        message="¿Está seguro de eliminar esta cotización? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
