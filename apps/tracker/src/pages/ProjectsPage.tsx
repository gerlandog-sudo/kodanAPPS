import { useState, useEffect, useCallback } from 'react';
import { Button, ConfirmDialog, Input, EntityCard, Card } from '@kodan-apps/ui-core';
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

  useEffect(() => {
    load();
  }, [load]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: any) => {
    if (editing) {
      await trackerApi.updateProject(editing.id, data);
    } else {
      await trackerApi.createProject(data);
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await trackerApi.deleteProject(deleteId);
      setDeleteId(null);
      await load();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-hanken-grotesk, system-ui)' }}>
          Proyectos del Tracker
        </h1>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>Cargando proyectos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border border-dashed">
          <FolderKanban size={48} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} className="mb-4" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--sys-text)' }}>No hay proyectos</h3>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--sys-text-muted)' }}>
            {search ? 'No se encontraron proyectos con ese nombre.' : 'Creá tu primer proyecto para empezar.'}
          </p>
          {!search && (
            <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={16} className="mr-1" /> Nuevo proyecto
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            // Badge status styling
            let statusLabel = 'ACTIVO';
            let statusClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
            if (p.status === 'paused') {
              statusLabel = 'PAUSADO';
              statusClass = 'bg-amber-50 text-amber-600 border border-amber-100';
            } else if (p.status === 'completed') {
              statusLabel = 'COMPLETADO';
              statusClass = 'bg-blue-50 text-blue-600 border border-blue-100';
            }

            const badge = (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
                {statusLabel}
              </span>
            );

            // Display actual hours / budget hours in a clean way
            const hoursDisplay = p.budget_hours 
              ? `${(p.actual_hours || 0).toFixed(1)}h / ${p.budget_hours.toFixed(1)}h`
              : undefined;

            return (
              <EntityCard
                key={p.id}
                title={p.name}
                badge={badge}
                amount={p.budget_money || undefined}
                quoteTotal={p.actual_cost || undefined}
                accountName={p.client_name || 'Cliente General'}
                startDate={p.start_date || undefined}
                closeDate={p.end_date || undefined}
                ownerName={hoursDisplay}
                stageColor={p.color_hex || 'var(--sys-primary)'}
                onEdit={() => { setEditing(p); setFormOpen(true); }}
                onDelete={() => setDeleteId(p.id)}
              />
            );
          })}
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        {...(editing ? {
          initial: {
            id: editing.id,
            name: editing.name,
            description: editing.description || undefined,
            status: editing.status,
            color_hex: editing.color_hex || undefined,
            account_id: editing.account_id,
            budget_hours: editing.budget_hours || undefined,
            budget_money: editing.budget_money || undefined,
            start_date: editing.start_date || undefined,
            end_date: editing.end_date || undefined,
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
