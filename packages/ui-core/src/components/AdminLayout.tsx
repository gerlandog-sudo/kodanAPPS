import type { ReactNode } from 'react'
import { Breadcrumb } from './Breadcrumb'
import type { BreadcrumbItem } from './Breadcrumb'

export interface AdminSection {
  key: string
  label: string
  icon: ReactNode
  description?: string
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
  const currentSection = sections.find(s => s.key === activeSection)

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Ajustes', onClick: () => onNavigate('') },
    ...(currentSection ? [{ label: currentSection.label, onClick: () => onNavigate(currentSection.key) }] : []),
  ]

  return (
    <div style={{ display: 'flex', gap: '1.5rem', minHeight: '70vh', fontFamily: 'var(--font-montserrat, system-ui)' }}>
      <nav
        style={{
          width: '14rem',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
        aria-label="Secciones de configuración"
      >
        {sections.map(section => {
          const isActive = section.key === activeSection
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onNavigate(section.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.75rem',
                border: isActive ? '1px solid var(--sys-border-soft)' : '1px solid transparent',
                background: isActive ? 'var(--sys-surface-raised)' : 'transparent',
                color: isActive ? 'var(--sys-primary)' : 'var(--sys-text)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.8125rem',
                width: '100%',
                transition: 'all 200ms ease',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
                {section.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {section.label}
                </span>
                {section.description && (
                  <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--sys-text-muted)', marginTop: '0.125rem' }}>
                    {section.description}
                  </span>
                )}
              </span>
              {section.count !== undefined && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--sys-primary)',
                  fontFamily: 'monospace',
                }}>
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Breadcrumb items={breadcrumbItems} />
        <div
          style={{
            flex: 1,
            padding: '1.5rem 2rem',
            border: '1px solid var(--sys-border-soft)',
            background: 'var(--sys-surface-raised)',
            borderRadius: '1rem',
            boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
            minHeight: '60vh',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
