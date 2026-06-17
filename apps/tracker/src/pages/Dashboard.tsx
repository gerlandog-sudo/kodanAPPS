import { useEffect, useState } from 'react';
import { trackerApi, type Project } from '../api/client';
import { FolderKanban, AlertCircle, Loader2 } from 'lucide-react';

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackerApi.listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar proyectos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--sys-primary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={40} style={{ color: 'var(--sys-error)' }} />
        <p style={{ color: 'var(--sys-text-muted)' }}>{error}</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#dcfce7', text: '#166534' },
      paused: { bg: '#fef9c3', text: '#854d0e' },
      completed: { bg: '#e0e7ff', text: '#3730a3' },
    };
    const c = colors[status] ?? { bg: '#f1f5f9', text: '#475569' };
    return (
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ background: c.bg, color: c.text }}
      >
        {status === 'active' ? 'Activo' : status === 'paused' ? 'Pausado' : 'Completado'}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-montserrat)' }}>
            Proyectos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sys-text-muted)' }}>
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FolderKanban size={48} style={{ color: 'var(--sys-text-muted)', opacity: 0.4 }} />
          <p style={{ color: 'var(--sys-text-muted)' }}>No hay proyectos aún.</p>
          <p className="text-sm" style={{ color: 'var(--sys-text-muted)', opacity: 0.6 }}>
            Los proyectos se crean automáticamente al ganar una negociación en kodanCRM.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl p-5 transition-shadow hover:shadow-md"
              style={{ background: 'var(--sys-surface-raised)', border: '1px solid var(--sys-border-soft)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate" style={{ color: 'var(--sys-text)' }}>
                    {project.name}
                  </h3>
                  {project.budget_hours !== null && (
                    <p className="text-xs mt-1" style={{ color: 'var(--sys-text-muted)' }}>
                      Horas presupuestadas: {project.budget_hours}h
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {statusBadge(project.status)}
                </div>
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--sys-text-muted)', opacity: 0.6 }}>
                Creado el {new Date(project.created_at).toLocaleDateString('es-AR', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
