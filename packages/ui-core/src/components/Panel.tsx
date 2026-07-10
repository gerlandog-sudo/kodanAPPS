import type { ReactNode } from 'react'

export interface PanelProps {
  title?: string
  icon?: ReactNode
  /** Acciones/contrroles a la derecha del header. */
  actions?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  /** Quita el padding del body (para charts que lo definen). */
  noPadding?: boolean
}

export function Panel({
  title,
  icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
}: PanelProps) {
  return (
    <div className={`glass-panel rounded-lg overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center gap-2 px-5 py-4 border-b border-glass-border">
          {icon}
          <h2 className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--sys-text)' }}>
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={`flex-1 min-h-0 ${noPadding ? '' : 'p-5'} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  )
}
