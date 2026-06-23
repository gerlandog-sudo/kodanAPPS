import { useEffect, useState, useMemo } from 'react';
import { Button, Input, Modal, CustomFieldsForm, Table, ConfirmDialog, Select } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { Plus, User2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactIdToDelete, setContactIdToDelete] = useState<number | null>(null);
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

  const accountSelectOptions = useMemo(() => {
    return accounts.map((a) => ({ value: a.account_id, label: a.name }));
  }, [accounts]);

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

  const handleDeleteClick = (id: number) => {
    setContactIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (contactIdToDelete === null) return;
    try {
      await crmApi.deleteContact(contactIdToDelete);
      toast.success('Contacto eliminado.');
      loadContactsAndAccounts();
    } catch {
      toast.error('Error al eliminar contacto.');
    } finally {
      setDeleteConfirmOpen(false);
      setContactIdToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nuevo Contacto
        </Button>
      </div>

      <Table
        data={contacts}
        columns={[
          {
            key: 'contact',
            header: 'Contacto',
            render: c => (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-tertiary) 12%, transparent)', color: 'var(--sys-tertiary)' }}>
                  <User2 size={14} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{c.first_name} {c.last_name}</p>
                  {c.account_name && <p className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{c.account_name}</p>}
                </div>
              </>
            ),
          },
          {
            key: 'email',
            header: 'Email',
            render: c => (
              <a href={`mailto:${c.email}`} className="hover:underline text-xs font-medium" style={{ color: 'var(--sys-primary)' }}>
                {c.email}
              </a>
            ),
          },
          {
            key: 'phone',
            header: 'Teléfono',
            render: c => {
              const parts = []
              if (c.phone) parts.push(`Fijo: ${c.phone}`)
              if (c.mobile) parts.push(`Móvil: ${c.mobile}`)
              return parts.length > 0
                ? <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{parts.join(' | ')}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>
            },
          },
        ]}
        keyExtractor={c => c.contact_id}
        loading={loading}
        emptyState={{
          icon: <User2 size={40} />,
          title: 'No hay contactos comerciales registrados',
          description: '',
        }}
        editable={{ onClick: c => handleOpenEdit(c) }}
        deletable={{ onClick: c => handleDeleteClick(c.contact_id) }}
        pageSize={15}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedContact ? 'Editar Contacto' : 'Nuevo Contacto'} className="max-w-4xl">
        {fieldDefs.length > 0 && (
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
            <button 
              type="button"
              onClick={() => setModalTab('general')} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200 cursor-pointer border-none" 
              style={{ 
                background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent', 
                color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', 
                fontWeight: modalTab === 'general' ? 600 : 500 
              }}
            >
              <User2 size={14} /> General
            </button>
            <button 
              type="button"
              onClick={() => setModalTab('custom-fields')} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200 cursor-pointer border-none" 
              style={{ 
                background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent', 
                color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', 
                fontWeight: modalTab === 'custom-fields' ? 600 : 500 
              }}
            >
              <Settings2 size={14} /> Campos Personalizados
            </button>
          </div>
        )}

        {modalTab === 'general' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda - Identificación Personal */}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
                    <Input 
                      value={form.first_name} 
                      onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))} 
                      placeholder="Ej: Juan" 
                      required 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Apellido *</label>
                    <Input 
                      value={form.last_name} 
                      onChange={(e) => setForm(prev => ({ ...prev, last_name: e.target.value }))} 
                      placeholder="Ej: Pérez" 
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Empresa / Cuenta Asociada</label>
                  <Select
                    options={accountSelectOptions}
                    value={form.account_id}
                    onChange={(val) => setForm(prev => ({ ...prev, account_id: String(val) }))}
                    placeholder="Selecciona la cuenta corporativa"
                    searchable={true}
                  />
                </div>
              </div>

              {/* Columna Derecha - Información de Contacto */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Correo Electrónico *</label>
                  <Input 
                    type="email"
                    value={form.email} 
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} 
                    placeholder="juan.perez@empresa.com" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Teléfono Fijo</label>
                    <Input 
                      value={form.phone} 
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} 
                      placeholder="Ej: +54 11 5000-0000" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wide uppercase text-text-muted" style={{ color: 'var(--sys-text-muted)' }}>Celular / Móvil</label>
                    <Input 
                      value={form.mobile} 
                      onChange={(e) => setForm(prev => ({ ...prev, mobile: e.target.value }))} 
                      placeholder="Ej: +54 9 11 2222-3333" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" type="submit" className="btn-primary">
                {selectedContact ? 'Actualizar Contacto' : 'Crear Contacto'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            <CustomFieldsForm
              definitions={fieldDefs}
              values={customFields}
              onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
            />
            <div className="flex justify-end gap-3 pt-4 w-full" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" className="btn-primary" onClick={handleSubmit}>
                {selectedContact ? 'Actualizar Contacto' : 'Crear Contacto'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar contacto"
        message="¿Está seguro de eliminar este contacto?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
