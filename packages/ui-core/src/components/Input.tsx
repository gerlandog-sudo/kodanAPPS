import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function Input({ icon, className = '', style, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted flex pointer-events-none">
          {icon}
        </span>
      )}
      <input
        className={`w-full px-4 py-3 rounded-md border border-border-soft bg-surface-raised text-text text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25 disabled:opacity-50 disabled:cursor-not-allowed ${icon ? 'pl-10' : ''} ${className}`}
        style={style}
        {...props}
      />
    </div>
  )
}
