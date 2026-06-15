import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  variant?: 'flat' | 'flip'
  front?: ReactNode
  back?: ReactNode
}

export function Card({ children, variant, className = '', front, back, ...props }: CardProps) {
  if (variant === 'flip') {
    return (
      <div className={`card-flip ${className}`} {...props}>
        <div className="card-flip-inner">
          <div className="card-flip-front">{front}</div>
          <div className="card-flip-back">{back}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}
