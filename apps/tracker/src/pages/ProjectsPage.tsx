import { useState, useEffect, useCallback } from 'react';
import { Button, Table, ConfirmDialog, Input, Card } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { trackerApi, Project } from '../api/client';
import { ProjectForm } from '../components/ProjectForm';
import { Plus, Search, FolderKanban } from 'lucide-react';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trackerApi.listProjects();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    await load();
  };

  const handleDelete = async () => {
    if (deleteId) {
      setDeleteId(null);
      await load();
    }
  };

  const columns: TableColumn<Project>[] = [
    { key: 'name', header: 'Nombre', render: (p) => (
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
          background: p.color_hex || 'var(--sys-primary)'
        }} />
        <span>{p.name}</span>
      </div>
    )},
    { key: 'status', header: 'Estado', render: (p) => p.status },
    { key: 'budget_hours', header: 'Horas/Hs', render: (p) => p.budget_hours ?? '-' },
    { key: 'created_at', header: 'Creado', render: (p) => new Date(p.created_at).toLocaleDateString() },
  ];
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={16} className="mr-1" /> Nuevo proyecto
        </Button>
      </div>

      <div className="max-w-xs">
        <Input
          placeholder="Buscar proyectos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      <Card>
        <div className="p-4">
          <Table
            columns={columns}
            data={filtered}
            loading={loading}
            keyExtractor={(p) => p.id}
            emptyState={{
              icon: <FolderKanban size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
              title: 'No hay proyectos',
              description: 'Creá tu primer proyecto para empezar.',
            }}
            editable={{ onClick: (p) => { setEditing(p); setFormOpen(true); } }}
            deletable={{ onClick: (p) => setDeleteId(p.id) }}
          />
        </div>
      </Card>

      <ProjectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        {...(editing ? {
          initial: {
            name: editing.name,
            description: editing.description || undefined,
            status: editing.status,
            budget_hours: editing.budget_hours || undefined,
            color_hex: editing.color_hex || undefined,
          }
        } : {})}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar proyecto"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
