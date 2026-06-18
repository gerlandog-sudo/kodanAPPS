import { type ReactNode, useState } from 'react'

export interface TableAction<T> {
  icon: ReactNode
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
}

export interface TableColumn<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  keyExtractor: (item: T) => string | number
  loading?: boolean
  skeletonRows?: number
  emptyState: { icon: ReactNode; title: string; description: string }
  actions?: TableAction<T>[]
  pageSize?: number
  currentPage?: number
  totalRecords?: number
  onPageChange?: (page: number) => void
}

function SkeletonBar({ width }: { width: string }) {
  return <div className="table-skeleton" style={{ width }} />
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
    <div className="table-pagination">
      <span className="table-pagination-info">
        Mostrando {start}–{end} de {totalRecords}
      </span>
      <div className="table-pagination-controls">
        <button
          className="table-pagination-btn"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="table-pagination-ellipsis">...</span>
          ) : (
            <button
              key={p}
              className={`table-pagination-page${p === page ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          )
        )}

        <button
          className="table-pagination-btn"
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

export function Table<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  skeletonRows = 10,
  emptyState,
  actions,
  pageSize,
  currentPage,
  totalRecords,
  onPageChange,
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(0)

  const isControlled = currentPage !== undefined
  const activePage = isControlled ? currentPage : internalPage
  const total = totalRecords ?? data.length
  const hasPages = pageSize !== undefined && pageSize > 0
  const totalPages = hasPages ? Math.ceil(total / pageSize!) : 1
  const displayData = isControlled || !hasPages
    ? data
    : data.slice(activePage * pageSize!, (activePage + 1) * pageSize!)

  const goToPage = (page: number) => {
    if (isControlled) {
      onPageChange!(page)
    } else {
      setInternalPage(page)
    }
  }

  if (loading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`table-th${col.align === 'right' ? ' table-th-right' : col.align === 'center' ? ' table-th-center' : ''}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="table-th table-th-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="table-row">
                {columns.map(col => (
                  <td key={col.key} className="table-td">
                    <SkeletonBar width={col.width || (i % 2 === 0 ? '70%' : '50%')} />
                  </td>
                ))}
                {actions && (
                  <td className="table-td table-td-right">
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
      <div className="table-wrapper">
        <div className="table-empty">
          {emptyState.icon}
          <p className="table-empty-title">{emptyState.title}</p>
          {emptyState.description && (
            <p className="table-empty-desc">{emptyState.description}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`table-th${col.align === 'right' ? ' table-th-right' : col.align === 'center' ? ' table-th-center' : ''}`}
                >
                  {col.header}
                </th>
              ))}
              {actions && <th className="table-th table-th-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {displayData.map(item => (
              <tr key={keyExtractor(item)} className="table-row">
                {columns.map(col => (
                  <td key={col.key} className="table-td">
                    <div className="table-cell">{col.render(item)}</div>
                  </td>
                ))}
                {actions && (
                  <td className="table-td table-td-right">
                    <div className="table-actions">
                      {actions.map((action, ai) => (
                        <button
                          key={ai}
                          className={`table-action-btn${action.variant === 'danger' ? ' table-action-btn-danger' : ''}`}
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

      {hasPages && totalPages > 1 && (
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
