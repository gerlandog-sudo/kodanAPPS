import type { ReactNode } from 'react'

export interface AdminSection {
  key: string
  label: string
  icon: ReactNode
  count?: number
  href: string
}

export interface AdminLayoutProps {
  sections: AdminSection[]
  activeSection: string
  onNavigate: (section: string, detailId?: string) => void
  children: ReactNode
}

export function AdminLayout({ sections, activeSection, onNavigate, children }: AdminLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '72vh', fontFamily: 'var(--font-montserrat, system-ui)', fontSize: '0.8125rem' }}>
      <nav aria-label="Secciones de configuración"
        style={{
          width: '13rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem',
          paddingRight: '1.5rem', borderRight: '1px solid var(--sys-border-soft)',
        }}
      >
        <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sys-text-muted)', padding: '0 0.75rem 0.75rem', marginTop: '0.25rem' }}>
          Ajustes
        </span>
        {sections.map(section => {
          const isActive = section.key === activeSection
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onNavigate(section.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem', height: '2.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                borderLeft: isActive ? '2px solid var(--sys-primary)' : '2px solid transparent',
                background: isActive ? 'var(--sys-primary-container)' : 'transparent',
                color: isActive ? 'var(--sys-primary)' : 'var(--sys-text)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.8125rem',
                transition: 'all 150ms ease',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, opacity: isActive ? 1 : 0.55 }}>
                {section.icon}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {section.label}
              </span>
              {section.count !== undefined && (
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: isActive ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
                  fontFamily: 'monospace',
                }}>
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingLeft: '1.5rem' }}>
        {children}
      </div>
    </div>
  )
}
