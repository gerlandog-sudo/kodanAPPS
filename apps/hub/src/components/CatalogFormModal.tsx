import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@kodan-apps/ui-core';
import type { SelectOption } from '@kodan-apps/ui-core';
import { CatalogEntry } from '../api/client';

interface CatalogFormModalProps {
  entry: CatalogEntry | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const PROVIDER_OPTIONS: SelectOption[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google AI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: 'Custom' },
];

const PROTOCOL_OPTIONS: SelectOption[] = [
  { value: 'openai-v1', label: 'OpenAI v1' },
  { value: 'gemini-v1', label: 'Gemini v1' },
];

export function CatalogFormModal({ entry, onSave, onClose }: CatalogFormModalProps) {
  const [provider, setProvider] = useState('openai');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [protocol, setProtocol] = useState('openai-v1');
  const [endpoint, setEndpoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!entry;

  useEffect(() => {
    if (entry) {
      setProvider(entry.provider);
      setName(entry.name);
      setIdentifier(entry.identifier);
      setProtocol(entry.protocol);
      setEndpoint(entry.endpoint);
    } else {
      setProvider('openai');
      setName('');
      setIdentifier('');
      setProtocol('openai-v1');
      setEndpoint('');
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) {
      setError('Nombre e identificador son obligatorios');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {
        provider,
        name: name.trim(),
        identifier: identifier.trim(),
        protocol,
        endpoint: endpoint.trim() || null,
      };
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
      title={isEditing ? 'Editar Modelo' : 'Nuevo Modelo'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Proveedor
          </label>
          <Select
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(v) => setProvider(v as string)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Nombre *
          </label>
          <Input
            placeholder="Ej: GPT-4o"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Identificador *
          </label>
          <Input
            placeholder="Ej: gpt-4o-2024-08-06"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Protocolo
          </label>
          <Select
            options={PROTOCOL_OPTIONS}
            value={protocol}
            onChange={(v) => setProtocol(v as string)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Endpoint Personalizado
          </label>
          <Input
            placeholder="https://api.openai.com/v1/chat/completions"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
          <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Dejar vacío para usar el endpoint por defecto del proveedor
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Modelo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
