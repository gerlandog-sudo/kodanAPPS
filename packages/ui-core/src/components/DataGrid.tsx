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
  pageSize?: number
  currentPage?: number
  totalRecords?: number
  onPageChange?: (page: number) => void
}

function SkeletonBar({ width }: { width: string }) {
  return <div className="datagrid-skeleton" style={{ width }} />
}

function PaginationBar({
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalRecords: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, totalRecords)

  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i)
  } else {
    pages.push(0)
    if (page > 2) pages.push('ellipsis')
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 3) pages.push('ellipsis')
    pages.push(totalPages - 1)
  }

  return (
    <div className="datagrid-pagination">
      <span className="datagrid-pagination-info">
        Mostrando {start}-{end} de {totalRecords}
      </span>
      <div className="datagrid-pagination-controls">
        <button
          className="datagrid-pagination-btn"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="datagrid-pagination-ellipsis">...</span>
          ) : (
            <button
              key={p}
              className={`datagrid-pagination-page${p === page ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          )
        )}

        <button
          className="datagrid-pagination-btn"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function DataGridInner<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  skeletonRows = 10,
  emptyState,
  actions,
  onRowClick,
  rowAnimation = true,
  pageSize,
  currentPage,
  totalRecords,
  onPageChange,
}: DataGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(!rowAnimation)
  const [internalPage, setInternalPage] = useState(0)

  const isControlled = currentPage !== undefined
  const activePage = isControlled ? currentPage : internalPage
  const total = totalRecords ?? data.length
  const hasPagination = pageSize !== undefined && pageSize > 0
  const totalPages = hasPagination ? Math.ceil(total / pageSize!) : 1

  const displayData = isControlled || !hasPagination
    ? data
    : data.slice(activePage * pageSize!, (activePage + 1) * pageSize!)

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

  const goToPage = (page: number) => {
    if (isControlled) {
      onPageChange!(page)
    } else {
      setInternalPage(page)
    }
  }

  const renderRows = () =>
    displayData.map((item, idx) => (
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
    ))

  if (loading) {
    return (
      <div ref={gridRef} className="datagrid">
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
                    <SkeletonBar width={col.width || (i % 2 === 0 ? '70%' : '50%')} />
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

  return (
    <div ref={gridRef} className="datagrid">
      <div className="datagrid-table-wrapper">
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
            {renderRows()}
          </tbody>
        </table>
      </div>

      {hasPagination && totalPages > 1 && (
        <PaginationBar
          page={activePage}
          totalPages={totalPages}
          totalRecords={total}
          pageSize={pageSize!}
          onPageChange={goToPage}
        />
      )}
    </div>
  )
}

export function DataGrid<T>(props: DataGridProps<T>) {
  return <DataGridInner {...props} />
}
