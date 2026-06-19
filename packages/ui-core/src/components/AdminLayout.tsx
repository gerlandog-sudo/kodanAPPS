import { useState, type ReactNode } from 'react'

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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  return (
    <div style={{ fontFamily: 'var(--font-montserrat, system-ui)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', gap: '0.125rem', marginBottom: '1.5rem',
        background: 'var(--sys-surface)', padding: '0.25rem',
        borderRadius: '0.5rem', border: '1px solid var(--sys-border-soft)',
        width: 'fit-content',
        flexShrink: 0,
      }}>
        {sections.map(section => {
          const isActive = section.key === activeSection
          const isHovered = hoveredSection === section.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onNavigate(section.key)}
              onMouseEnter={() => setHoveredSection(section.key)}
              onMouseLeave={() => setHoveredSection(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', height: '2.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: isActive 
                  ? 'var(--sys-primary-container)' 
                  : (isHovered ? 'var(--sys-surface-hover)' : 'transparent'),
                color: isActive ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.75rem',
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'flex', opacity: isActive ? 1 : 0.6 }}>
                {section.icon}
              </span>
              {section.label}
              {section.count !== undefined && (
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, marginLeft: '0.125rem',
                  color: isActive ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
                  fontFamily: 'monospace',
                }}>
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
