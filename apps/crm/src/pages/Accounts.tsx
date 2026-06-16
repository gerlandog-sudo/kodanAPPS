import { useEffect, useState } from 'react';
import { Card, Button, Input, Modal, CustomFieldsForm } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import type { CustomFieldDef } from '../api/client';
import { Plus, Edit, Trash2, Building2, Globe, Phone, MapPin, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
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

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta? Esto no eliminará las negociaciones asociadas, pero se desvincularán.')) return;
    try {
      await crmApi.deleteAccount(id);
      toast.success('Cuenta comercial eliminada.');
      loadAccounts();
    } catch {
      toast.error('Error al eliminar la cuenta.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nueva Empresa
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <Card key={acc.account_id} className="p-5 double-bevel-card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{acc.name}</h4>
                      {acc.legal_name && <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>{acc.legal_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(acc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Editar">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(acc.account_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs mt-2" style={{ color: 'var(--sys-text-muted)' }}>
                  {acc.tax_id && <p>CUIT/TAX: <span className="font-medium text-slate-700 dark:text-slate-300">{acc.tax_id}</span></p>}
                  {acc.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} />
                      <a href={acc.website.startsWith('http') ? acc.website : `https://${acc.website}`} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: 'var(--sys-primary)' }}>
                        {acc.website}
                      </a>
                    </div>
                  )}
                  {acc.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} />
                      <span>{acc.phone}</span>
                    </div>
                  )}
                  {acc.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      <span className="truncate">{acc.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {accounts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-10 bg-slate-50 dark:background-slate-900 rounded-xl border border-dashed">
              <Building2 size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
              <p className="text-sm italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>No hay empresas ni cuentas B2B registradas.</p>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
