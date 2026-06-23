import { useEffect, useState } from 'react';
import { Button, Modal, Input, Select } from '@kodan-apps/ui-core';
import { Trophy, Clock, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { crmApi } from '../../api/client';
import { QuoteStatusBadge } from '../quotes/QuoteStatusBadge';
import type { Quote, QuoteStatus } from '../../types/admin';

interface WonOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { tracker_project_name: string; budgeted_hours: number; close_reason: string }) => Promise<void>;
  defaultName: string;
  opportunityId?: number | null;
  wonReasons?: string[];
}

export function WonOpportunityModal({ isOpen, onClose, onSubmit, defaultName, opportunityId, wonReasons = [] }: WonOpportunityModalProps) {
  const [projectName, setProjectName] = useState(defaultName);
  const [hours, setHours] = useState('0');
  const [closeReason, setCloseReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Accepted quotes
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !opportunityId) {
      setAcceptedQuotes([]);
      setSelectedQuoteId(null);
      return
    }
    setProjectName(defaultName)
    setHours('0')
    setCloseReason(wonReasons.length > 0 ? wonReasons[0] : 'Otro / No especificado')
    setLoadingQuotes(true)
    crmApi.listQuotes({ opportunity_id: opportunityId })
      .then((quotes) => {
        const accepted = quotes.filter((q: any) => q.status === 'accepted')
        setAcceptedQuotes(accepted)
      })
      .catch(() => {/* silently fail */})
      .finally(() => setLoadingQuotes(false))
  }, [isOpen, opportunityId, defaultName])

  const handleQuoteSelect = (quoteId: number) => {
    if (selectedQuoteId === quoteId) {
      setSelectedQuoteId(null)
      return
    }
    setSelectedQuoteId(quoteId)
    const quote = acceptedQuotes.find((q) => q.id === quoteId)
    if (quote) {
      setHours(parseFloat(quote.total_amount).toFixed(2))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('El nombre del proyecto es obligatorio.');
      return;
    }
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours < 0) {
      toast.error('Las horas presupuestadas deben ser un número mayor o igual a 0.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        tracker_project_name: projectName,
        budgeted_hours: parsedHours,
        close_reason: closeReason || 'Otro / No especificado',
      });
      toast.success('¡Negociación ganada y proyecto creado en TimeTracker!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al transicionar la negociación.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(String(val)) || 0)
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="¡Felicitaciones! Oportunidad Ganada">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sys-success) 20%, transparent)' }}>
          <Trophy className="text-xl" style={{ color: 'var(--sys-success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Transición Comercial Exitosa</p>
            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Esto creará automáticamente un proyecto vinculado en kodanTRACKER para su seguimiento.</p>
          </div>
        </div>

        {/* Accepted Quotes Selection */}
        {loadingQuotes && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
            <span className="size-3 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
            Cargando cotizaciones aceptadas...
          </div>
        )}

        {!loadingQuotes && acceptedQuotes.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
              COTIZACIONES ACEPTADAS (opcional)
            </label>
            <p className="text-[0.6rem]" style={{ color: 'var(--sys-text-muted)' }}>
              Seleccioná una cotización aceptada para presupuestar automáticamente las horas según su total
            </p>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {acceptedQuotes.map((quote) => (
                <button
                  type="button"
                  key={quote.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                    selectedQuoteId === quote.id ? 'ring-2' : ''
                  }`}
                  style={{
                    background: selectedQuoteId === quote.id
                      ? 'color-mix(in srgb, var(--sys-primary) 10%, transparent)'
                      : 'var(--sys-surface)',
                    border: `1px solid ${
                      selectedQuoteId === quote.id
                        ? 'color-mix(in srgb, var(--sys-primary) 30%, transparent)'
                        : 'var(--sys-border-soft)'
                    }`,
                    ...(selectedQuoteId === quote.id ? { ringColor: 'var(--sys-primary)' } : {}),
                  }}
                  onClick={() => handleQuoteSelect(quote.id)}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: 'var(--sys-primary)' }} />
                    <span className="font-medium">{quote.quote_number}</span>
                    <QuoteStatusBadge status={quote.status as QuoteStatus} size="sm" />
                  </div>
                  <span className="font-semibold">{formatCurrency(quote.total_amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loadingQuotes && acceptedQuotes.length === 0 && opportunityId && (
          <div className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: 'color-mix(in srgb, var(--sys-text-muted) 6%, transparent)', color: 'var(--sys-text-muted)' }}>
            <FileText size={14} />
            No hay cotizaciones aceptadas para esta oportunidad
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            MOTIVO DE GANADA *
          </label>
          <Select
            options={
              wonReasons.length > 0
                ? wonReasons.map(r => ({ value: r, label: r }))
                : [{ value: 'Otro / No especificado', label: 'Otro / No especificado' }]
            }
            value={closeReason}
            onChange={(val) => setCloseReason(String(val))}
            placeholder="Selecciona el motivo del cierre ganado..."
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            NOMBRE DEL PROYECTO (TRACKER)
          </label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ej: Desarrollo Portal Web"
            required
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            HORAS PRESUPUESTADAS
          </label>
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} />
            <input
              type="number"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 pl-10 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0.00"
              step="0.25"
              min="0"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle size={16} />
                Confirmar Cierre Ganado
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
