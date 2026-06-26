import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Table } from '@kodan-apps/ui-core';
import { B2BSearchFilter } from '../filters/B2BSearchFilter';
import { useB2BAccounts } from '../../hooks/useB2BAccounts';
import type { B2BAccount } from '../../types';

interface B2BAccountsListProps {
  onEdit: (account: B2BAccount) => void
  onDelete: (id: number) => void
  customActions?: React.ReactNode
  refreshKey?: number
}

export function B2BAccountsList({ onEdit, onDelete, customActions, refreshKey }: B2BAccountsListProps) {
  const { accounts, loading, filter, setFilter, reload } = useB2BAccounts();

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      reload();
    }
  }, [refreshKey, reload]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full no-print">
        <div className="w-full max-w-xs">
          <B2BSearchFilter
            value={filter}
            onChange={setFilter}
            placeholder="Buscar por nombre, razón social o TAX ID..."
          />
        </div>
        <div className="flex items-center gap-3">
          {customActions}
        </div>
      </div>

      <Table
        data={accounts}
        columns={[
          {
            key: 'company',
            header: 'Empresa',
            render: (acc: B2BAccount) => (
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
            render: (acc: B2BAccount) =>
              acc.tax_id
                ? <span className="text-xs font-medium">{acc.tax_id}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
          {
            key: 'website',
            header: 'Web',
            render: (acc: B2BAccount) =>
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
            render: (acc: B2BAccount) =>
              acc.phone
                ? <span className="text-xs font-normal">{acc.phone}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
          {
            key: 'address',
            header: 'Dirección',
            render: (acc: B2BAccount) =>
              acc.address
                ? <span className="text-xs font-normal truncate max-w-[200px] block">{acc.address}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>,
          },
        ]}
        keyExtractor={(acc: B2BAccount) => acc.account_id}
        loading={loading}
        emptyState={{
          icon: <Building2 size={40} />,
          title: filter ? 'No se encontraron cuentas con ese filtro' : 'No hay empresas ni cuentas B2B registradas',
          description: '',
        }}
        editable={{ onClick: (acc: B2BAccount) => onEdit(acc) }}
        deletable={{ onClick: (acc: B2BAccount) => onDelete(acc.account_id) }}
        pageSize={15}
      />
    </div>
  );
}
