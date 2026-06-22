import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: string
}

export function SlidePanel({ open, onClose, title, children, width = '32rem' }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-51 bg-surface border-l border-border-soft flex flex-col transition-transform duration-250 ease-out"
        style={{
          width,
          maxWidth: '100vw',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft shrink-0">
          <h3 className="m-0 font-semibold text-base" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-text-muted cursor-pointer p-1 leading-none rounded hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </>
  )
}
