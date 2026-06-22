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
    <div style={{ fontFamily: 'var(--font-montserrat, system-ui)', width: '100%' }}>
      <div className="flex gap-0.5 mb-6 p-1 rounded-lg border border-border-soft bg-surface w-fit">
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
              className="flex items-center gap-2 px-4 h-9 rounded-md border-none cursor-pointer text-xs whitespace-nowrap transition-all duration-100"
              style={{
                background: isActive 
                  ? 'var(--sys-primary-container)' 
                  : (isHovered ? 'var(--sys-surface-hover)' : 'transparent'),
                color: isActive ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span style={{ display: 'flex', opacity: isActive ? 1 : 0.6 }}>
                {section.icon}
              </span>
              {section.label}
              {section.count !== undefined && (
                <span className="text-[10px] font-bold ml-0.5" style={{ fontFamily: 'monospace', color: isActive ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)' }}>
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col w-full" style={{ minHeight: 'calc(100vh - 280px)' }}>
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
