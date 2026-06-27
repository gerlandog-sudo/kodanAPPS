import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function Modal({ open, onClose, children, title, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const hasWidth = className.includes('max-w-') || className.includes('modal-wide')
  const widthClass = hasWidth ? '' : 'max-w-md'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className={`bg-surface rounded-lg border border-border-soft w-full p-6 flex flex-col max-h-[90vh] ${widthClass} ${className}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          {title && (
            <h3 className="m-0 text-lg font-semibold" style={{ fontFamily: 'var(--font-montserrat)' }}>
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center justify-center gap-2 px-2 py-2 rounded-md font-medium text-sm leading-5 whitespace-nowrap cursor-pointer border-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-transparent text-text-muted hover:bg-surface hover:text-text"
            style={{ lineHeight: 1 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}
