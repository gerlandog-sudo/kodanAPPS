import { type ReactNode, useState, useRef, useEffect, useMemo } from 'react'
import { Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

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
  sortable?: boolean
}

interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  keyExtractor: (item: T) => string | number
  loading?: boolean
  skeletonRows?: number
  emptyState: { icon: ReactNode; title: string; description: string }
  editable?: { onClick: (item: T) => void }
  deletable?: { onClick: (item: T) => void }
  actions?: TableAction<T>[]
  pageSize?: number
  currentPage?: number
  totalRecords?: number
  onPageChange?: (page: number) => void
  maxHeight?: string
  onRowClick?: (item: T) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
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
  editable,
  deletable,
  actions,
  pageSize,
  currentPage,
  totalRecords,
  onPageChange,
  maxHeight,
  onRowClick,
  onSort: _onSort,
}: TableProps<T>) {
  const onSort = _onSort
  const [internalPage, setInternalPage] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  const combinedActions: TableAction<T>[] = []
  if (editable) combinedActions.push({ icon: <Edit size={14} />, label: 'Editar', onClick: editable.onClick })
  if (deletable) combinedActions.push({ icon: <Trash2 size={14} />, label: 'Eliminar', variant: 'danger', onClick: deletable.onClick })
  if (actions) combinedActions.push(...actions)

  const isControlled = currentPage !== undefined
  const activePage = isControlled ? currentPage : internalPage
  const total = totalRecords ?? data.length
  const hasPages = pageSize !== undefined && pageSize > 0
  const totalPages = hasPages ? Math.ceil(total / pageSize!) : 1
  const displayData = isControlled || !hasPages
    ? data
    : data.slice(activePage * pageSize!, (activePage + 1) * pageSize!)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    setVisible(false)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => setVisible(true))
          observer.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [data])

  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    if (onSort) onSort(key, newDir)
  }

  const sortedData = useMemo(() => {
    if (!sortKey || onSort) return displayData
    return [...displayData].sort((a: any, b: any) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [displayData, sortKey, sortDir, onSort])

  const goToPage = (page: number) => {
    if (isControlled) {
      onPageChange!(page)
    } else {
      setInternalPage(page)
    }
  }

  if (loading) {
    return (
      <div className="table-wrapper">
        <div className="table-container" style={maxHeight ? { maxHeight } : undefined}>
          <table className="table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={`table-th${col.align === 'right' ? ' table-th-right' : col.align === 'center' ? ' table-th-center' : ''}${col.sortable ? ' table-th-sortable' : ''}`}>
                    <span className="table-th-content">{col.header}</span>
                  </th>
                ))}
                {combinedActions.length > 0 && <th className="table-th table-th-right">Acciones</th>}
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
                  {combinedActions.length > 0 && (
                    <td className="table-td table-td-right">
                      <SkeletonBar width="60px" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <div className="table-wrapper" ref={tableRef}>
      <div className="table-container" style={maxHeight ? { maxHeight } : undefined}>
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`table-th${col.align === 'right' ? ' table-th-right' : col.align === 'center' ? ' table-th-center' : ''}${col.sortable ? ' table-th-sortable' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="table-th-content">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </span>
                </th>
              ))}
              {combinedActions.length > 0 && <th className="table-th table-th-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                className={`table-row table-row-anim${onRowClick ? ' table-row-clickable' : ''}`}
                style={{ '--i': idx } as React.CSSProperties}
                data-visible={visible}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className="table-td">
                    <div className="table-cell">{col.render(item)}</div>
                  </td>
                ))}
                {combinedActions.length > 0 && (
                  <td className="table-td table-td-right">
                    <div className="table-actions">
                      {combinedActions.map((action, ai) => (
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
