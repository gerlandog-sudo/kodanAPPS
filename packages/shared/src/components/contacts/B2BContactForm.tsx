import { useState, useEffect } from 'react';
import { Input, Button, Select, CustomFieldsForm } from '@kodan-apps/ui-core';
import { User2, Settings2 } from 'lucide-react';
import { B2BService } from '../../services/B2BService';
import type { B2BAccount, B2BContact, CustomFieldDef, B2BContactFormData } from '../../types';

interface B2BContactFormProps {
  contact?: B2BContact | null
  accounts: B2BAccount[]
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function B2BContactForm({ contact, accounts, onClose, onSaved, onError, onSuccess }: B2BContactFormProps) {
  const [form, setForm] = useState<B2BContactFormData>({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    account_id: contact?.account_id ? String(contact.account_id) : '',
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>(contact?.custom_fields || {});
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [tab, setTab] = useState<'general' | 'custom-fields'>('general');

  useEffect(() => {
    B2BService.listCustomFields('contact').then(setFieldDefs).catch(() => {});
  }, []);

  const accountOptions = accounts.map((a) => ({ value: String(a.account_id), label: a.name }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      onError('Nombre, apellido y correo son obligatorios.');
      return;
    }
    if (!form.account_id) {
      onError('Debe seleccionar una cuenta corporativa.');
      return;
    }
    try {
      const payload = {
        ...form,
        account_id: form.account_id ? parseInt(form.account_id, 10) : null,
        custom_fields: customFields,
      };
      if (contact) {
        await B2BService.updateContact(contact.contact_id, payload);
        onSuccess('Contacto actualizado.');
      } else {
        await B2BService.createContact(payload);
        onSuccess('Contacto creado.');
      }
      onSaved();
    } catch (err: any) {
      onError(err?.message || 'Error al guardar el contacto.');
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
            <User2 size={14} /> General
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
                  <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Ej: Juan" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Apellido *</label>
                  <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Ej: Pérez" required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Empresa / Cuenta Asociada *</label>
                <Select
                  options={accountOptions}
                  value={form.account_id}
                  onChange={(val: string) => setForm(p => ({ ...p, account_id: String(val) }))}
                  placeholder="Selecciona la cuenta corporativa"
                  searchable={true}
                />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Correo Electrónico *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="juan.perez@empresa.com" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Teléfono Fijo</label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+54 11 5000-0000" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--sys-text-muted)' }}>Celular / Móvil</label>
                  <Input value={form.mobile} onChange={(e) => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="+54 9 11 2222-3333" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {contact ? 'Actualizar Contacto' : 'Crear Contacto'}
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
              {contact ? 'Actualizar Contacto' : 'Crear Contacto'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
