import { useEffect, useState } from 'react';
import { Card, Button, Input, Modal, CustomFieldsForm } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { Plus, Edit, Trash2, User2, Mail, Phone, Building2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'custom-fields'>('general');

  // Custom fields
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Form State
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    account_id: '',
  });

  useEffect(() => {
    loadContactsAndAccounts();
  }, []);

  const loadContactsAndAccounts = async () => {
    setLoading(true);
    try {
      const [conts, accs] = await Promise.all([
        crmApi.listContacts(),
        crmApi.listAccounts(),
      ]);
      setContacts(conts);
      setAccounts(accs);
    } catch {
      toast.error('Error al cargar contactos.');
    } finally {
      setLoading(false);
    }
  };

  const loadFieldDefs = async () => {
    try { setFieldDefs(await crmApi.listCustomFields('contact')) } catch { /* ignore */ }
  }

  const handleOpenCreate = () => {
    setSelectedContact(null);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      account_id: '',
    });
    setCustomFields({});
    setModalTab('general')
    loadFieldDefs()
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setSelectedContact(c);
    setForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      email: c.email || '',
      phone: c.phone || '',
      mobile: c.mobile || '',
      account_id: c.account_id ? String(c.account_id) : '',
    });
    setCustomFields(c.custom_fields || {});
    setModalTab('general')
    loadFieldDefs()
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Nombre, apellido y correo son obligatorios.');
      return;
    }

    try {
      const payload = {
        ...form,
        account_id: form.account_id ? parseInt(form.account_id, 10) : null,
        custom_fields: customFields,
      };

      if (selectedContact) {
        await crmApi.updateContact(selectedContact.contact_id, payload);
        toast.success('Contacto comercial actualizado.');
      } else {
        await crmApi.createContact(payload);
        toast.success('Contacto comercial creado.');
      }
      setShowModal(false);
      loadContactsAndAccounts();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el contacto.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este contacto?')) return;
    try {
      await crmApi.deleteContact(id);
      toast.success('Contacto eliminado.');
      loadContactsAndAccounts();
    } catch {
      toast.error('Error al eliminar contacto.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nuevo Contacto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map(c => (
            <Card key={c.contact_id} className="p-5 double-bevel-card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--sys-tertiary) 12%, transparent)', color: 'var(--sys-tertiary)' }}>
                      <User2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{c.first_name} {c.last_name}</h4>
                      {c.account_name && (
                        <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
                          <Building2 size={11} />
                          <span className="text-[10px] truncate max-w-[150px]">{c.account_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Editar">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(c.contact_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs mt-2" style={{ color: 'var(--sys-text-muted)' }}>
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} />
                    <a href={`mailto:${c.email}`} className="hover:underline" style={{ color: 'var(--sys-primary)' }}>{c.email}</a>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} />
                      <span>Fijo: {c.phone}</span>
                    </div>
                  )}
                  {c.mobile && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} />
                      <span>Móvil: {c.mobile}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {contacts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-10 bg-slate-50 dark:background-slate-900 rounded-xl border border-dashed">
              <User2 size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
              <p className="text-sm italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>No hay contactos comerciales registrados.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Creación / Edición */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedContact ? 'Editar Contacto' : 'Nuevo Contacto'}>
        <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
          <button onClick={() => setModalTab('general')} className="btn" style={{ background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'general' ? 600 : 500, fontSize: '0.8125rem' }}>
            <User2 size={14} /> General
          </button>
          {fieldDefs.length > 0 && (
            <button onClick={() => setModalTab('custom-fields')} className="btn" style={{ background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'custom-fields' ? 600 : 500, fontSize: '0.8125rem' }}>
              <Settings2 size={14} /> Campos Personalizados
            </button>
          )}
        </div>

        {modalTab === 'general' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE *</label>
                <Input 
                  value={form.first_name} 
                  onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))} 
                  placeholder="Ej: Juan" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>APELLIDO *</label>
                <Input 
                  value={form.last_name} 
                  onChange={(e) => setForm(prev => ({ ...prev, last_name: e.target.value }))} 
                  placeholder="Ej: Pérez" 
                  required 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>CORREO ELECTRÓNICO *</label>
              <Input 
                type="email"
                value={form.email} 
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} 
                placeholder="juan.perez@empresa.com" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>TELÉFONO FIJO</label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} 
                  placeholder="Ej: +54 11 5000-0000" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>CELULAR / MÓVIL</label>
                <Input 
                  value={form.mobile} 
                  onChange={(e) => setForm(prev => ({ ...prev, mobile: e.target.value }))} 
                  placeholder="Ej: +54 9 11 2222-3333" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>EMPRESA / CUENTA ASOCIADA</label>
              <select 
                className="input select" 
                value={form.account_id} 
                onChange={(e) => setForm(prev => ({ ...prev, account_id: e.target.value }))}
              >
                <option value="">Selecciona la cuenta corporativa</option>
                {accounts.map(a => (
                  <option key={a.account_id} value={a.account_id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" type="submit" className="btn-primary">
                {selectedContact ? 'Actualizar Contacto' : 'Crear Contacto'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <CustomFieldsForm
              definitions={fieldDefs}
              values={customFields}
              onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
            />
            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" className="btn-primary" onClick={handleSubmit}>
                {selectedContact ? 'Actualizar Contacto' : 'Crear Contacto'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
