import { useEffect, useState, useCallback } from 'react'
import { Button, Input, ColorPicker, Modal } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { StageBulkInput } from '../../api/client'
import { STAGE_PRESET_LIST } from '../../utils/stageColorPresets'
import { Plus, Edit2, Trash2, Circle, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Pipeline {
  id: number
  name: string
  is_default: number
}

interface Stage {
  id: number
  name: string
  color_hex: string
  sort_order: number
  is_won_stage: number
  is_lost_stage: number
  probability: number
  pipeline_id: number
}

function SortableStage({ stage, idx, editingStages, updateEditingStage, removeEditingStage }: {
  stage: StageBulkInput
  idx: number
  editingStages: StageBulkInput[]
  updateEditingStage: (idx: number, field: keyof StageBulkInput, value: any) => void
  removeEditingStage: (idx: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `stage-${idx}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeft: `4px solid ${stage.color_hex || '#6366F1'}`,
  }

  return (
    <div ref={setNodeRef} style={style} className="card p-4">
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--sys-text-muted)', paddingTop: '0.25rem', display: 'flex' }}>
          <GripVertical size={16} />
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE</label>
            <Input
              value={stage.name || ''}
              onChange={e => updateEditingStage(idx, 'name', e.target.value)}
              placeholder="Ej: Propuesta Enviada"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>COLOR</label>
            <ColorPicker
              value={stage.color_hex || '#6366F1'}
              onChange={color => updateEditingStage(idx, 'color_hex', color)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>PROBABILIDAD (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={stage.probability ?? 0}
              onChange={e => updateEditingStage(idx, 'probability', Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`stage-type-${idx}`}
                checked={!!stage.is_won_stage}
                onChange={() => {
                  updateEditingStage(idx, 'is_won_stage', 1)
                  updateEditingStage(idx, 'is_lost_stage', 0)
                }}
                className="rounded"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Ganada</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`stage-type-${idx}`}
                checked={!!stage.is_lost_stage}
                onChange={() => {
                  updateEditingStage(idx, 'is_lost_stage', 1)
                  updateEditingStage(idx, 'is_won_stage', 0)
                }}
                className="rounded"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--sys-error)' }}>Perdida</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`stage-type-${idx}`}
                checked={!stage.is_won_stage && !stage.is_lost_stage}
                onChange={() => {
                  updateEditingStage(idx, 'is_won_stage', 0)
                  updateEditingStage(idx, 'is_lost_stage', 0)
                }}
                className="rounded"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Abierta</span>
            </label>
          </div>
          <div className="flex items-end justify-end gap-1 pb-1">
            <button
              onClick={() => removeEditingStage(idx)}
              className="btn btn-ghost"
              style={{ padding: '0.25rem', color: 'var(--sys-error)' }}
              disabled={editingStages.length <= 1}
              title="Eliminar etapa"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PipelineManager() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [pipelineName, setPipelineName] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadPipelines = useCallback(async () => {
    try {
      const data = await crmApi.listPipelines()
      setPipelines(data)
      if (!selectedPipelineId && data.length > 0) {
        setSelectedPipelineId(data[0].id)
      }
    } catch {
      toast.error('Error al cargar pipelines')
    } finally {
      setLoading(false)
    }
  }, [selectedPipelineId])

  const loadStages = useCallback(async (pipelineId: number) => {
    try {
      const data = await crmApi.listStages(pipelineId)
      setStages(data.sort((a: Stage, b: Stage) => a.sort_order - b.sort_order))
    } catch {
      toast.error('Error al cargar etapas')
    }
  }, [])

  useEffect(() => { loadPipelines() }, [])
  useEffect(() => { if (selectedPipelineId) loadStages(selectedPipelineId) }, [selectedPipelineId])

  const handleSavePipeline = async () => {
    if (!pipelineName.trim()) return toast.error('El nombre del pipeline es requerido')
    try {
      if (editingPipeline) {
        await crmApi.updatePipeline(editingPipeline.id, { name: pipelineName })
        toast.success('Pipeline actualizado')
      } else {
        await crmApi.createPipeline({ name: pipelineName })
        toast.success('Pipeline creado')
      }
      setShowPipelineModal(false)
      setEditingPipeline(null)
      setPipelineName('')
      loadPipelines()
    } catch { toast.error('Error al guardar pipeline') }
  }

  const handleDeletePipeline = async (id: number) => {
    if (!confirm('¿Eliminar pipeline? Las oportunidades se reasignarán.')) return
    try {
      await crmApi.deletePipeline(id)
      toast.success('Pipeline eliminado')
      if (selectedPipelineId === id) setSelectedPipelineId(null)
      loadPipelines()
    } catch { toast.error('Error al eliminar pipeline') }
  }

  const handleOpenPipelineEdit = (p: Pipeline) => {
    setEditingPipeline(p)
    setPipelineName(p.name)
    setShowPipelineModal(true)
  }

  const [editingStages, setEditingStages] = useState<StageBulkInput[]>([])

  useEffect(() => {
    setEditingStages(stages.map(s => ({
      id: s.id,
      name: s.name,
      color_hex: s.color_hex,
      sort_order: s.sort_order,
      probability: s.probability,
      is_won_stage: s.is_won_stage,
      is_lost_stage: s.is_lost_stage,
      ui_config: { preset: s.color_hex },
    })))
  }, [stages])

  const updateEditingStage = (index: number, field: keyof StageBulkInput, value: any) => {
    setEditingStages(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addEditingStage = () => {
    const nextOrder = editingStages.length > 0
      ? Math.max(...editingStages.map(s => s.sort_order || 0)) + 10
      : 10
    setEditingStages(prev => [...prev, {
      name: '',
      color_hex: STAGE_PRESET_LIST[nextOrder % STAGE_PRESET_LIST.length],
      sort_order: nextOrder,
      probability: 0,
      is_won_stage: 0,
      is_lost_stage: 0,
      ui_config: null,
    }])
  }

  const removeEditingStage = (index: number) => {
    if (editingStages.length <= 1) return
    setEditingStages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = parseInt(String(active.id).replace('stage-', ''), 10)
    const newIdx = parseInt(String(over.id).replace('stage-', ''), 10)
    if (isNaN(oldIdx) || isNaN(newIdx)) return

    const updated = [...editingStages];
    [updated[oldIdx], updated[newIdx]] = [updated[newIdx], updated[oldIdx]]
    updated.forEach((s, i) => { s.sort_order = (i + 1) * 10 })
    setEditingStages(updated)
  }

  const handleSaveStages = async () => {
    if (!selectedPipelineId) return
    for (const s of editingStages) {
      if (!s.name?.trim()) return toast.error('Todas las etapas deben tener nombre')
    }
    const wonCount = editingStages.filter(s => s.is_won_stage).length
    const lostCount = editingStages.filter(s => s.is_lost_stage).length
    if (wonCount !== 1) return toast.error('Debe haber exactamente 1 etapa Ganada')
    if (lostCount !== 1) return toast.error('Debe haber exactamente 1 etapa Perdida')

    try {
      await crmApi.bulkUpdateStages(selectedPipelineId, editingStages)
      toast.success('Etapas guardadas exitosamente')
      loadStages(selectedPipelineId)
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar etapas')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><span className="spinner" /></div>
  }

  return (
    <div className="flex gap-6" style={{ minHeight: '60vh' }}>
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text-muted)' }}>CANALES</h3>
          <button onClick={() => { setEditingPipeline(null); setPipelineName(''); setShowPipelineModal(true) }} className="btn btn-ghost" style={{ padding: '0.25rem' }} title="Nuevo pipeline">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPipelineId(p.id)}
              className="sidebar-link"
              style={{
                background: selectedPipelineId === p.id ? 'var(--sys-primary-container)' : 'transparent',
                color: selectedPipelineId === p.id ? 'var(--color-on-primary-container)' : 'var(--sys-text)',
                fontWeight: selectedPipelineId === p.id ? 600 : 400,
              }}
            >
              <Circle size={12} fill={selectedPipelineId === p.id ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)'} style={{ flexShrink: 0 }} />
              <span className="flex-1 text-left truncate">{p.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleOpenPipelineEdit(p) }} className="p-1 hover:opacity-70"><Edit2 size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeletePipeline(p.id) }} className="p-1 hover:opacity-70" style={{ color: 'var(--sys-error)' }}><Trash2 size={12} /></button>
            </button>
          ))}
          {pipelines.length === 0 && (
            <p className="text-xs italic" style={{ color: 'var(--sys-text-muted)' }}>Sin canales definidos</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            ETAPAS {selectedPipelineId ? `— ${pipelines.find(p => p.id === selectedPipelineId)?.name || ''}` : ''}
          </h3>
          <Button variant="secondary" onClick={addEditingStage} style={{ fontSize: '0.8125rem' }}>
            <Plus size={14} /> Agregar Etapa
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={editingStages.map((_, i) => `stage-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {editingStages.map((stage, idx) => (
                <SortableStage
                  key={`stage-${idx}`}
                  stage={stage}
                  idx={idx}
                  editingStages={editingStages}
                  updateEditingStage={updateEditingStage}
                  removeEditingStage={removeEditingStage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {editingStages.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-xl" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <p className="text-sm italic" style={{ color: 'var(--sys-text-muted)' }}>No hay etapas. Agrega la primera.</p>
          </div>
        )}

        {selectedPipelineId && editingStages.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button variant="primary" className="btn-primary" onClick={handleSaveStages}>
              Guardar Etapas
            </Button>
          </div>
        )}
      </div>

      <Modal open={showPipelineModal} onClose={() => setShowPipelineModal(false)} title={editingPipeline ? 'Editar Canal' : 'Nuevo Canal'}>
        <form onSubmit={e => { e.preventDefault(); handleSavePipeline() }} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE DEL CANAL *</label>
            <Input value={pipelineName} onChange={e => setPipelineName(e.target.value)} placeholder="Ej: Ventas Directas" required />
          </div>
          <div className="flex justify-end gap-3 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowPipelineModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {editingPipeline ? 'Actualizar' : 'Crear Canal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
