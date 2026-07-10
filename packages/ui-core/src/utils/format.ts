/**
 * Formateadores compartidos de la plataforma.
 * Centralizados para evitar definiciones duplicadas en cada app.
 */

/** Formatea un importe en pesos argentinos (ARS, es-AR). Por defecto 2 decimales. */
export function formatCurrency(value: number | string, maximumFractionDigits = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits,
  }).format(num)
}

/** Fecha larga en es-AR: "10 de julio de 2026". Devuelve "—" si está vacía/inválida. */
export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Fecha corta + hora en es-AR: "10/07 14:30". Devuelve "" si está vacía/inválida. */
export function formatDateTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
