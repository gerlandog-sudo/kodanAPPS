import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={'modal-content' + (className ? ' ' + className : '')} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {title && (
            <h3 style={{ margin: 0, fontFamily: 'var(--font-montserrat)', fontWeight: 600, fontSize: '1.125rem' }}>
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.25rem', lineHeight: 1 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
