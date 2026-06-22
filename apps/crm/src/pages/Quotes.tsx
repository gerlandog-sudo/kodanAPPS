import { useEffect, useState } from 'react'
import { Button, Table, ConfirmDialog } from '@kodan-apps/ui-core'
import { Plus, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { crmApi } from '../api/client'
import { QuoteStatusBadge } from '../components/quotes/QuoteStatusBadge'
import { QuoteEditorModal } from '../components/quotes/QuoteEditorModal'
import { QuoteDetailPanel } from '../components/quotes/QuoteDetailPanel'
import type { Quote } from '../types/admin'

// ─── Quotes List Page ───────────────────────────────────────────

export function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    setEditQuote(null)
    setPreselectedOppId(null)
    setEditorOpen(true)
  }

  const handleOpenEdit = async (quote: Quote) => {
    setEditQuote(quote)
    setPreselectedOppId(null)
    setEditorOpen(true)
    // Cargar cotización completa con ítems
    try {
      const full = await crmApi.getQuote(quote.id)
      if (full && full.items) {
        setEditQuote(full as Quote)
      }
    } catch {
      // fallback: usar datos de la lista (sin items)
    }
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
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 pl-9 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              placeholder="Buscar cotización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Nueva Cotización
          </Button>
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
            description: 'Creá tu primera cotización desde una negociación.',
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
