import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@kodan-apps/ui-core';
import { HubApp } from '../api/client';

interface AppFormModalProps {
  app: HubApp | null;
  onSave: (data: { name: string; custom_token?: string; app_identifier?: string }) => Promise<void>;
  onClose: () => void;
}

export function AppFormModal({ app, onSave, onClose }: AppFormModalProps) {
  const [name, setName] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [appIdentifier, setAppIdentifier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!app;

  useEffect(() => {
    if (app) {
      setName(app.name);
      setAppIdentifier(app.app_identifier ?? '');
      setCustomToken('');
    } else {
      setName('');
      setCustomToken('');
      setAppIdentifier('');
    }
  }, [app]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data: { name: string; custom_token?: string; app_identifier?: string } = { name: name.trim() };
      if (customToken.trim()) data.custom_token = customToken.trim();
      if (appIdentifier.trim()) data.app_identifier = appIdentifier.trim();
      await onSave(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? 'Editar Aplicación' : 'Nueva Aplicación'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Nombre *
          </label>
          <Input
            placeholder="Ej: SmartCook App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Identificador
          </label>
          <Input
            placeholder="Ej: smartcook-v2"
            value={appIdentifier}
            onChange={(e) => setAppIdentifier(e.target.value)}
          />
          <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Identificador único para handshake (opcional)
          </p>
        </div>

        {!isEditing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
              Token Personalizado
            </label>
            <Input
              placeholder="Dejar vacío para generar automáticamente"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
            />
            <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>
              Formato KDN-PREFIX-HASH (opcional)
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear App'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
