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

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function EntityCard({
  title, amount, badge, accountName, startDate, closeDate,
  lineItemsCount, ownerName, ownerAvatar, stageColor, isDropped,
  onClick, onChat, onEdit, onDelete,
}: EntityCardProps) {
  const hasActions = !!(onChat || onEdit || onDelete)

  return (
    <div
      onClick={onClick}
      className={isDropped ? 'animate-drop-shake' : ''}
      style={{
        padding: '0.875rem 0.75rem',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: '0.625rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--sys-border-soft)',
        background: 'var(--sys-surface-raised)',
        userSelect: 'none',
        transition: 'all 200ms ease',
        position: 'relative',
        borderLeft: `3px solid ${stageColor || 'var(--sys-border-soft)'}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 10px -4px rgba(0,0,0,0.06)'
        el.style.borderColor = 'var(--sys-border-hover, rgba(139,92,246,0.45))'
        el.style.borderLeftColor = stageColor || 'var(--sys-primary)'
        el.querySelector('.entity-card-actions')?.classList.add('entity-card-actions-visible')
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.borderColor = 'var(--sys-border-soft)'
        el.style.borderLeftColor = stageColor || 'var(--sys-border-soft)'
        el.querySelector('.entity-card-actions')?.classList.remove('entity-card-actions-visible')
      }}
    >
      {/* Top row: amount badge + actions */}
      {(amount != null || badge || hasActions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', minHeight: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: 1, minWidth: 0 }}>
            {amount != null && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em',
                padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
                border: '1px solid var(--sys-primary-container)',
                color: 'var(--sys-primary)', background: 'transparent',
                fontFamily: 'monospace', whiteSpace: 'nowrap',
                lineHeight: '1.4',
              }}>
                $ {amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            {badge}
          </div>
          {hasActions && (
            <div className="entity-card-actions" style={{
              display: 'flex', alignItems: 'center', gap: '0.125rem',
              opacity: 0, transition: 'opacity 150ms ease',
            }}>
              {onChat && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onChat() }}
                  title="Comentarios" aria-label="Comentarios"
                  style={{
                    padding: '0.25rem', borderRadius: '0.375rem', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--sys-text-muted)', background: 'transparent',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--sys-primary)'; e.currentTarget.style.background = 'var(--sys-primary-container)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--sys-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              )}
              {onEdit && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onEdit() }}
                  title="Editar" aria-label="Editar"
                  style={{
                    padding: '0.25rem', borderRadius: '0.375rem', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--sys-text-muted)', background: 'transparent',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--sys-primary)'; e.currentTarget.style.background = 'var(--sys-primary-container)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--sys-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }}
                  title="Eliminar" aria-label="Eliminar"
                  style={{
                    padding: '0.25rem', borderRadius: '0.375rem', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--sys-text-muted)', background: 'transparent',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--sys-error)'; e.currentTarget.style.background = 'var(--sys-error-container)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--sys-text-muted)'; e.currentTarget.style.background = 'transparent' }}
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
        margin: 0, fontSize: '0.875rem', fontWeight: 700,
        letterSpacing: '-0.01em', color: 'var(--sys-text)', lineHeight: 1.3,
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
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.625rem', color: 'var(--sys-text-muted)' }}>
          {startDate && (
            <span>Inicio: <span style={{ fontWeight: 600 }}>{formatDate(startDate)}</span></span>
          )}
          {closeDate && (
            <span>Cierre: <span style={{ fontWeight: 600, color: 'var(--sys-primary)' }}>{formatDate(closeDate)}</span></span>
          )}
        </div>
      )}

      {/* Line items count badge */}
      {lineItemsCount != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.625rem', color: 'var(--sys-text-muted)' }}>
          <span style={{ fontWeight: 500 }}>Productos:</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.() }}
            title={lineItemsCount === 0 ? 'Sin productos' : `${lineItemsCount} productos`}
            style={{
              width: '2rem', height: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '0.25rem', border: '1px solid var(--sys-border-soft)',
              background: 'transparent', cursor: 'pointer',
              fontSize: '0.625rem', fontWeight: 700, color: lineItemsCount > 0 ? 'var(--sys-text)' : 'var(--sys-text-muted)',
              transition: 'all 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sys-primary)'; e.currentTarget.style.color = 'var(--sys-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sys-border-soft)'; e.currentTarget.style.color = lineItemsCount > 0 ? 'var(--sys-text)' : 'var(--sys-text-muted)' }}
          >{lineItemsCount}</button>
        </div>
      )}

      {/* Owner */}
      {ownerName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          paddingTop: '0.5rem', marginTop: 'auto',
          borderTop: '1px solid var(--sys-border-soft)',
        }}>
          <div style={{
            width: '1.375rem', height: '1.375rem', borderRadius: '999px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
            background: 'var(--sys-primary-container)', color: 'var(--sys-primary)',
            transition: 'all 200ms ease',
          }}>
            {ownerAvatar ? (
              <img src={ownerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(ownerName)
            )}
          </div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--sys-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ownerName}
          </span>
        </div>
      )}
    </div>
  )
}
