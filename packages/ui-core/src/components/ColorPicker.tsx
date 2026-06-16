import { useState } from 'react'
import { Pipette } from 'lucide-react'

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
  const [customHex, setCustomHex] = useState('')

  const handleCustomApply = () => {
    const hex = customHex.startsWith('#') ? customHex : `#${customHex}`
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex)
      setCustomHex('')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.625rem' }}>
        {presetColors.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            aria-label={color}
            style={{
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: 'var(--radius-sm)',
              background: color,
              border: value === color ? '2px solid var(--sys-text)' : '2px solid transparent',
              cursor: 'pointer',
              outline: value === color ? '2px solid var(--sys-primary-container)' : 'none',
              outlineOffset: '1px',
              transition: 'transform var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Pipette size={14} style={{ color: 'var(--sys-text-muted)', flexShrink: 0 }} />
        <input
          className="input"
          placeholder={value || '#HEX'}
          value={customHex}
          onChange={e => setCustomHex(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCustomApply() }}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', flex: 1, textTransform: 'uppercase' }}
          maxLength={7}
        />
        <button type="button" className="btn btn-secondary" onClick={handleCustomApply} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
          OK
        </button>
      </div>
    </div>
  )
}
