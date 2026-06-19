import { useEffect, useState } from 'react';
import { Button, Input, Modal, CustomFieldsForm, Table, ConfirmDialog } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { Plus, Building2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountIdToDelete, setAccountIdToDelete] = useState<number | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'custom-fields'>('general');

  // Custom fields
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Form State
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    website: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await crmApi.listAccounts();
      setAccounts(data);
    } catch {
      toast.error('Error al cargar cuentas.');
    } finally {
      setLoading(false);
    }
  };

  const loadFieldDefs = async () => {
    try {
      setFieldDefs(await crmApi.listCustomFields('account'))
    } catch { /* ignore */ }
  }

  const handleOpenCreate = () => {
    setSelectedAcc(null);
    setForm({
      name: '',
      legal_name: '',
      tax_id: '',
      website: '',
      phone: '',
      address: '',
    });
    setCustomFields({});
    setModalTab('general')
    loadFieldDefs()
    setShowModal(true);
  };

  const handleOpenEdit = (acc: any) => {
    setSelectedAcc(acc);
    setForm({
      name: acc.name || '',
      legal_name: acc.legal_name || '',
      tax_id: acc.tax_id || '',
      website: acc.website || '',
      phone: acc.phone || '',
      address: acc.address || '',
    });
    setCustomFields(acc.custom_fields || {});
    setModalTab('general')
    loadFieldDefs()
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre comercial es obligatorio.');
      return;
    }

    try {
      const payload = { ...form, custom_fields: customFields }
      if (selectedAcc) {
        await crmApi.updateAccount(selectedAcc.account_id, payload);
        toast.success('Cuenta comercial actualizada.');
      } else {
        await crmApi.createAccount(payload);
        toast.success('Cuenta comercial creada.');
      }
      setShowModal(false);
      loadAccounts();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la cuenta.');
    }
  };

  const handleDeleteClick = (id: number) => {
    setAccountIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (accountIdToDelete === null) return;
    try {
      await crmApi.deleteAccount(accountIdToDelete);
      toast.success('Cuenta comercial eliminada.');
      loadAccounts();
    } catch {
      toast.error('Error al eliminar la cuenta.');
    } finally {
      setDeleteConfirmOpen(false);
      setAccountIdToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nueva Empresa
        </Button>
      </div>

      <Table
        data={accounts}
        columns={[
          {
            key: 'company',
            header: 'Empresa',
            render: acc => (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <Building2 size={14} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{acc.name}</p>
                  {acc.legal_name && <p className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{acc.legal_name}</p>}
                </div>
              </>
            ),
          },
          {
            key: 'tax_id',
            header: 'TAX ID',
            render: acc =>
              acc.tax_id
                ? <span className="text-xs font-medium">{acc.tax_id}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
          {
            key: 'website',
            header: 'Web',
            render: acc =>
              acc.website
                ? (
                  <a
                    href={acc.website.startsWith('http') ? acc.website : `https://${acc.website}`}
                    target="_blank" rel="noreferrer"
                    className="hover:underline text-xs font-medium"
                    style={{ color: 'var(--sys-primary)' }}
                  >
                    {acc.website.replace(/^https?:\/\//, '')}
                  </a>
                )
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
          {
            key: 'phone',
            header: 'Teléfono',
            render: acc =>
              acc.phone
                ? <span className="text-xs font-normal">{acc.phone}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
          {
            key: 'address',
            header: 'Dirección',
            render: acc =>
              acc.address
                ? <span className="text-xs font-normal truncate max-w-[200px] block">{acc.address}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
        ]}
        keyExtractor={acc => acc.account_id}
        loading={loading}
        emptyState={{
          icon: <Building2 size={40} />,
          title: 'No hay empresas ni cuentas B2B registradas',
          description: '',
        }}
        editable={{ onClick: acc => handleOpenEdit(acc) }}
        deletable={{ onClick: acc => handleDeleteClick(acc.account_id) }}
        pageSize={15}
      />

      {/* Modal Creación / Edición */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedAcc ? 'Editar Cuenta Comercial' : 'Nueva Cuenta Comercial'}>
        <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
          <button onClick={() => setModalTab('general')} className="btn" style={{ background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'general' ? 600 : 500, fontSize: '0.8125rem' }}>
            <Building2 size={14} /> General
          </button>
          {fieldDefs.length > 0 && (
            <button onClick={() => setModalTab('custom-fields')} className="btn" style={{ background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent', color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)', fontWeight: modalTab === 'custom-fields' ? 600 : 500, fontSize: '0.8125rem' }}>
              <Settings2 size={14} /> Campos Personalizados
            </button>
          )}
        </div>

        {modalTab === 'general' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE COMERCIAL *</label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} 
                placeholder="Ej: KODAN Software Corp" 
                required 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>RAZÓN SOCIAL / NOMBRE LEGAL</label>
              <Input 
                value={form.legal_name} 
                onChange={(e) => setForm(prev => ({ ...prev, legal_name: e.target.value }))} 
                placeholder="Ej: KODAN S.A." 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>IDENTIFICACIÓN TRIBUTARIA (TAX ID)</label>
                <Input 
                  value={form.tax_id} 
                  onChange={(e) => setForm(prev => ({ ...prev, tax_id: e.target.value }))} 
                  placeholder="Ej: 30-71458983-9" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>TELÉFONO DE CONTACTO</label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} 
                  placeholder="Ej: +54 11 5236-9874" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>SITIO WEB corporativo</label>
              <Input 
                value={form.website} 
                onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} 
                placeholder="Ej: www.kodan.software" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>DIRECCIÓN POSTAL</label>
              <Input 
                value={form.address} 
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} 
                placeholder="Ej: Av. del Libertador 4200, CABA" 
              />
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" type="submit" className="btn-primary">
                {selectedAcc ? 'Actualizar Cuenta' : 'Crear Cuenta'}
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
                {selectedAcc ? 'Actualizar Cuenta' : 'Crear Cuenta'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar cuenta"
        message="¿Está seguro de eliminar esta cuenta? Esto no eliminará las negociaciones asociadas, pero se desvincularán."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
