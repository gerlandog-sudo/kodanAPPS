import type { ReactNode } from 'react'

export interface EntityCardProps {
  icon: ReactNode
  title: string
  description?: string
  badge?: ReactNode
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

export function EntityCard({ icon, title, description, badge, selected, onSelect, disabled }: EntityCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="entity-card"
      aria-pressed={selected}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        border: `1px solid ${selected ? 'var(--sys-primary)' : 'var(--sys-border-soft)'}`,
        background: selected ? 'var(--sys-surface-hover)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
        width: '100%',
        transition: 'all 200ms ease',
      }}
    >
      <div
        style={{
          padding: '0.375rem',
          borderRadius: '0.5rem',
          border: `1px solid ${selected ? 'var(--sys-primary-soft)' : 'var(--sys-border-soft)'}`,
          display: 'flex',
          flexShrink: 0,
          color: selected ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
          background: selected ? 'var(--sys-surface-raised)' : 'transparent',
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: selected ? 'var(--sys-primary)' : 'var(--sys-text)',
            }}
          >
            {title}
          </span>
          {badge && <span>{badge}</span>}
        </div>
        {description && (
          <p
            style={{
              margin: '0.125rem 0 0 0',
              fontSize: '0.5625rem',
              color: 'var(--sys-text-muted)',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </button>
  )
}
