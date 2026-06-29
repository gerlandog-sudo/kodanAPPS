import { useState, useEffect, useCallback } from 'react';
import { Button, Table, DatePicker, Select, ConfirmDialog, useAuth } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { trackerApi, TimeEntry, Project, ProjectTask } from '../api/client';
import { TimerWidget } from '../components/TimerWidget';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { TimeEntryHistoryModal } from '../components/TimeEntryHistoryModal';
import { Clock, Send, Trash2, Edit3, CheckCircle, History, Calendar } from 'lucide-react';

export function TimeEntriesPage() {
  const { canApproveHours } = useAuth('tracker');
  const canSeeAll = canApproveHours;

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Filtros
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Formularios y diálogos
  const [formOpen, setFormOpen] = useState(false);
  const [formDuration, setFormDuration] = useState<number | undefined>();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntryId, setHistoryEntryId] = useState<number | null>(null);

  const handleHistoryClick = (id: number) => {
    setHistoryEntryId(id);
    setHistoryOpen(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { 
        page: String(page), 
        per_page: String(perPage) 
      };
      if (filterProject) params.project_id = filterProject;
      if (filterUser) params.user_id = filterUser;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;

      const res = await trackerApi.listTimeEntries(params);
      setEntries(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filterProject, filterUser, filterDateFrom, filterDateTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    trackerApi.listProjects().then(setProjects).catch(() => {});
    trackerApi.getAllBoards().then((board) => {
      setTasks(Object.values(board.itemsByStage).flat());
    }).catch(() => {});

    if (canSeeAll) {
      trackerApi.listProfiles().then(setCollaborators).catch(() => {});
    }
  }, [canSeeAll]);

  // Manejadores de acciones
  const handleTimerSave = (duration: number) => {
    setFormDuration(duration);
    setEditingEntry(null);
    setFormOpen(true);
  };

  const handleEditClick = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormDuration(undefined);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const handleSubmitClick = async (id: number) => {
    try {
      await trackerApi.submitTimeEntry(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSave = async (data: any) => {
    try {
      if (editingEntry) {
        await trackerApi.updateTimeEntry(editingEntry.id, data);
      } else {
        await trackerApi.createTimeEntry(data);
      }
      setFormOpen(false);
      setEditingEntry(null);
      setFormDuration(undefined);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await trackerApi.deleteTimeEntry(deleteId);
        setDeleteId(null);
        load();
      } catch (err) {
        console.error(err);
      }
    }
  };


  // Generar label de mes dinámico en base al filtro DESDE o fecha actual
  const getMonthYearLabel = () => {
    const dateStr = filterDateFrom || new Date().toISOString().split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length < 2) return '';
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = parts[0];
    return `${monthName} ${year}`;
  };

  // Opciones para los filtros
  const projectOptions = [
    { value: '', label: 'Todos' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  const userOptions = [
    { value: '', label: 'Todos' },
    ...collaborators.map((c) => ({ value: String(c.user_id), label: c.user_name })),
  ];

  // Columnas de la Tabla
  const columns: TableColumn<TimeEntry>[] = [
    { 
      key: 'date', 
      header: 'FECHA', 
      render: (e) => {
        const parts = e.date.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return e.date;
      }
    },
    { 
      key: 'project_name', 
      header: 'PROYECTO', 
      render: (e) => <span className="font-medium text-text">{e.project_name || '—'}</span> 
    },
    { 
      key: 'task_type_name', 
      header: 'TAREA', 
      render: (e) => {
        const label = e.task_type_name || e.task_title || 'General';
        const bg = e.task_type_color ? `${e.task_type_color}15` : 'rgba(107, 114, 128, 0.1)';
        const color = e.task_type_color || 'var(--sys-text-muted)';
        return (
          <span 
            className="text-[11px] px-2.5 py-0.5 rounded font-medium border"
            style={{ background: bg, color: color, borderColor: `${color}25` }}
          >
            {label}
          </span>
        );
      }
    },
    { 
      key: 'description', 
      header: 'DESCRIPCIÓN', 
      render: (e) => <span className="text-text-muted text-xs line-clamp-1 max-w-[250px]" title={e.description || ''}>{e.description || '—'}</span> 
    },
    { 
      key: 'duration_minutes', 
      header: 'HORAS', 
      render: (e) => <span className="font-bold text-[14px]">{(e.duration_minutes / 60).toFixed(2)}h</span> 
    },
    { 
      key: 'approval_status', 
      header: 'ESTADO', 
      render: (e) => {
        const colors: Record<string, string> = {
          draft: '#6b7280', submitted: '#d97706', approved: '#16a34a', rejected: '#dc2626',
        };
        const labels: Record<string, string> = {
          draft: 'Borrador', submitted: 'En Aprobación', approved: 'Aprobado', rejected: 'Rechazado',
        };
        const color = colors[e.approval_status];
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <span 
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: `${color}15`, color }}
            >
              {e.approval_status === 'submitted' && <Send size={10} />}
              {e.approval_status === 'approved' && <CheckCircle size={10} />}
              {labels[e.approval_status]}
            </span>
            {e.approval_status === 'approved' && e.approved_by_name && (
              <span className="text-[10px] text-text-muted opacity-80 ml-1">
                por {e.approved_by_name}
              </span>
            )}
            {e.approval_status === 'rejected' && e.rejected_reason && (
              <span className="text-[10px] text-error font-medium ml-1 max-w-[150px] line-clamp-1" title={e.rejected_reason}>
                {e.rejected_reason}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'acciones',
      header: 'ACCIONES',
      align: 'right',
      render: (e) => {
        const userCanEdit = e.approval_status === 'draft' || canSeeAll;
        const userCanDelete = e.approval_status === 'draft' || canSeeAll;
        const userCanSubmit = e.approval_status === 'draft';

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              disabled={!userCanEdit}
              onClick={() => handleEditClick(e)}
              className={`p-1.5 rounded-md border border-border-soft bg-surface text-text-muted hover:text-primary hover:bg-primary-hover/10 hover:border-primary/30 transition-all ${
                !userCanEdit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'
              }`}
              title="Editar"
            >
              <Edit3 size={13} />
            </button>

            <button
              disabled={!userCanDelete}
              onClick={() => handleDeleteClick(e.id)}
              className={`p-1.5 rounded-md border border-border-soft bg-surface text-text-muted hover:text-error hover:bg-error-container hover:border-error/30 transition-all ${
                !userCanDelete ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'
              }`}
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>

            {userCanSubmit && (
              <button
                onClick={() => handleSubmitClick(e.id)}
                className="p-1.5 rounded-md border border-border-soft bg-surface text-text-muted hover:text-primary hover:bg-primary-hover/10 hover:border-primary/30 cursor-pointer active:scale-95 transition-all"
                title="Enviar a Aprobación"
              >
                <Send size={13} />
              </button>
            )}

            <button
              onClick={() => handleHistoryClick(e.id)}
              className="p-1.5 rounded-md border border-border-soft bg-surface text-text-muted hover:text-primary hover:bg-primary-hover/10 hover:border-primary/30 cursor-pointer active:scale-95 transition-all"
              title="Historial"
            >
              <History size={13} />
            </button>
          </div>
        );
      }
    }
  ];

  const totalPages = Math.ceil(total / perPage);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  // Cálculos de Paginación
  const startRecord = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endRecord = Math.min(page * perPage, total);
  const showingText = total === 0 
    ? 'Sin registros' 
    : total <= perPage
      ? `Mostrando todos los registros (${total})`
      : `Mostrando registros del ${startRecord} al ${endRecord} de ${total}`;

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Tarjeta de Filtros y Acciones */}
      <div className="bg-surface-raised border border-border-soft p-5 rounded-xl shadow-sm flex flex-wrap xl:flex-nowrap items-end gap-4 w-full shrink-0">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Desde</label>
          <DatePicker value={filterDateFrom} onChange={(val) => { setFilterDateFrom(val); setPage(1); }} />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Hasta</label>
          <DatePicker value={filterDateTo} onChange={(val) => { setFilterDateTo(val); setPage(1); }} />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-48 shrink-0">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Proyecto</label>
          <Select options={projectOptions} value={filterProject} onChange={(val) => { setFilterProject(val); setPage(1); }} />
        </div>
        {canSeeAll && (
          <div className="flex flex-col gap-1 w-full sm:w-48 shrink-0">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Colaborador</label>
            <Select options={userOptions} value={filterUser} onChange={(val) => { setFilterUser(val); setPage(1); }} />
          </div>
        )}

        {/* Botones de acción del timer y registro */}
        <div className="ml-auto flex items-center gap-3 shrink-0 pb-0.5">
          <TimerWidget onSave={handleTimerSave} />
          <Button 
            variant="primary" 
            onClick={() => { setEditingEntry(null); setFormDuration(undefined); setFormOpen(true); }}
            className="h-10 px-5 shadow-sm font-semibold flex items-center justify-center animate-none"
          >
            Registrar tiempo
          </Button>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="flex-1 bg-surface-raised border border-border-soft rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
        {/* Cabecera del Listado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft shrink-0">
          <h2 className="text-base font-bold text-text">Historial de Registros</h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Calendar size={14} />
            <span className="capitalize">{getMonthYearLabel()}</span>
          </div>
        </div>

        {/* Tabla Física */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-0">
          <Table
            columns={columns}
            data={entries}
            loading={loading}
            keyExtractor={(e) => e.id}
            emptyState={{
              icon: <Clock size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
              title: 'No hay registros de tiempo',
              description: 'Registrá tu primer entrada de tiempo con el cronómetro o el botón "Registrar tiempo".',
            }}
          />
        </div>

        {/* Footer con Paginación */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-soft shrink-0">
          <div className="text-xs font-semibold text-text-muted">
            {showingText}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                disabled={page === 1} 
                onClick={handlePrevPage}
                className="py-1.5 px-3 text-xs"
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`size-7 text-xs font-bold rounded-md transition-all flex items-center justify-center border ${
                      isCurrent 
                        ? 'bg-primary text-on-primary border-primary shadow-sm' 
                        : 'bg-surface border-border-soft hover:bg-surface-hover text-text-muted hover:text-text'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <Button 
                variant="ghost" 
                disabled={page === totalPages} 
                onClick={handleNextPage}
                className="py-1.5 px-3 text-xs"
              >
                Siguiente
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Filas:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs font-bold bg-surface border border-border-soft rounded px-2.5 py-1.5 focus:outline-none cursor-pointer text-text"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <TimeEntryForm
        open={formOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        projects={projects}
        tasks={tasks}
        initialDuration={formDuration}
        initialEntry={editingEntry}
      />

      {/* Confirmador */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar registro"
        message="¿Estás seguro que deseas eliminar este registro de horas?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />

      {/* Historial */}
      <TimeEntryHistoryModal
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryEntryId(null); }}
        entryId={historyEntryId}
      />
    </div>
  );

  function handleFormClose() {
    setFormOpen(false);
    setEditingEntry(null);
    setFormDuration(undefined);
  }
}
