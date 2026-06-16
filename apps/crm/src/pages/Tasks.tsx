import { useEffect, useState } from 'react';
import { Card, Button, Input, Modal } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { Plus, Edit, Trash2, Calendar, ListTodo, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    opportunity_id: '',
    due_date: '',
    status: 'pending',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(String(val)) || 0);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskList, oppList] = await Promise.all([
        crmApi.listTasks(),
        crmApi.listOpportunities(),
      ]);
      setTasks(taskList);
      setOpportunities(oppList);
    } catch {
      toast.error('Error al cargar la agenda comercial.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setForm({
      title: '',
      opportunity_id: '',
      due_date: '',
      status: 'pending',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (t: any) => {
    setSelectedTask(t);
    setForm({
      title: t.title || '',
      opportunity_id: t.opportunity_id ? String(t.opportunity_id) : '',
      due_date: t.due_date || '',
      status: t.status || 'pending',
      description: t.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('El título de la tarea es obligatorio.');
      return;
    }

    try {
      const payload = {
        ...form,
        opportunity_id: form.opportunity_id ? parseInt(form.opportunity_id, 10) : null,
      };

      if (selectedTask) {
        await crmApi.updateTask(selectedTask.id, payload);
        toast.success('Tarea comercial actualizada.');
      } else {
        await crmApi.createTask(payload);
        toast.success('Tarea comercial agendada.');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la tarea.');
    }
  };

  const handleToggleStatus = async (task: any) => {
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await crmApi.updateTask(task.id, { status: nextStatus });
      toast.success(nextStatus === 'completed' ? 'Tarea completada.' : 'Tarea reabierta.');
      loadData();
    } catch {
      toast.error('Error al actualizar tarea.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta tarea?')) return;
    try {
      await crmApi.deleteTask(id);
      toast.success('Tarea eliminada de la agenda.');
      loadData();
    } catch {
      toast.error('Error al eliminar tarea.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nueva Tarea
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';

            return (
              <Card key={t.id} className="p-5 double-bevel-card flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={t.status === 'completed'}
                        onChange={() => handleToggleStatus(t)}
                        className="rounded cursor-pointer w-4 h-4 accent-indigo-600"
                      />
                      <div>
                        <h4 className={`font-bold text-sm tracking-tight ${t.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-600' : ''}`}>
                          {t.title}
                        </h4>
                        {t.opportunity_name && (
                          <p className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--sys-text-muted)' }}>
                            Negoc: {t.opportunity_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs line-clamp-2 mt-2" style={{ color: 'var(--sys-text-muted)' }}>{t.description || 'Sin descripción comercial.'}</p>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: 'var(--sys-border-soft)' }}>
                  {t.due_date ? (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} style={{ color: isOverdue ? 'var(--sys-error)' : 'var(--sys-text-muted)' }} />
                      <span className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                        Vence: {t.due_date}
                      </span>
                      {isOverdue && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--sys-text-muted)' }}>Sin fecha</span>
                  )}
                  <span className={`badge ${t.status === 'completed' ? 'badge-active' : 'badge-inactive'}`}>
                    {t.status === 'completed' ? 'Completada' : 'Pendiente'}
                  </span>
                </div>
              </Card>
            );
          })}

          {tasks.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-10 bg-slate-50 dark:background-slate-900 rounded-xl border border-dashed">
              <ListTodo size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
              <p className="text-sm italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>No hay tareas de ventas agendadas.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Creación / Edición */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedTask ? 'Editar Tarea Comercial' : 'Nueva Tarea Comercial'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>TÍTULO DE LA TAREA *</label>
            <Input 
              value={form.title} 
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
              placeholder="Ej: Llamar por propuesta técnica" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>FECHA DE VENCIMIENTO</label>
              <Input 
                type="date"
                value={form.due_date} 
                onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>ESTADO</label>
              <select 
                className="input select" 
                value={form.status} 
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="pending">Pendiente</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NEGOCIACIÓN VINCULADA</label>
            <select 
              className="input select" 
              value={form.opportunity_id} 
              onChange={(e) => setForm(prev => ({ ...prev, opportunity_id: e.target.value }))}
            >
              <option value="">Selecciona la negociación relacionada</option>
              {opportunities.map(o => (
                <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.value)})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOTAS / DESCRIPCIÓN</label>
            <textarea 
              className="input text-xs" 
              rows={3}
              value={form.description} 
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Detalles adicionales, recordatorio de temas a conversar..." 
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {selectedTask ? 'Actualizar Tarea' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
