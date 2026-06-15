import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function Input({ icon, className = '', style, ...props }: InputProps) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--sys-text-muted)',
            display: 'flex',
            pointerEvents: 'none',
          }}
        >
          {icon}
        </span>
      )}
      <input
        className={`input ${className}`}
        style={icon ? { ...style, paddingLeft: '2.5rem' } : style}
        {...props}
      />
    </div>
  )
}
