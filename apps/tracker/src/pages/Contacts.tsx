import { useState, useCallback } from 'react';
import { Modal, ConfirmDialog, Button } from '@kodan-apps/ui-core';
import { exportToExcel } from '@kodan-apps/ui-core';
import { B2BContactsList, B2BContactForm, useB2BContacts, B2BService } from '@kodan-apps/shared';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { B2BContact } from '@kodan-apps/shared';

export function Contacts() {
  const { contacts, accounts, reload } = useB2BContacts();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactIdToDelete, setContactIdToDelete] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<B2BContact | null>(null);

  const handleOpenCreate = useCallback(() => {
    setSelectedContact(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((c: B2BContact) => {
    setSelectedContact(c);
    setShowModal(true);
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setContactIdToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (contactIdToDelete === null) return;
    try {
      await B2BService.deleteContact(contactIdToDelete);
      toast.success('Contacto eliminado.');
      reload();
    } catch {
      toast.error('Error al eliminar contacto.');
    } finally {
      setDeleteConfirmOpen(false);
      setContactIdToDelete(null);
    }
  }, [contactIdToDelete, reload]);

  const handleExportExcel = useCallback(async () => {
    try {
      const dataToExport = contacts.map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        account: c.account_name || 'Sin empresa',
        email: c.email || 'Sin email',
        phone: c.phone || 'Sin teléfono',
        mobile: c.mobile || 'Sin móvil',
      }));
      await exportToExcel({
        data: dataToExport,
        columns: [
          { key: 'name', header: 'Nombre del Contacto' },
          { key: 'account', header: 'Empresa / Cuenta Asociada' },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Teléfono Fijo', align: 'center' },
          { key: 'mobile', header: 'Celular / Móvil', align: 'center' },
        ],
        filename: `contactos_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Contactos',
      });
      toast.success('Contactos exportados a Excel con éxito');
    } catch {
      toast.error('Error al exportar contactos a Excel');
    }
  }, [contacts]);

  return (
    <div className="flex flex-col gap-6">
      <B2BContactsList
        onEdit={handleOpenEdit}
        onDelete={handleDeleteClick}
        customActions={
          <>
            <Button variant="secondary" onClick={handleExportExcel} className="inline-flex items-center gap-1.5 cursor-pointer">
              <Download size={14} /> Exportar Excel
            </Button>
            <Button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Nuevo Contacto
            </Button>
          </>
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={selectedContact ? 'Editar Contacto' : 'Nuevo Contacto'}
        className="max-w-4xl"
      >
        <B2BContactForm
          contact={selectedContact}
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); reload(); }}
          onError={(msg) => toast.error(msg)}
          onSuccess={(msg) => toast.success(msg)}
        />
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
