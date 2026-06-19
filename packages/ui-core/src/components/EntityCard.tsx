import type { ReactNode } from 'react'

export interface EntityCardProps {
  title: string
  icon?: ReactNode
  amount?: number
  badge?: ReactNode
  accountName?: string
  startDate?: string
  closeDate?: string
  lineItemsCount?: number
  ownerName?: string
  ownerAvatar?: string | null
  stageColor?: string
  isDropped?: boolean
  onClick?: () => void
  onChat?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const transition = 'all 250ms cubic-bezier(0.32, 0.72, 0, 1)'

export function EntityCard({
  title,
  icon,
  amount,
  badge,
  accountName,
  startDate,
  closeDate,
  lineItemsCount,
  ownerName,
  ownerAvatar,
  stageColor,
  isDropped,
  onClick,
  onChat,
  onEdit,
  onDelete,
}: EntityCardProps) {
  const hasActions = !!(onChat || onEdit || onDelete)

  return (
    <div
      onClick={onClick}
      className={isDropped ? 'animate-drop-shake' : ''}
      style={{
        padding: '0.75rem',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--sys-border-soft)',
        background: 'var(--sys-surface-raised)',
        userSelect: 'none',
        transition,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(1.02)'
        el.style.boxShadow = '0 8px 25px -6px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.06)'
        if (stageColor) el.style.borderLeftColor = stageColor
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(1)'
        el.style.boxShadow = 'none'
        if (stageColor) el.style.borderLeftColor = 'var(--sys-border-soft)'
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
    >
      {/* Top row: badge + actions */}
      {(amount != null || badge || hasActions) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: 1, minWidth: 0 }}>
            {icon && (
              <div style={{
                padding: '0.375rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--sys-border-soft)',
                display: 'flex',
                flexShrink: 0,
                color: 'var(--sys-text-muted)',
                background: 'transparent',
              }}>
                {icon}
              </div>
            )}
              {(amount != null) && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.625rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                opacity: 0.65,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'color-mix(in srgb, var(--sys-primary-container) 60%, transparent)',
                color: 'var(--color-on-primary-container)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {formatCurrency(amount)}
              </span>
            )}
            {badge && <span>{badge}</span>}
          </div>
          {hasActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flexShrink: 0 }}>
              {onChat && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChat() }}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition,
                  }}
                  className="entity-action-btn"
                  aria-label="Comentarios"
                  title="Comentarios"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition,
                  }}
                  className="entity-action-btn"
                  aria-label="Editar"
                  title="Editar"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition,
                  }}
                  className="entity-action-btn entity-action-btn-danger"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h4 style={{
        margin: 0,
        fontSize: '0.8125rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: 'var(--sys-text)',
        lineHeight: 1.3,
      }}>
        {title}
      </h4>

      {/* Account name */}
      {accountName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{accountName}</span>
        </div>
      )}

      {/* Dates */}
      {(startDate || closeDate) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>
          {startDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span><span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Inicio</span> · {formatDate(startDate)}</span>
            </div>
          )}
          {closeDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14l.01 0"/></svg>
              <span><span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cierre</span> · {formatDate(closeDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Line items */}
      {lineItemsCount != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><path d="M16.5 9.4 7.55 4.24a1 1 0 0 0-1.1 0L2.4 6.6"/><polyline points="21 16 8 22 3 19.5 3 8.5 8 5.5 16 9.5 21 6.5 21 16 16 19.5 16 9.5"/><line x1="16" y1="19.5" x2="16" y2="9.5"/><line x1="21" y1="6.5" x2="21" y2="16"/></svg>
          <span style={{ fontWeight: 500 }}>{lineItemsCount} {lineItemsCount === 1 ? 'producto' : 'productos'}</span>
        </div>
      )}

      {/* Owner */}
      {ownerName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'var(--sys-text-muted)' }}>
          <div
            style={{
              width: '1.375rem',
              height: '1.375rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.5rem',
              fontWeight: 700,
              flexShrink: 0,
              overflow: 'hidden',
              transition,
            }}
            className="entity-avatar"
          >
            {ownerAvatar ? (
              <img src={ownerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ background: 'var(--sys-primary-container)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-primary-container)' }}>
                {getInitials(ownerName)}
              </span>
            )}
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={ownerName}>
            {ownerName}
          </span>
        </div>
      )}
    </div>
  )
}
