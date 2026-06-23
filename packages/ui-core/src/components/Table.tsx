import { type ReactNode, useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Edit, Trash2, ArrowUp, ArrowDown, Search } from 'lucide-react'
import './Table.css'

export interface TableAction<T> {
  icon: ReactNode
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
}

export interface BulkAction<T> {
  label: string
  icon: ReactNode
  onClick: (selectedItems: T[]) => void
  variant?: 'default' | 'danger'
  disabled?: (selectedItems: T[]) => boolean
}

export interface TableColumn<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
  sortable?: boolean
  filterKey?: string
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
  selectable?: boolean
  selectedKeys?: (string | number)[]
  onSelectionChange?: (keys: (string | number)[]) => void
  bulkActions?: BulkAction<T>[]
  filterable?: boolean
  filters?: Record<string, string>
  onFilterChange?: (filters: Record<string, string>) => void
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

  const btnBase = 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-transparent bg-transparent cursor-pointer text-text-muted hover:bg-surface hover:border-border-soft hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200'

  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <span className="text-xs font-medium text-text-muted whitespace-nowrap">
        Mostrando {start}–{end} de {totalRecords}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          className={btnBase}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="inline-flex items-center justify-center min-w-6 h-8 text-xs text-text-muted/50">...</span>
          ) : (
            <button
              key={p}
              className={`inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-md border border-transparent bg-transparent cursor-pointer text-[13px] font-medium text-text-muted hover:bg-surface hover:border-border-soft hover:text-text transition-all duration-200 ${p === page ? 'bg-primary-container border-primary-container text-on-primary font-semibold' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          )
        )}

        <button
          className={btnBase}
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
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  bulkActions,
  filterable = false,
  filters = {},
  onFilterChange,
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

  const allKeys = useMemo(() => sortedData.map(item => keyExtractor(item)), [sortedData, keyExtractor])
  const allSelected = selectable && allKeys.length > 0 && allKeys.every(k => selectedKeys.includes(k))

  const toggleAll = useCallback(() => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(allKeys)
    }
  }, [allSelected, allKeys, onSelectionChange])

  const toggleOne = useCallback((key: string | number) => {
    if (!onSelectionChange) return
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key]
    onSelectionChange(next)
  }, [selectedKeys, onSelectionChange])

  const handleFilterChange = (filterKey: string, value: string) => {
    if (!onFilterChange) return
    onFilterChange({ ...filters, [filterKey]: value })
  }

  const selectedItems = useMemo(() => {
    if (!selectable || selectedKeys.length === 0) return []
    return sortedData.filter(item => selectedKeys.includes(keyExtractor(item)))
  }, [sortedData, selectedKeys, selectable, keyExtractor])

  const thBase = 'sticky top-0 z-[2] text-left px-5 py-4 text-[11px] font-bold tracking-wide uppercase text-text-muted bg-surface-raised border-b border-border-soft whitespace-nowrap'
  const tdBase = 'px-5 py-4 text-[13px] text-text border-b border-border-soft align-middle'

  if (loading) {
    return (
      <div className="w-full bg-surface-raised border border-border-soft rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto" style={maxHeight ? { maxHeight } : undefined}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {selectable && <th className={thBase} style={{ width: '2.5rem' }} />}
                {columns.map(col => (
                  <th key={col.key} className={`${thBase} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.sortable ? 'cursor-pointer select-none hover:text-text' : ''}`}>
                    <span className="inline-flex items-center gap-1">{col.header}</span>
                  </th>
                ))}
                {combinedActions.length > 0 && <th className={`${thBase} text-right`}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="hover:bg-surface transition-colors duration-350">
                  {selectable && <td className={tdBase}><SkeletonBar width="1rem" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className={`${tdBase} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                      <div style={col.align === 'right' ? { display: 'flex', justifyContent: 'flex-end' } : col.align === 'center' ? { display: 'flex', justifyContent: 'center' } : undefined}>
                        <SkeletonBar width={col.width || (i % 2 === 0 ? '70%' : '50%')} />
                      </div>
                    </td>
                  ))}
                  {combinedActions.length > 0 && (
                    <td className={`${tdBase} text-right`}>
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
      <div className="w-full bg-surface-raised border border-border-soft rounded-lg overflow-hidden">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted/35">
          {emptyState.icon}
          <p className="mt-3 text-sm font-semibold text-text-muted">{emptyState.title}</p>
          {emptyState.description && (
            <p className="mt-1 text-xs opacity-70">{emptyState.description}</p>
          )}
        </div>
      </div>
    )
  }

  const hasFilterableColumns = filterable && columns.some(c => c.filterKey)
  const actionBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-transparent bg-transparent cursor-pointer text-text-muted hover:bg-surface hover:border-border-soft hover:text-text active:scale-[0.92] transition-all duration-350'

  return (
    <div className="w-full bg-surface-raised border border-border-soft rounded-lg overflow-hidden" ref={tableRef}>
      {selectable && selectedItems.length > 0 && bulkActions && bulkActions.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 mb-2 rounded-md bg-primary-container border text-[13px] text-on-primary-container"
          style={{ borderColor: 'color-mix(in srgb, var(--sys-primary) 30%, transparent)' }}
        >
          <span className="font-semibold text-xs">
            {selectedItems.length} seleccionado{selectedItems.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-1.5 ml-auto">
            {bulkActions.map((action, i) => {
              const disabled = action.disabled ? action.disabled(selectedItems) : false
              const btnVariant = action.variant === 'danger'
                ? 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
                : 'bg-surface text-text border border-border-soft hover:bg-surface-hover'
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => action.onClick(selectedItems)}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs leading-5 whitespace-nowrap cursor-pointer border-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${btnVariant}`}
                >
                  {action.icon}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {selectable && (
                <th className={thBase} style={{ width: '2.5rem' }}>
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="cursor-pointer"
                      aria-label="Seleccionar todas las filas"
                    />
                  </label>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${thBase} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.sortable ? 'cursor-pointer select-none hover:text-text' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  {...(col.sortable ? {
                    'aria-sort': sortKey === col.key ? (sortDir === 'asc' ? 'ascending' as const : 'descending' as const) : 'none' as const,
                    'tabIndex': 0 as const,
                    'onKeyDown': (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col.key) } },
                  } : {})}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </span>
                </th>
              ))}
              {combinedActions.length > 0 && <th className={`${thBase} text-right`}>Acciones</th>}
            </tr>
            {hasFilterableColumns && (
              <tr>
                {selectable && <th className={thBase} style={{ width: '2.5rem' }} />}
                {columns.map(col => (
                  <th key={`filter-${col.key}`} className={thBase}>
                    {col.filterKey ? (
                      <div className="relative">
                        <Search size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          className="w-full px-1.5 py-1 pl-6 rounded-md border border-border-soft bg-surface-raised text-text text-[11px] placeholder:text-text-muted/60 focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25"
                          value={filters?.[col.filterKey] || ''}
                          onChange={e => handleFilterChange(col.filterKey!, e.target.value)}
                          placeholder={`Filtrar ${col.header.toLowerCase()}...`}
                          onClick={e => e.stopPropagation()}
                          style={{ boxSizing: 'border-box' }}
                        />
                      </div>
                    ) : (
                      <span />
                    )}
                  </th>
                ))}
                {combinedActions.length > 0 && <th className={thBase} />}
              </tr>
            )}
          </thead>
          <tbody role="rowgroup">
            {sortedData.map((item, idx) => {
              const key = keyExtractor(item)
              const isSelected = selectedKeys.includes(key)
              const rowIdx = idx
              return (
                <tr
                  key={key}
                  className={`hover:bg-surface transition-colors duration-350 table-row-anim${onRowClick ? ' cursor-pointer' : ''}${selectable && isSelected ? ' bg-primary-container hover:bg-surface-hover' : ''}`}
                  style={{ '--i': idx } as React.CSSProperties}
                  data-visible={visible}
                  tabIndex={0}
                  role="row"
                  aria-selected={selectable ? isSelected : undefined}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && onRowClick) { e.preventDefault(); onRowClick(item) }
                    if (e.key === ' ' && selectable && onSelectionChange) { e.preventDefault(); toggleOne(key) }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      const next = e.currentTarget.parentElement?.children[rowIdx + 1] as HTMLElement | undefined
                      next?.focus()
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      const prev = e.currentTarget.parentElement?.children[rowIdx - 1] as HTMLElement | undefined
                      prev?.focus()
                    }
                  }}
                >
                  {selectable && (
                    <td className={`${tdBase} text-center`} role="gridcell">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(key)}
                          onClick={e => e.stopPropagation()}
                          className="cursor-pointer"
                          aria-label={`Seleccionar fila ${rowIdx + 1}`}
                        />
                      </label>
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={`${tdBase} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`} role="gridcell">
                      <div className="flex items-center gap-2" style={col.align === 'right' ? { justifyContent: 'flex-end' } : col.align === 'center' ? { justifyContent: 'center' } : undefined}>{col.render(item)}</div>
                    </td>
                  ))}
                  {combinedActions.length > 0 && (
                    <td className={`${tdBase} text-right`} role="gridcell">
                      <div className="flex items-center justify-end gap-0.5">
                        {combinedActions.map((action, ai) => (
                          <button
                            key={ai}
                            className={`${actionBtn} ${action.variant === 'danger' ? 'text-error hover:bg-error-container hover:border-error/20 active:scale-[0.92]' : ''}`}
                            title={action.label}
                            aria-label={action.label}
                            onClick={e => { e.stopPropagation(); action.onClick(item) }}
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
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
