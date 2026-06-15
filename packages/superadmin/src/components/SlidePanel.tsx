import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function SlidePanel({ open, onClose, title, children }: SlidePanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="flex-1" onClick={onClose} />
      <div
        className="h-full overflow-y-auto"
        style={{
          width: 'min(50vw, 640px)',
          background: 'var(--sys-surface)',
          borderLeft: '1px solid var(--sys-border-soft)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          animation: 'slideIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--sys-border-soft)' }}>
          {title && (
            <h3 className="text-base font-semibold font-montserrat m-0" style={{ color: 'var(--sys-text)' }}>
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.375rem', lineHeight: 1, marginLeft: 'auto' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}