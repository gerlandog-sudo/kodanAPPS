import { useEffect, useRef } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 100)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) onClose()
  }

  if (!open) return null

  const btnVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title}>
      <div onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sys-text)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              border: 'none',
              background: btnVariant === 'danger' ? 'var(--sys-error)' : 'var(--sys-primary)',
              color: '#fff',
            }}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
