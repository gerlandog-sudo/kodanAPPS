import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check, Search } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export function MultiSelect({ options, values, onChange, placeholder = 'Seleccionar...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  const removeValue = (val: string) => {
    onChange(values.filter(v => v !== val))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="input"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          padding: values.length > 0 ? '0.375rem 2rem 0.375rem 0.5rem' : undefined,
          cursor: 'pointer',
          minHeight: '2.5rem',
          alignItems: 'center',
        }}
      >
        {values.length === 0 && (
          <span style={{ color: 'var(--sys-text-muted)', opacity: 0.6, fontSize: '0.875rem' }}>{placeholder}</span>
        )}
        {values.map(val => {
          const opt = options.find(o => o.value === val)
          return (
            <span
              key={val}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                background: 'var(--sys-primary-container)',
                color: 'var(--color-on-primary-container)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
              }}
            >
              {opt?.label || val}
              <X
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); removeValue(val) }}
              />
            </span>
          )
        })}
        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--sys-text-muted)' }}>
          <ChevronDown size={16} />
        </span>
      </div>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: '0.25rem',
            maxHeight: '16rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--sys-border-soft)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--sys-text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.8125rem' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--sys-text-muted)', fontSize: '0.8125rem' }}>
                Sin resultados
              </div>
            )}
            {filtered.map(opt => (
              <label
                key={opt.value}
                onClick={() => {
                  if (values.includes(opt.value)) {
                    onChange(values.filter(v => v !== opt.value))
                  } else {
                    onChange([...values, opt.value])
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--sys-text)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sys-surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{
                    width: '1rem',
                    height: '1rem',
                    borderRadius: '0.25rem',
                    border: values.includes(opt.value) ? 'none' : '1px solid var(--sys-border-soft)',
                    background: values.includes(opt.value) ? 'var(--sys-primary-container)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {values.includes(opt.value) && <Check size={12} style={{ color: 'var(--color-on-primary-container)' }} />}
                </span>
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
