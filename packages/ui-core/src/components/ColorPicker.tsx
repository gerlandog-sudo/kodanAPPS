import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const presetColors = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6B7280', '#1F2937',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [customHex, setCustomHex] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCustomApply = () => {
    const hex = customHex.startsWith('#') ? customHex : `#${customHex}`
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) { onChange(hex); setCustomHex(''); setOpen(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.25rem 0.5rem', height: '2rem',
          borderRadius: '0.375rem', border: '1px solid var(--sys-border-soft)',
          background: 'var(--sys-surface)', cursor: 'pointer',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text)',
        }}>
        <span style={{ width: '1rem', height: '1rem', borderRadius: '0.25rem', background: value || '#6366F1', flexShrink: 0 }} />
        {value || 'Color'}
        <ChevronDown size={12} style={{ color: 'var(--sys-text-muted)', opacity: open ? 0.5 : 1 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem',
          padding: '0.625rem', borderRadius: '0.5rem',
          background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem' }}>
            {presetColors.map(color => (
              <button key={color} type="button" onClick={() => { onChange(color); setOpen(false) }}
                aria-label={color}
                style={{
                  width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem',
                  background: color, cursor: 'pointer', border: 'none', padding: 0,
                  outline: value === color ? '2px solid var(--sys-primary)' : 'none',
                  outlineOffset: '1px',
                }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>#</span>
            <input value={customHex} onChange={e => setCustomHex(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCustomApply() }}
              placeholder={value.replace('#', '')}
              maxLength={6}
              style={{
                flex: 1, padding: '0.125rem 0.375rem', fontSize: '0.6875rem', border: '1px solid var(--sys-border-soft)',
                borderRadius: '0.25rem', background: 'var(--sys-bg)', color: 'var(--sys-text)',
                textTransform: 'uppercase', fontFamily: 'monospace', outline: 'none',
              }} />
            <button type="button" onClick={handleCustomApply}
              style={{
                padding: '0.125rem 0.375rem', fontSize: '0.625rem', fontWeight: 600,
                borderRadius: '0.25rem', border: 'none', background: 'var(--sys-primary-container)',
                color: 'var(--sys-primary)', cursor: 'pointer',
              }}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
