import { useEffect } from 'react';
import { User2 } from 'lucide-react';
import { Table, Select } from '@kodan-apps/ui-core';
import { B2BSearchFilter } from '../filters/B2BSearchFilter';
import { useB2BContacts } from '../../hooks/useB2BContacts';
import type { B2BContact } from '../../types';

interface B2BContactsListProps {
  onEdit: (contact: B2BContact) => void
  onDelete: (id: number) => void
  customActions?: React.ReactNode
  refreshKey?: number
}

export function B2BContactsList({ onEdit, onDelete, customActions, refreshKey }: B2BContactsListProps) {
  const {
    contacts,
    accounts,
    loading,
    searchFilter,
    setSearchFilter,
    accountFilter,
    setAccountFilter,
    reload,
  } = useB2BContacts();

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      reload();
    }
  }, [refreshKey, reload]);

  const accountOptions = [
    { value: '', label: 'Todas las cuentas' },
    ...accounts.map((a) => ({ value: String(a.account_id), label: a.name })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full no-print">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="w-52">
            <Select
              options={accountOptions}
              value={accountFilter ? String(accountFilter) : ''}
              onChange={(val: string) => setAccountFilter(val ? Number(val) : undefined)}
              placeholder="Filtrar por cuenta"
              searchable={true}
            />
          </div>
          <div className="flex-1">
            <B2BSearchFilter
              value={searchFilter}
              onChange={setSearchFilter}
              placeholder="Buscar por nombre, apellido o email..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {customActions}
        </div>
      </div>

      <Table
        data={contacts}
        columns={[
          {
            key: 'contact',
            header: 'Contacto',
            render: (c: B2BContact) => (
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
            render: (c: B2BContact) => (
              <a href={`mailto:${c.email}`} className="hover:underline text-xs font-medium" style={{ color: 'var(--sys-primary)' }}>
                {c.email}
              </a>
            ),
          },
          {
            key: 'phone',
            header: 'Teléfono',
            render: (c: B2BContact) => {
              const parts = [];
              if (c.phone) parts.push(`Fijo: ${c.phone}`);
              if (c.mobile) parts.push(`Móvil: ${c.mobile}`);
              return parts.length > 0
                ? <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{parts.join(' | ')}</span>
                : <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)', opacity: 0.5 }}>—</span>;
            },
          },
        ]}
        keyExtractor={(c: B2BContact) => c.contact_id}
        loading={loading}
        emptyState={{
          icon: <User2 size={40} />,
          title: searchFilter || accountFilter
            ? 'No se encontraron contactos con esos filtros'
            : 'No hay contactos comerciales registrados',
          description: '',
        }}
        editable={{ onClick: (c: B2BContact) => onEdit(c) }}
        deletable={{ onClick: (c: B2BContact) => onDelete(c.contact_id) }}
        pageSize={15}
      />
    </div>
  );
}
