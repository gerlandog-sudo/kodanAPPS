import { useState, useEffect } from 'react';
import { Input, Button, CustomFieldsForm } from '@kodan-apps/ui-core';
import { Building2, Settings2 } from 'lucide-react';
import { B2BService } from '../../services/B2BService';
import type { B2BAccount, CustomFieldDef, B2BAccountFormData } from '../../types';

interface B2BAccountFormProps {
  account?: B2BAccount | null
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function B2BAccountForm({ account, onClose, onSaved, onError, onSuccess }: B2BAccountFormProps) {
  const [form, setForm] = useState<B2BAccountFormData>({
    name: account?.name || '',
    legal_name: account?.legal_name || '',
    tax_id: account?.tax_id || '',
    website: account?.website || '',
    phone: account?.phone || '',
    address: account?.address || '',
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>(account?.custom_fields || {});
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [tab, setTab] = useState<'general' | 'custom-fields'>('general');

  useEffect(() => {
    B2BService.listCustomFields('account').then(setFieldDefs).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onError('El nombre comercial es obligatorio.');
      return;
    }
    try {
      const payload = { ...form, custom_fields: customFields };
      if (account) {
        await B2BService.updateAccount(account.account_id, payload);
        onSuccess('Cuenta comercial actualizada.');
      } else {
        await B2BService.createAccount(payload);
        onSuccess('Cuenta comercial creada.');
      }
      onSaved();
    } catch (err: any) {
      onError(err?.message || 'Error al guardar la cuenta.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {fieldDefs.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg mb-2" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
          <button
            type="button"
            onClick={() => setTab('general')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200 cursor-pointer border-none"
            style={{
              background: tab === 'general' ? 'var(--sys-primary-container)' : 'transparent',
              color: tab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
              fontWeight: tab === 'general' ? 600 : 500,
            }}
          >
            <Building2 size={14} /> General
          </button>
          <button
            type="button"
            onClick={() => setTab('custom-fields')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200 cursor-pointer border-none"
            style={{
              background: tab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent',
              color: tab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
              fontWeight: tab === 'custom-fields' ? 600 : 500,
            }}
          >
            <Settings2 size={14} /> Campos Personalizados
          </button>
        </div>
      )}

      {tab === 'general' ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Nombre Comercial *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: KODAN Software Corp" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Razón Social / Nombre Legal</label>
                <Input value={form.legal_name} onChange={(e) => setForm(p => ({ ...p, legal_name: e.target.value }))} placeholder="Ej: KODAN S.A." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Identificación Tributaria (TAX ID)</label>
                <Input value={form.tax_id} onChange={(e) => setForm(p => ({ ...p, tax_id: e.target.value }))} placeholder="Ej: 30-71458983-9" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Teléfono de Contacto</label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Ej: +54 11 5236-9874" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Sitio Web Corporativo</label>
                <Input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} placeholder="Ej: www.kodan.software" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Dirección Postal</label>
                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Ej: Av. del Libertador 4200, CABA" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {account ? 'Actualizar Cuenta' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
          <CustomFieldsForm
            definitions={fieldDefs}
            values={customFields}
            onChange={(key: string, value: any) => setCustomFields(prev => ({ ...prev, [key]: value }))}
          />
          <div className="flex justify-end gap-3 pt-4 w-full" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" className="btn-primary" onClick={handleSubmit}>
              {account ? 'Actualizar Cuenta' : 'Crear Cuenta'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
