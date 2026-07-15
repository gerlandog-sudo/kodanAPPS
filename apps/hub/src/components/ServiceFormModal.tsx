import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@kodan-apps/ui-core';
import type { SelectOption } from '@kodan-apps/ui-core';
import { hubAdminApi, ServiceAssignment, HubApp, CatalogEntry } from '../api/client';

interface ServiceFormModalProps {
  service: ServiceAssignment | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export function ServiceFormModal({ service, onSave, onClose }: ServiceFormModalProps) {
  const [appId, setAppId] = useState<number | ''>('');
  const [catalogId, setCatalogId] = useState<number | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState(1);
  const [apps, setApps] = useState<HubApp[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!service;

  useEffect(() => {
    // Load dropdown data
    const loadData = async () => {
      try {
        const [appsRes, catalogRes] = await Promise.all([
          hubAdminApi.getApps({ limit: '100' }),
          hubAdminApi.getCatalog({ limit: '100' }),
        ]);
        setApps(appsRes.data);
        setCatalog(catalogRes.data);
      } catch (err) {
        setError('Error al cargar datos del formulario');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (service) {
      setAppId(service.app_id);
      setCatalogId(service.catalog_id);
      setApiKey(service.api_key);
      setPriority(service.priority);
    } else {
      setAppId('');
      setCatalogId('');
      setApiKey('');
      setPriority(1);
    }
  }, [service]);

  const appOptions: SelectOption[] = apps
    .filter(a => a.status === 'active')
    .map(a => ({ value: String(a.id), label: a.name }));

  const catalogOptions: SelectOption[] = catalog
    .filter(c => c.is_active)
    .map(c => ({ value: String(c.id), label: `${c.name} (${c.provider})` }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId || !catalogId) {
      setError('Debe seleccionar una app y un modelo');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        app_id: appId,
        catalog_id: catalogId,
        api_key: apiKey.trim(),
        priority,
      });
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
      title={isEditing ? 'Editar Asignación' : 'Nueva Asignación'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Aplicación *
          </label>
          <Select
            options={appOptions}
            value={String(appId)}
            onChange={(v) => setAppId(Number(v))}
            placeholder="Seleccionar app..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Modelo *
          </label>
          <Select
            options={catalogOptions}
            value={String(catalogId)}
            onChange={(v) => setCatalogId(Number(v))}
            placeholder="Seleccionar modelo..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            API Key del Proveedor *
          </label>
          <Input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--sys-on-bg)' }}>
            Prioridad
          </label>
          <Input
            type="number"
            min={1}
            max={100}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
          <p className="text-xs" style={{ color: 'var(--sys-on-bg-muted)' }}>
            A menor número, mayor prioridad (1 = máxima)
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Asignación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
