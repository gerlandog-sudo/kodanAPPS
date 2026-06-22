import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary',
  secondary:
    'bg-surface text-text border border-border-soft hover:bg-surface-hover',
  ghost:
    'bg-transparent text-text-muted hover:bg-surface hover:text-text',
  danger:
    'bg-error-container text-on-error-container hover:bg-error hover:text-on-error',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm leading-5 whitespace-nowrap cursor-pointer border-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
