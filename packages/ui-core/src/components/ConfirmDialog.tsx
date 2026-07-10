import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onClose?: () => void
  /** Alias de onClose (mantiene compatibilidad con llamadas existentes). */
  onCancel?: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const close = onClose ?? onCancel ?? (() => {})

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 100)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) close()
  }

  if (!open) return null

  const btnVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <Modal open={open} onClose={loading ? () => {} : close} title={title}>
      <div onKeyDown={handleKeyDown} className="flex flex-col gap-6">
        <p className="m-0 text-sm text-text leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={close} disabled={loading}>
            {cancelLabel}
          </Button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold text-xs border-none text-white disabled:opacity-60 disabled:cursor-not-allowed transition-opacity active:scale-[0.95]"
            style={{
              background: btnVariant === 'danger' ? 'var(--sys-error)' : 'var(--sys-primary)',
            }}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
