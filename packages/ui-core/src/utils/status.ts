/**
 * Paleta de estados compartida de la plataforma.
 *
 * Única fuente de verdad para colores de estado (aprobación, ejecución,
 * tareas, etc.). Toda app (superadmin, tracker, crm y futuras) debe usar
 * `statusColor` / `statusBadgeClass` en lugar de hex o clases hardcodeadas,
 * para mantener semántica y tema consistentes.
 */

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

const TONE_COLOR: Record<StatusTone, string> = {
  success: 'var(--sys-success)',
  warning: '#F59E0B',
  error: 'var(--sys-error)',
  info: 'var(--sys-tertiary)',
  neutral: 'var(--sys-text-muted)',
  primary: 'var(--sys-primary)',
}

/** Mapeo de estados comunes a tono semántico. Extensible según nuevos dominios. */
const STATUS_TONE: Record<string, StatusTone> = {
  // Éxito
  approved: 'success',
  done: 'success',
  success: 'success',
  won: 'success',
  completed: 'success',
  active: 'success',
  // Error
  rejected: 'error',
  failed: 'error',
  lost: 'error',
  error: 'error',
  cancelled: 'error',
  canceled: 'error',
  // Advertencia
  pending: 'warning',
  in_progress: 'warning',
  partial: 'warning',
  // Informativo
  submitted: 'info',
  // Primario
  open: 'primary',
  todo: 'primary',
  // Neutro
  draft: 'neutral',
  archived: 'neutral',
}

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status] ?? 'neutral'
}

/** Color (token o hex) para el estado dado. */
export function statusColor(status: string, fallback = 'var(--sys-text-muted)'): string {
  return TONE_COLOR[statusTone(status)] ?? fallback
}

/** Clases Tailwind para un badge de estado (texto/fondo/borde con alpha). */
export function statusBadgeClass(status: string): string {
  const tone = statusTone(status)
  const map: Record<StatusTone, string> = {
    success: 'text-[var(--sys-success)] bg-[var(--sys-success)]/10 border-[var(--sys-success)]/20',
    warning: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
    error: 'text-[var(--sys-error)] bg-[var(--sys-error)]/10 border-[var(--sys-error)]/20',
    info: 'text-[var(--sys-tertiary)] bg-[var(--sys-tertiary)]/10 border-[var(--sys-tertiary)]/20',
    neutral: 'text-[var(--sys-text-muted)] bg-[var(--sys-text-muted)]/10 border-[var(--sys-border)]',
    primary: 'text-[var(--sys-primary)] bg-[var(--sys-primary)]/10 border-[var(--sys-primary)]/20',
  }
  return map[tone]
}
