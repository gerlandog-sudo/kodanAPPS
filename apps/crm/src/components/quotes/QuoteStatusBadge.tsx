import type { QuoteStatus } from '../../types/admin'

const statusConfig: Record<QuoteStatus, { label: string; bg: string; color: string; dot: string }> = {
  draft: {
    label: 'Borrador',
    bg: 'color-mix(in srgb, var(--sys-text-muted) 12%, transparent)',
    color: 'var(--sys-text-muted)',
    dot: 'var(--sys-text-muted)',
  },
  sent: {
    label: 'Enviada',
    bg: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)',
    color: 'var(--sys-primary)',
    dot: 'var(--sys-primary)',
  },
  accepted: {
    label: 'Aceptada',
    bg: 'color-mix(in srgb, var(--sys-success) 12%, transparent)',
    color: 'var(--sys-success)',
    dot: 'var(--sys-success)',
  },
  rejected: {
    label: 'Rechazada',
    bg: 'color-mix(in srgb, var(--sys-error) 12%, transparent)',
    color: 'var(--sys-error)',
    dot: 'var(--sys-error)',
  },
}

interface QuoteStatusBadgeProps {
  status: QuoteStatus
  size?: 'sm' | 'md'
}

export function QuoteStatusBadge({ status, size = 'md' }: QuoteStatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.draft
  const dotSize = size === 'sm' ? 6 : 8
  const fontSize = size === 'sm' ? '0.65rem' : '0.7rem'
  const px = size === 'sm' ? '0.4rem' : '0.55rem'
  const py = size === 'sm' ? '0.15rem' : '0.25rem'

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider"
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize,
        padding: `${py} ${px}`,
        lineHeight: 1.2,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          width: dotSize,
          height: dotSize,
          background: cfg.dot,
        }}
      />
      {cfg.label}
    </span>
  )
}
