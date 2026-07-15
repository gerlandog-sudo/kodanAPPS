import { useState, useEffect } from 'react';
import { Modal, Button, Card } from '@kodan-apps/ui-core';
import { hubAdminApi, ServiceDiagnostic } from '../api/client';
import { Loader2, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react';

interface ServiceDiagnosticModalProps {
  serviceId: number;
  onClose: () => void;
}

export function ServiceDiagnosticModal({ serviceId, onClose }: ServiceDiagnosticModalProps) {
  const [diagnostic, setDiagnostic] = useState<ServiceDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTest = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await hubAdminApi.testService(serviceId);
        setDiagnostic(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al ejecutar diagnóstico');
      } finally {
        setLoading(false);
      }
    };
    runTest();
  }, [serviceId]);

  const isSuccess = diagnostic?.status === 'success';

  return (
    <Modal
      open
      onClose={onClose}
      title="Diagnóstico de Servicio"
    >
      <div className="flex flex-col gap-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--sys-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--sys-on-bg-muted)' }}>
              Ejecutando prueba contra el endpoint...
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-4 flex items-start gap-3">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {diagnostic && !error && (
          <>
            {/* Status Banner */}
            <div className={`rounded-lg p-4 flex items-center gap-3 ${
              isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              {isSuccess ? (
                <CheckCircle size={24} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={24} className="text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-sm" style={{ color: isSuccess ? 'var(--sys-on-bg)' : 'var(--sys-on-bg)' }}>
                  {isSuccess ? 'Conexión exitosa' : 'Error de conexión'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sys-on-bg-muted)' }}>
                  {diagnostic.message || (isSuccess ? 'El endpoint respondió correctamente' : 'El endpoint devolvió un error')}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--sys-surface-variant)' }}>
                  <Terminal size={16} style={{ color: 'var(--sys-primary)' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>HTTP Code</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sys-on-bg)' }}>{diagnostic.http_code}</p>
                </div>
              </Card>
              <Card className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--sys-surface-variant)' }}>
                  <Clock size={16} style={{ color: 'var(--sys-primary)' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>Latencia</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sys-on-bg)' }}>{diagnostic.latency}</p>
                </div>
              </Card>
            </div>

            {/* Endpoint */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
                Endpoint Probado
              </label>
              <code className="text-xs p-2 rounded-lg block break-all" style={{ background: 'var(--sys-surface-variant)', color: 'var(--sys-primary)' }}>
                {diagnostic.debug_endpoint}
              </code>
            </div>

            {/* Request Preview */}
            {diagnostic.debug_request && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
                  Payload Enviado
                </label>
                <pre className="text-xs p-3 rounded-lg overflow-auto max-h-40" style={{ background: 'var(--sys-surface-variant)', color: 'var(--sys-on-bg)' }}>
                  {JSON.stringify(diagnostic.debug_request, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Preview */}
            {diagnostic.response && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
                  Respuesta
                </label>
                <pre className="text-xs p-3 rounded-lg overflow-auto max-h-60" style={{ background: 'var(--sys-surface-variant)', color: 'var(--sys-on-bg)' }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(diagnostic.response), null, 2);
                    } catch {
                      return diagnostic.response;
                    }
                  })()}
                </pre>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
