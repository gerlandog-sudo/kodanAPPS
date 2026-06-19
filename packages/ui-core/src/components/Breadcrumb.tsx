import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: ReactNode
}

export function Breadcrumb({ items, separator = <ChevronRight size={12} /> }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {i > 0 && (
              <span style={{ color: 'var(--sys-text-muted)', display: 'flex' }}>
                {separator}
              </span>
            )}
            {isLast || !item.onClick ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: isLast ? 600 : 400,
                  color: isLast ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                  cursor: isLast ? 'default' : 'pointer',
                }}
              >
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 400,
                  color: 'var(--sys-text-muted)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
