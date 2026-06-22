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
  quoteTotal?: number
  ownerName?: string
  ownerAvatar?: string | null
  stageColor?: string
  isDropped?: boolean
  selected?: boolean
  onClick?: () => void
  onChat?: () => void
  onCheck?: () => void
  onClone?: () => void
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
  lineItemsCount, quoteTotal, ownerName, ownerAvatar, isDropped, selected,
  onClick, onChat, onCheck, onClone, onEdit, onDelete,
}: EntityCardProps) {
  const hasActions = !!(onChat || onEdit || onDelete || onCheck || onClone)

  return (
    <div
      onClick={onClick}
      className={`group ${isDropped ? 'animate-drop-shake' : ''}`}
      style={{
        padding: '1.25rem 0.875rem',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: '0',
        borderRadius: '0.5rem',
        border: selected ? '2px solid var(--sys-primary)' : '1px solid var(--sys-border-soft)',
        background: selected 
          ? 'color-mix(in srgb, var(--sys-primary-container) 10%, var(--sys-surface-raised))'
          : 'color-mix(in srgb, var(--sys-surface) 80%, transparent)',
        userSelect: 'none',
        transition: 'all 300ms ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        if (!selected) {
          el.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 45%, var(--sys-border-soft))'
          el.style.background = 'var(--sys-surface)'
        } else {
          el.style.borderColor = 'var(--sys-primary)'
        }
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = selected ? 'var(--sys-primary)' : 'var(--sys-border-soft)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.background = selected 
          ? 'color-mix(in srgb, var(--sys-primary-container) 10%, var(--sys-surface-raised))'
          : 'color-mix(in srgb, var(--sys-surface) 80%, transparent)'
      }}
    >
      {/* Línea 1: Estimado (izq) + badge (der) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '1.75rem', marginBottom: '0.5rem' }}>
        {amount != null && (
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--sys-text-muted)', textTransform: 'uppercase' }}>
            Estimado
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto' }}>
          {badge}
          {amount != null && (
            <span style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em',
              padding: '0.125rem 0.625rem', borderRadius: '0.25rem',
              border: '1px solid color-mix(in srgb, var(--sys-primary) 30%, transparent)',
              color: 'var(--sys-primary)',
              background: 'color-mix(in srgb, var(--sys-primary) 5%, transparent)',
              textTransform: 'uppercase', fontFamily: 'monospace',
              userSelect: 'none', lineHeight: 1.4,
            }}>
              $ {Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Línea 2: Nombre */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h4 style={{
          margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.015em',
          color: 'var(--sys-text)', lineHeight: 1.25, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-hanken-grotesk, system-ui)',
        }}>
          {title}
        </h4>
      </div>

      {/* Línea 3: Empresa */}
      {accountName && (
        <div style={{ marginBottom: '0.625rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '12px', color: 'var(--sys-text-muted)',
            fontFamily: 'var(--font-hanken-grotesk, system-ui)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{accountName}</span>
          </span>
        </div>
      )}

      {/* Línea 4: Fecha inicio */}
      {startDate && (
        <div style={{ marginBottom: '0.375rem', fontSize: '11px', fontFamily: 'var(--font-hanken-grotesk, system-ui)', color: 'var(--sys-text-muted)' }}>
          Inicio: <span style={{ color: 'var(--sys-text)' }}>{formatDate(startDate)}</span>
        </div>
      )}

      {/* Línea 5: Fecha cierre */}
      {closeDate && (
        <div style={{ marginBottom: '0.5rem', fontSize: '11px', fontFamily: 'var(--font-hanken-grotesk, system-ui)', color: 'var(--sys-text-muted)' }}>
          Cierre: <span style={{ color: 'var(--sys-primary)', fontWeight: 700 }}>{formatDate(closeDate)}</span>
        </div>
      )}

      {/* Línea 6: Cant Productos + Total Cotización (alineado a la derecha) */}
      {(lineItemsCount != null || quoteTotal != null) && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', userSelect: 'none' }}>
          {lineItemsCount != null && (
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-hanken-grotesk, system-ui)', color: 'var(--sys-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>Productos:</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                title={lineItemsCount === 0 ? 'Sin productos cotizados' : `${lineItemsCount} productos cotizados`}
                style={{
                  width: '2.5rem', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                  borderRadius: '0.25rem', border: '1px solid var(--sys-border-soft)',
                  background: 'color-mix(in srgb, var(--sys-bg) 85%, transparent)',
                  cursor: 'pointer', fontFamily: 'var(--font-hanken-grotesk, system-ui)',
                  fontSize: '10px', color: 'var(--sys-text-muted)',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--sys-surface)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 45%, var(--sys-border-soft))'; e.currentTarget.style.color = 'var(--sys-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--sys-bg) 85%, transparent)'; e.currentTarget.style.borderColor = 'var(--sys-border-soft)'; e.currentTarget.style.color = 'var(--sys-text-muted)' }}
              >
                <span style={{ fontWeight: 700 }}>{lineItemsCount}</span>
              </button>
            </div>
          )}
          {quoteTotal != null && quoteTotal > 0 && (
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-hanken-grotesk, system-ui)', color: 'var(--sys-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>Valor Cotización:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '11px', color: 'var(--sys-primary)' }}>
                $ {Number(quoteTotal).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Línea 7: Dueño */}
      {ownerName && (
        <div style={{
          paddingTop: '0.75rem', borderTop: '1px solid color-mix(in srgb, var(--sys-border-soft) 40%, transparent)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {ownerAvatar ? (
            <img src={ownerAvatar} alt={ownerName}
              style={{ width: '1.5rem', height: '1.5rem', borderRadius: '999px', objectFit: 'cover', border: '1px solid var(--sys-border-soft)', flexShrink: 0 }} />
          ) : (
          <div style={{
              width: '1.5rem', height: '1.5rem', borderRadius: '999px',
              background: 'color-mix(in srgb, var(--sys-primary) 25%, transparent)',
              border: '1px solid color-mix(in srgb, var(--sys-primary) 45%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: 'var(--sys-primary)', flexShrink: 0,
              userSelect: 'none',
            }}>
              {getInitials(ownerName)}
            </div>
          )}
          <span style={{
            fontSize: '11px', fontWeight: 500, color: 'var(--sys-text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-hanken-grotesk, system-ui)',
          }}>
            {ownerName}
          </span>
        </div>
      )}

      {/* Línea 8: Acciones (chat, edit, delete) */}
      {hasActions && (
        <div className="entity-card-actions" style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          paddingTop: '0.75rem', borderTop: '1px solid color-mix(in srgb, var(--sys-border-soft) 40%, transparent)',
          marginTop: '0.5rem', justifyContent: 'flex-end',
        }}>
          {onChat && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onChat() }}
              title="Abrir Mensajería de Oportunidad"
              style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text-muted)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--sys-primary)'; b.style.background = 'color-mix(in srgb, var(--sys-primary) 10%, transparent)'; b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 30%, transparent)' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--sys-text-muted)'; b.style.background = 'var(--sys-bg)'; b.style.borderColor = 'var(--sys-border-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}
          {onCheck && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onCheck() }}
              title="Motivos de Ganada/Perdida"
              style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text-muted)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--sys-primary)'; b.style.background = 'color-mix(in srgb, var(--sys-primary) 10%, transparent)'; b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 30%, transparent)' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--sys-text-muted)'; b.style.background = 'var(--sys-bg)'; b.style.borderColor = 'var(--sys-border-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          )}
          {onClone && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onClone() }}
              title="Clonar Canal"
              style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text-muted)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--sys-primary)'; b.style.background = 'color-mix(in srgb, var(--sys-primary) 10%, transparent)'; b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 30%, transparent)' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--sys-text-muted)'; b.style.background = 'var(--sys-bg)'; b.style.borderColor = 'var(--sys-border-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Ver/Editar"
              style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text-muted)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--sys-primary)'; b.style.background = 'color-mix(in srgb, var(--sys-primary) 10%, transparent)'; b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 30%, transparent)' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--sys-text-muted)'; b.style.background = 'var(--sys-bg)'; b.style.borderColor = 'var(--sys-border-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }}
              title="Eliminar"
              style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text-muted)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--sys-error)'; b.style.background = 'color-mix(in srgb, var(--sys-error) 10%, transparent)'; b.style.borderColor = 'color-mix(in srgb, var(--sys-error) 30%, transparent)' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--sys-text-muted)'; b.style.background = 'var(--sys-bg)'; b.style.borderColor = 'var(--sys-border-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
