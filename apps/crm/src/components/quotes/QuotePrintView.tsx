import { useEffect, useState } from 'react'
import { formatCurrency } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import { QuoteStatusBadge } from './QuoteStatusBadge'
import type { Quote, QuoteLineItem } from '../../types/admin'

interface QuotePrintViewProps {
  quoteId: number | null
}

export function QuotePrintView({ quoteId }: QuotePrintViewProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!quoteId) {
      setError('ID de cotización no proporcionado.')
      setLoading(false)
      return
    }
    crmApi.getQuote(quoteId)
      .then((data) => setQuote(data))
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false))
  }, [quoteId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: 'var(--sys-error)' }}>{error || 'Cotización no encontrada'}</p>
      </div>
    )
  }


  const lineTotal = (item: QuoteLineItem): number => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const disc = Number(item.discount_percentage) || 0
    const tax = Number(item.tax_percentage) || 0
    return qty * price * (1 - disc / 100) * (1 + tax / 100)
  }

  const lineSubtotal = (item: QuoteLineItem): number => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return qty * price
  }

  const items = (quote.items as QuoteLineItem[]) || []
  const totalAmount = parseFloat(quote.total_amount) || items.reduce((sum, it) => sum + lineTotal(it), 0)

  return (
    <div className="print-view">
      {/* Print controls — hidden on print */}
      <div className="no-print flex justify-center gap-4 p-4" style={{ background: 'var(--sys-bg-card)', borderBottom: '1px solid var(--sys-border-soft)' }}>
        <button
          className="bg-primary text-on-primary border-none px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.95] transition-all"
          onClick={() => window.print()}
        >
          Imprimir / Guardar PDF
        </button>
        <button
          className="bg-surface-raised text-text-muted border border-border-soft px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-surface-hover transition-all"
          onClick={() => window.close()}
        >
          Cerrar
        </button>
      </div>

      {/* A4 content */}
      <div className="print-page">
        {/* Header */}
        <div className="print-header">
          <div>
            <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
              Emitida: {new Date(quote.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="text-right">
            <QuoteStatusBadge status={quote.status} />
          </div>
        </div>

        {/* Company & Client */}
        <div className="print-info-grid">
          <div>
            <h3 className="print-label">EMPRESA</h3>
            <p className="print-value">kodanAPPS S.A.</p>
            <p className="print-value">CUIT: 30-12345678-9</p>
            <p className="print-value">Av. Ejemplo 1234, CABA</p>
          </div>
          <div className="text-right">
            <h3 className="print-label">CLIENTE</h3>
            <p className="print-value">{quote.account_name || '—'}</p>
            <p className="print-value">Oportunidad: {quote.opportunity_title || `#${quote.opportunity_id}`}</p>
          </div>
        </div>

        {/* Items table */}
        <table className="print-table">
          <thead>
            <tr>
              <th className="text-left">Producto / Servicio</th>
              <th className="text-right">Cant.</th>
              <th className="text-right">P. Unit.</th>
              <th className="text-right">Dto. %</th>
              <th className="text-right">IVA %</th>
              <th className="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product_id}>
                <td>
                  <span className="font-medium">{item.product_name || `Producto #${item.product_id}`}</span>
                  {item.product_sku && <span className="print-sku">SKU: {item.product_sku}</span>}
                </td>
                <td className="text-right">{Number(item.quantity)}</td>
                <td className="text-right">{formatCurrency(Number(item.unit_price))}</td>
                <td className="text-right">{Number(item.discount_percentage)}%</td>
                <td className="text-right">{Number(item.tax_percentage)}%</td>
                <td className="text-right font-bold">{formatCurrency(lineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} />
              <td className="text-right font-semibold">Subtotal</td>
              <td className="text-right">{formatCurrency(items.reduce((s, it) => s + lineSubtotal(it), 0))}</td>
            </tr>
            <tr>
              <td colSpan={4} />
              <td className="text-right font-bold text-base">Total</td>
              <td className="text-right font-bold text-base">{formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Terms */}
        <div className="print-terms">
          <h3 className="print-label">TÉRMINOS Y CONDICIONES</h3>
          <p className="text-xs">
            Esta cotización tiene una validez de 15 días hábiles a partir de la fecha de emisión.
            Los precios incluyen IVA cuando corresponda.
            El pago se realizará según lo acordado entre las partes.
          </p>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <p>kodanAPPS © {new Date().getFullYear()} — Documento generado electrónicamente</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .print-page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.5;
            color: #1a1a1a;
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e5e7eb;
          }
          .print-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
          .print-label {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .print-value {
            font-size: 11px;
            color: #1a1a1a;
            margin: 0;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .print-table th {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #6b7280;
            padding: 8px 6px;
            border-bottom: 2px solid #e5e7eb;
          }
          .print-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
          }
          .print-table tfoot td {
            border-bottom: none;
            padding-top: 12px;
          }
          .print-sku {
            display: block;
            font-size: 9px;
            color: #6b7280;
          }
          .print-terms {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          .print-footer {
            margin-top: 48px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
          }
          @page {
            margin: 0;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  )
}
