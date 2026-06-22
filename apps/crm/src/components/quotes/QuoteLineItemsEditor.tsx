import { useEffect, useState } from 'react'
import { Button, Input } from '@kodan-apps/ui-core'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { crmApi } from '../../api/client'
import type { QuoteLineItem } from '../../types/admin'

export interface QuoteLineItemsEditorProps {
  items: QuoteLineItem[]
  onChange: (items: QuoteLineItem[]) => void
  readOnly?: boolean
}

interface ProductOption {
  id: number
  name: string
  sku: string | null
  price: string
}

export function QuoteLineItemsEditor({ items, onChange, readOnly }: QuoteLineItemsEditorProps) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    crmApi.listProducts().then((data) => {
      setProducts(data.filter((p: any) => p.is_active !== 0))
    }).catch(() => {
      // silently fail, show empty
    }).finally(() => setProductsLoading(false))
  }, [])

  const getProductPrice = (productId: number): number => {
    const p = products.find((x) => x.id === productId)
    return p ? parseFloat(p.price) || 0 : 0
  }

  const handleChange = (index: number, field: keyof QuoteLineItem, value: number | string) => {
    if (readOnly) return
    const next = items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: typeof value === 'string' ? value : value }

      // Auto-fill unit_price when selecting a product
      if (field === 'product_id') {
        const pid = typeof value === 'number' ? value : parseInt(String(value), 10)
        updated.unit_price = getProductPrice(pid)
      }

      return updated
    })
    onChange(next)
  }

  const handleDelete = (index: number) => {
    if (readOnly) return
    onChange(items.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    if (readOnly) return
    const firstProduct = products[0]
    onChange([
      ...items,
      {
        product_id: firstProduct?.id ?? 0,
        quantity: 1,
        unit_price: firstProduct ? parseFloat(firstProduct.price) || 0 : 0,
        discount_percentage: 0,
        tax_percentage: 21, // default IVA Argentina
      },
    ])
  }

  // Calculate line total
  const lineTotal = (item: QuoteLineItem): number => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const disc = Number(item.discount_percentage) || 0
    const tax = Number(item.tax_percentage) || 0
    return qty * price * (1 - disc / 100) * (1 + tax / 100)
  }

  const totals = items.reduce(
    (acc, item) => {
      const t = lineTotal(item)
      acc.subtotal += Number(item.quantity) * Number(item.unit_price)
      acc.total += t
      return acc
    },
    { subtotal: 0, total: 0 }
  )

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)
  }

  if (readOnly) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
              <th className="pb-2 pr-2">Producto</th>
              <th className="pb-2 pr-2 text-right">Cant.</th>
              <th className="pb-2 pr-2 text-right">P. Unit.</th>
              <th className="pb-2 pr-2 text-right">Dto. %</th>
              <th className="pb-2 pr-2 text-right">IVA %</th>
              <th className="pb-2 pr-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center" style={{ color: 'var(--sys-text-muted)' }}>
                  Sin ítems
                </td>
              </tr>
            )}
            {items.map((item, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <td className="py-2 pr-2">
                  <span className="font-medium">{item.product_name || `Producto #${item.product_id}`}</span>
                  {item.product_sku && <span className="ml-1" style={{ color: 'var(--sys-text-muted)' }}>({item.product_sku})</span>}
                </td>
                <td className="py-2 pr-2 text-right">{Number(item.quantity)}</td>
                <td className="py-2 pr-2 text-right">{formatCurrency(Number(item.unit_price))}</td>
                <td className="py-2 pr-2 text-right">{Number(item.discount_percentage)}%</td>
                <td className="py-2 pr-2 text-right">{Number(item.tax_percentage)}%</td>
                <td className="py-2 pr-2 text-right font-semibold">{formatCurrency(lineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
              <th className="pb-2 pr-2 min-w-[180px]">Producto</th>
              <th className="pb-2 pr-2 text-right w-[70px]">Cant.</th>
              <th className="pb-2 pr-2 text-right w-[110px]">P. Unit.</th>
              <th className="pb-2 pr-2 text-right w-[60px]">Dto. %</th>
              <th className="pb-2 pr-2 text-right w-[60px]">IVA %</th>
              <th className="pb-2 pr-2 text-right w-[100px]">Subtotal</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center" style={{ color: 'var(--sys-text-muted)' }}>
                  <AlertCircle size={16} className="inline mr-1" />
                  Agregá al menos un producto a la cotización
                </td>
              </tr>
            )}
            {items.map((item, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <td className="py-1.5 pr-2">
                  <select
                    className="input select text-xs w-full"
                    value={item.product_id}
                    onChange={(e) => handleChange(i, 'product_id', parseInt(e.target.value, 10))}
                    disabled={productsLoading}
                  >
                    {productsLoading && <option>Cargando...</option>}
                    {!productsLoading && products.length === 0 && <option value="">Sin productos</option>}
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleChange(i, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => handleChange(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.discount_percentage}
                    onChange={(e) => handleChange(i, 'discount_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.tax_percentage}
                    onChange={(e) => handleChange(i, 'tax_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold">
                  {formatCurrency(lineTotal(item))}
                </td>
                <td className="py-1.5">
                  <button
                    type="button"
                    className="p-1 rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                    style={{ color: 'var(--sys-error)' }}
                    onClick={() => handleDelete(i)}
                    title="Eliminar línea"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={handleAdd} className="text-xs gap-1">
          <Plus size={14} /> Agregar línea
        </Button>

        <div className="flex flex-col items-end gap-0.5 text-xs">
          <span style={{ color: 'var(--sys-text-muted)' }}>
            Subtotal: <strong style={{ color: 'var(--sys-text)' }}>{formatCurrency(totals.subtotal)}</strong>
          </span>
          <span className="text-sm font-bold">
            Total: <strong>{formatCurrency(totals.total)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
