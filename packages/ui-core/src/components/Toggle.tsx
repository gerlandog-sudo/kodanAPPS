import type { InputHTMLAttributes } from 'react'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Toggle({ label, className = '', id, ...props }: ToggleProps) {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2, 8)}`
  return (
    <label htmlFor={toggleId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
      <input id={toggleId} type="checkbox" className={`sr-only ${className}`} {...props} />
      <span
        className="toggle-track"
        role="switch"
        aria-checked={props.checked}
        style={{
          position: 'relative',
          width: '2.25rem',
          height: '1.25rem',
          borderRadius: '999px',
          background: props.checked ? 'var(--sys-success-bg)' : 'var(--sys-error-container)',
          transition: 'background var(--transition-fast)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '0.125rem',
            left: props.checked ? '1.125rem' : '0.125rem',
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            background: props.checked ? 'var(--sys-success)' : 'var(--sys-error)',
            transition: 'left var(--transition-fast)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        />
      </span>
      {label && <span style={{ fontSize: '0.875rem', color: 'var(--sys-text)' }}>{label}</span>}
    </label>
  )
}
