export function PaginationBar({
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
