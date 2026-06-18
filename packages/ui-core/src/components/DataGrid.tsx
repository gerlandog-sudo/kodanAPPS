import { type ReactNode, useRef, useState, useEffect } from 'react'

export interface Action<T> {
  icon: ReactNode
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
}

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
  hideOnMobile?: boolean
}

interface DataGridProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string | number
  loading?: boolean
  skeletonRows?: number
  emptyState: { icon: ReactNode; title: string; description: string }
  actions?: Action<T>[]
  onRowClick?: (item: T) => void
  variant?: 'table' | 'card'
  rowAnimation?: boolean
}

function SkeletonBar({ width }: { width: string }) {
  return <div className="datagrid-skeleton" style={{ width }} />
}

function DataGridInner<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  skeletonRows = 5,
  emptyState,
  actions,
  onRowClick,
  variant = 'table',
  rowAnimation = true,
}: DataGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(!rowAnimation)

  useEffect(() => {
    if (!rowAnimation) return
    setAnimated(false)
    const el = gridRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => setAnimated(true))
          observer.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [data, rowAnimation])

  if (loading) {
    return (
      <div ref={gridRef} className="datagrid">
        {variant === 'table' ? (
          <table className="datagrid-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={`datagrid-th${col.align === 'right' ? ' text-right' : col.align === 'center' ? ' text-center' : ''}`}>
                    {col.header}
                  </th>
                ))}
                {actions && <th className="datagrid-th text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="datagrid-row">
                  {columns.map(col => (
                    <td key={col.key}>
                      <SkeletonBar width={col.width || (i === 0 ? '70%' : '50%')} />
                    </td>
                  ))}
                  {actions && (
                    <td className="text-right">
                      <SkeletonBar width="60px" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="datagrid-card-grid">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="datagrid-card">
                <div className="datagrid-card-skeleton-header">
                  <SkeletonBar width="36px" />
                  <div className="datagrid-card-skeleton-lines">
                    <SkeletonBar width="60%" />
                    <SkeletonBar width="40%" />
                  </div>
                </div>
                <div className="datagrid-card-skeleton-body">
                  <SkeletonBar width="80px" />
                  <SkeletonBar width="70px" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div ref={gridRef} className="datagrid">
        <div className="datagrid-empty">
          {emptyState.icon}
          <p className="datagrid-empty-title">{emptyState.title}</p>
          {emptyState.description && (
            <p className="datagrid-empty-desc">{emptyState.description}</p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div ref={gridRef} className="datagrid">
        <table className="datagrid-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`datagrid-th${col.align === 'right' ? ' text-right' : col.align === 'center' ? ' text-center' : ''}`}
                >
                  {col.header}
                </th>
              ))}
              {actions && <th className="datagrid-th text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                className={`datagrid-row${onRowClick ? ' datagrid-row-clickable' : ''}${rowAnimation ? ' datagrid-fade' : ''}`}
                style={rowAnimation ? { '--i': idx } as React.CSSProperties : undefined}
                data-visible={animated}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="datagrid-cell-inner">{col.render(item)}</div>
                  </td>
                ))}
                {actions && (
                  <td className="datagrid-actions-cell">
                    <div className="datagrid-actions">
                      {actions.map((action, ai) => (
                        <button
                          key={ai}
                          className={`datagrid-action-btn${action.variant === 'danger' ? ' danger' : ''}`}
                          title={action.label}
                          onClick={e => { e.stopPropagation(); action.onClick(item) }}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div ref={gridRef} className="datagrid">
      <div className="datagrid-card-grid">
        {data.map((item, idx) => (
          <div
            key={keyExtractor(item)}
            className={`datagrid-card${onRowClick ? ' datagrid-card-clickable' : ''}${rowAnimation ? ' datagrid-fade' : ''}`}
            style={rowAnimation ? { '--i': idx } as React.CSSProperties : undefined}
            data-visible={animated}
            onClick={() => onRowClick?.(item)}
          >
            <div className="datagrid-card-fields">
              {columns
                .filter(col => !col.hideOnMobile)
                .map(col => (
                  <div key={col.key} className="datagrid-card-field">
                    <span className="datagrid-card-label">{col.header}</span>
                    <div className="datagrid-card-value">{col.render(item)}</div>
                  </div>
                ))}
            </div>
            {actions && (
              <div className="datagrid-card-actions">
                {actions.map((action, ai) => (
                  <button
                    key={ai}
                    className={`datagrid-action-btn${action.variant === 'danger' ? ' danger' : ''}`}
                    title={action.label}
                    onClick={e => { e.stopPropagation(); action.onClick(item) }}
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DataGrid<T>(props: DataGridProps<T>) {
  return <DataGridInner {...props} />
}
