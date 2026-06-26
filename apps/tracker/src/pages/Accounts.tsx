import { useState, useCallback } from 'react';
import { Modal, ConfirmDialog, Button } from '@kodan-apps/ui-core';
import { exportToExcel } from '@kodan-apps/ui-core';
import { B2BAccountsList, B2BAccountForm, B2BService } from '@kodan-apps/shared';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { B2BAccount } from '@kodan-apps/shared';

export function Accounts() {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountIdToDelete, setAccountIdToDelete] = useState<number | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<B2BAccount | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenCreate = useCallback(() => {
    setSelectedAcc(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((acc: B2BAccount) => {
    setSelectedAcc(acc);
    setShowModal(true);
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setAccountIdToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (accountIdToDelete === null) return;
    try {
      await B2BService.deleteAccount(accountIdToDelete);
      toast.success('Cuenta eliminada.');
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('Error al eliminar la cuenta.');
    } finally {
      setDeleteConfirmOpen(false);
      setAccountIdToDelete(null);
    }
  }, [accountIdToDelete]);

  const handleExportExcel = useCallback(async () => {
    const allAccounts = await B2BService.listAccounts();
    try {
      const dataToExport = allAccounts.map(acc => ({
        name: acc.name,
        legal_name: acc.legal_name || 'Sin razón social',
        tax_id: acc.tax_id || 'Sin TAX ID',
        website: acc.website || 'Sin web',
        phone: acc.phone || 'Sin teléfono',
        address: acc.address || 'Sin dirección',
      }));
      await exportToExcel({
        data: dataToExport,
        columns: [
          { key: 'name', header: 'Empresa / Nombre Comercial' },
          { key: 'legal_name', header: 'Razón Social' },
          { key: 'tax_id', header: 'TAX ID', align: 'center' },
          { key: 'website', header: 'Sitio Web' },
          { key: 'phone', header: 'Teléfono' },
          { key: 'address', header: 'Dirección' },
        ],
        filename: `cuentas_b2b_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Empresas',
      });
      toast.success('Empresas exportadas a Excel con éxito');
    } catch {
      toast.error('Error al exportar empresas a Excel');
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <B2BAccountsList
        onEdit={handleOpenEdit}
        onDelete={handleDeleteClick}
        refreshKey={refreshKey}
        customActions={
          <>
            <Button variant="secondary" onClick={handleExportExcel} className="inline-flex items-center gap-1.5 cursor-pointer">
              <Download size={14} /> Exportar Excel
            </Button>
            <Button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Nueva Empresa
            </Button>
          </>
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={selectedAcc ? 'Editar Cuenta Comercial' : 'Nueva Cuenta Comercial'}
        className="max-w-4xl"
      >
        <B2BAccountForm
          account={selectedAcc}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setRefreshKey(k => k + 1); }}
          onError={(msg) => toast.error(msg)}
          onSuccess={(msg) => toast.success(msg)}
        />
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar cuenta"
        message="¿Está seguro de eliminar esta cuenta?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
