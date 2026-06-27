import { useState, useEffect, useCallback } from 'react';
import { Button, ConfirmDialog, Input, Card } from '@kodan-apps/ui-core';
import { trackerApi, Project } from '../api/client';
import { ProjectForm } from '../components/ProjectForm';
import { Plus, Search, FolderKanban, Pencil, Trash2, Briefcase, Calendar, DollarSign, Clock } from 'lucide-react';

function CircularProgress({ percent, color }: { percent: number; color: string }) {
  const radius = 24;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '48px', height: '48px' }}>
      <svg height="48" width="48" className="transform -rotate-90">
        <circle
          stroke="var(--sys-border-soft)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="24"
          cy="24"
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="24"
          cy="24"
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color: 'var(--sys-text)' }}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

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

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '';
    return new Date(dStr).toISOString().slice(0, 10);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((p) => {
            // Dinero
            const budgetMoney = p.budget_money || 0;
            const actualCost = p.actual_cost || 0;
            const moneyPercent = budgetMoney > 0 ? (actualCost / budgetMoney) * 100 : 0;
            const moneyDiff = budgetMoney - actualCost;
            const moneyIsExceeded = moneyDiff < 0;
            const moneyColor = moneyIsExceeded ? '#EF4444' : moneyPercent > 85 ? '#F97316' : '#22C55E';

            // Horas
            const budgetHours = Number(p.budget_hours) || 0;
            const actualHours = p.actual_hours || 0;
            const hoursPercent = budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
            const hoursDiff = budgetHours - actualHours;
            const hoursIsExceeded = hoursDiff < 0;
            const hoursColor = hoursIsExceeded ? '#EF4444' : hoursPercent > 85 ? '#F97316' : '#22C55E';

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

            return (
              <Card key={p.id} className="p-6 relative hover:shadow-lg transition-all duration-300 border">
                {/* Header row: badge (left) + icons (right) */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
                    {statusLabel}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-50 border rounded-lg flex items-center justify-center" style={{ borderColor: 'var(--sys-border-soft)' }}>
                      <Briefcase size={16} className="text-gray-500" />
                    </div>
                    <button
                      onClick={() => { setEditing(p); setFormOpen(true); }}
                      className="p-2 border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                      style={{ borderColor: 'var(--sys-border-soft)' }}
                      title="Editar"
                    >
                      <Pencil size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="p-2 border rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                      style={{ borderColor: 'var(--sys-border-soft)' }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Project Details */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{
                      background: p.color_hex || 'var(--sys-primary)'
                    }} />
                    <h2 className="text-xl font-bold tracking-tight text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: 'var(--sys-text)' }}>
                      {p.name}
                    </h2>
                  </div>
                  <p className="text-sm font-medium text-gray-500 ml-6" style={{ color: 'var(--sys-text-muted)' }}>
                    {p.client_name || 'Cliente General'}
                  </p>
                  {p.start_date && (
                    <div className="flex items-center gap-1.5 mt-2 ml-6 text-xs text-gray-400">
                      <Calendar size={12} />
                      <span>
                        {formatDate(p.start_date)} {p.end_date ? `→ ${formatDate(p.end_date)}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DINERO PANEL */}
                  <div className="p-4 border rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider" style={{ color: moneyColor }}>
                        <DollarSign size={14} />
                        <span>DINERO</span>
                      </div>
                      <CircularProgress percent={moneyPercent} color={moneyColor} />
                    </div>
                    
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--sys-text-muted)' }}>Presupuesto</span>
                        <span className="font-medium" style={{ color: 'var(--sys-text)' }}>
                          ${budgetMoney.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--sys-text-muted)' }}>Costo Actual</span>
                        <span className="font-medium" style={{ color: 'var(--sys-text)' }}>
                          ${actualCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {budgetMoney > 0 && (
                        <div className="pt-1.5 border-t border-dashed flex justify-between font-semibold" style={{ borderColor: 'var(--sys-border-soft)' }}>
                          <span style={{ color: 'var(--sys-text-muted)' }}>
                            {moneyIsExceeded ? 'Desvío' : 'Sin Consumir'}
                          </span>
                          <span style={{ color: moneyColor }}>
                            {moneyIsExceeded ? '-' : ''}${Math.abs(moneyDiff).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ({Math.round(Math.abs(moneyDiff) / budgetMoney * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HORAS PANEL */}
                  <div className="p-4 border rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider" style={{ color: hoursColor }}>
                        <Clock size={14} />
                        <span>HORAS</span>
                      </div>
                      <CircularProgress percent={hoursPercent} color={hoursColor} />
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--sys-text-muted)' }}>Presupuesto (Hs)</span>
                        <span className="font-medium" style={{ color: 'var(--sys-text)' }}>{budgetHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--sys-text-muted)' }}>Consumido</span>
                        <span className="font-medium" style={{ color: 'var(--sys-text)' }}>{actualHours.toFixed(1)}h</span>
                      </div>
                      {budgetHours > 0 && (
                        <div className="pt-1.5 border-t border-dashed flex justify-between font-semibold" style={{ borderColor: 'var(--sys-border-soft)' }}>
                          <span style={{ color: 'var(--sys-text-muted)' }}>
                            {hoursIsExceeded ? 'Desvío' : 'Sin Consumir'}
                          </span>
                          <span style={{ color: hoursColor }}>
                            {hoursIsExceeded ? '-' : ''}{Math.abs(hoursDiff).toFixed(1)}h ({Math.round(Math.abs(hoursDiff) / budgetHours * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
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
