import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@kodan-apps/ui-core';
import { AlertCircle, Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden shadow-2xl"
            style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: isDanger ? 'var(--sys-error-container)' : 'var(--sys-primary-container)' }}
                >
                  {isDanger
                    ? <AlertCircle size={20} style={{ color: 'var(--sys-error)' }} />
                    : <Check size={20} style={{ color: 'var(--sys-primary)' }} />
                  }
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>{title}</h3>
              </div>
              <div className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
                {message}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
                <Button variant={isDanger ? 'secondary' : 'primary'} onClick={onConfirm} disabled={loading}>
                  {loading ? 'Procesando...' : confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
