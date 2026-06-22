import { useEffect, useState, useCallback } from 'react'
import { Button, Input, ColorPicker, Modal, EntityCard } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import type { StageBulkInput } from '../../api/client'
import type { Pipeline, Stage } from '../../types/admin'
import { STAGE_PRESET_LIST } from '../../utils/stageColorPresets'
import { STAGE_TEMPLATES } from './stageTemplates'
import { usePipelineSync } from '../../hooks/usePipelineSync'
import { Plus, Trash2, Layout, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableStageRow({ stage, idx, editingStages, updateEditingStage, removeEditingStage }: {
  stage: StageBulkInput; idx: number; editingStages: StageBulkInput[]
  updateEditingStage: (idx: number, field: keyof StageBulkInput, value: any) => void
  removeEditingStage: (idx: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `stage-${idx}` })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'var(--sys-surface-hover)' : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="table-row">
      <td className="table-td" style={{ verticalAlign: 'middle', width: '2.5rem', textAlign: 'center' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--sys-text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
      </td>
      <td className="table-td" style={{ verticalAlign: 'middle' }}>
        <Input 
          value={stage.name || ''} 
          onChange={e => updateEditingStage(idx, 'name', e.target.value)} 
          placeholder="Ej: Propuesta" 
          style={{ height: '2rem', padding: '0 0.5rem', fontSize: '0.8125rem' }}
        />
      </td>
      <td className="table-td" style={{ verticalAlign: 'middle', width: '7rem' }}>
        <ColorPicker value={stage.color_hex || '#6366F1'} onChange={color => updateEditingStage(idx, 'color_hex', color)} />
      </td>
      <td className="table-td" style={{ verticalAlign: 'middle', width: '5.5rem' }}>
        <Input 
          type="number" 
          min={0} 
          max={100} 
          value={stage.probability ?? 0} 
          onChange={e => updateEditingStage(idx, 'probability', Math.min(100, Math.max(0, Number(e.target.value))))} 
          style={{ height: '2rem', padding: '0 0.5rem', fontSize: '0.8125rem', width: '100%' }}
        />
      </td>
      <td className="table-td" style={{ verticalAlign: 'middle', width: '12rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[
            { key: 'is_won_stage', label: 'Ganada', color: 'var(--sys-success, #22c55e)' },
            { key: 'is_lost_stage', label: 'Perdida', color: 'var(--sys-error)' },
          ].map(({ key, label, color }) => (
            <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontSize: '0.725rem', fontWeight: 600 }}>
              <input type="radio" name={`st-${idx}`} checked={!!(stage as any)[key]}
                onChange={() => { updateEditingStage(idx, 'is_won_stage', 0); updateEditingStage(idx, 'is_lost_stage', 0); updateEditingStage(idx, key as any, 1) }} />
              <span style={{ color }}>{label}</span>
            </label>
          ))}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontSize: '0.725rem', fontWeight: 600 }}>
            <input type="radio" name={`st-${idx}`} checked={!stage.is_won_stage && !stage.is_lost_stage}
              onChange={() => { updateEditingStage(idx, 'is_won_stage', 0); updateEditingStage(idx, 'is_lost_stage', 0) }} />
            <span style={{ color: 'var(--sys-text-muted)' }}>Abierta</span>
          </label>
        </div>
      </td>
      <td className="table-td table-td-right" style={{ verticalAlign: 'middle', width: '3.5rem' }}>
        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={() => removeEditingStage(idx)} 
            disabled={editingStages.length <= 1}
            className="p-1.5 rounded-lg bg-transparent border border-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            style={{ opacity: editingStages.length <= 1 ? 0.3 : 1, cursor: editingStages.length <= 1 ? 'not-allowed' : 'pointer' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function PipelineManager() {
  const { selectedPipelineId, selectPipeline } = usePipelineSync()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [pipelineName, setPipelineName] = useState('')

  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneName, setCloneName] = useState('')

  const [showReasonsModal, setShowReasonsModal] = useState(false)
  const [wonReasons, setWonReasons] = useState<string[]>([])
  const [lostReasons, setLostReasons] = useState<string[]>([])
  const [newReason, setNewReason] = useState('')
  const [reasonType, setReasonType] = useState<'won' | 'lost'>('won')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadPipelines = useCallback(async () => {
    try {
      const data = await crmApi.listPipelines()
      setPipelines(data)
      if (!selectedPipelineId && data.length > 0) selectPipeline(data[0].id)
    } catch { toast.error('Error al cargar pipelines') }
    finally { setLoading(false) }
  }, [selectedPipelineId])

  const loadStages = useCallback(async (pipelineId: number) => {
    try { setStages((await crmApi.listStages(pipelineId)).sort((a: Stage, b: Stage) => a.sort_order - b.sort_order)) }
    catch { toast.error('Error al cargar etapas') }
  }, [])

  useEffect(() => { loadPipelines() }, [])
  useEffect(() => { if (selectedPipelineId) loadStages(selectedPipelineId) }, [selectedPipelineId])

  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId)

  const handleSavePipeline = async () => {
    if (!pipelineName.trim()) return toast.error('El nombre es requerido')
    try {
      if (editingPipeline) { await crmApi.updatePipeline(editingPipeline.id, { name: pipelineName }); toast.success('Pipeline actualizado') }
      else { await crmApi.createPipeline({ name: pipelineName }); toast.success('Pipeline creado') }
      setShowPipelineModal(false); setEditingPipeline(null); setPipelineName(''); loadPipelines()
    } catch { toast.error('Error al guardar') }
  }

  const handleDeletePipeline = async (id: number) => {
    try { await crmApi.deletePipeline(id); toast.success('Pipeline eliminado'); if (selectedPipelineId === id) selectPipeline(0); loadPipelines() }
    catch { toast.error('Error al eliminar') }
  }

  const [editingStages, setEditingStages] = useState<StageBulkInput[]>([])
  useEffect(() => {
    setEditingStages(stages.map(s => ({
      id: s.id, name: s.name, color_hex: s.color_hex, sort_order: s.sort_order,
      probability: s.probability, is_won_stage: s.is_won_stage, is_lost_stage: s.is_lost_stage,
      ui_config: { preset: s.color_hex },
    })))
  }, [stages])

  const updateEditingStage = (index: number, field: keyof StageBulkInput, value: any) =>
    setEditingStages(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))

  const addEditingStage = () => {
    const nextOrder = editingStages.length > 0 ? Math.max(...editingStages.map(s => s.sort_order || 0)) + 10 : 10
    setEditingStages(prev => [...prev, { name: '', color_hex: STAGE_PRESET_LIST[nextOrder % STAGE_PRESET_LIST.length], sort_order: nextOrder, probability: 0, is_won_stage: 0, is_lost_stage: 0, ui_config: null }])
  }

  const removeEditingStage = (index: number) => { if (editingStages.length > 1) setEditingStages(prev => prev.filter((_, i) => i !== index)) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = parseInt(String(active.id).replace('stage-', ''), 10)
    const newIdx = parseInt(String(over.id).replace('stage-', ''), 10)
    if (isNaN(oldIdx) || isNaN(newIdx)) return
    const updated = [...editingStages]; [updated[oldIdx], updated[newIdx]] = [updated[newIdx], updated[oldIdx]]
    updated.forEach((s, i) => { s.sort_order = (i + 1) * 10 }); setEditingStages(updated)
  }

  const handleSaveStages = async () => {
    if (!selectedPipelineId) return
    for (const s of editingStages) { if (!s.name?.trim()) return toast.error('Todas las etapas deben tener nombre') }
    if (editingStages.filter(s => s.is_won_stage).length !== 1) return toast.error('Debe haber exactamente 1 etapa Ganada')
    if (editingStages.filter(s => s.is_lost_stage).length !== 1) return toast.error('Debe haber exactamente 1 etapa Perdida')
    try { await crmApi.bulkUpdateStages(selectedPipelineId, editingStages); toast.success('Etapas guardadas'); loadStages(selectedPipelineId) }
    catch (err: any) { toast.error(err?.message || 'Error al guardar') }
  }

  const applyTemplate = async (templateKey: string) => {
    if (!selectedPipelineId) return
    const template = STAGE_TEMPLATES[templateKey]
    if (!template) return
    try {
      await crmApi.bulkUpdateStages(selectedPipelineId, template.stages.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 })))
      toast.success(`Plantilla "${template.label}" aplicada`); setShowTemplateModal(false); loadStages(selectedPipelineId)
    } catch { toast.error('Error al aplicar plantilla') }
  }

  const clonePipeline = async () => {
    if (!selectedPipelineId || !cloneName.trim()) return toast.error('El nombre es requerido')
    try {
      const sourceStages = await crmApi.listStages(selectedPipelineId)
      const newPipeline: any = await crmApi.createPipeline({ name: cloneName.trim() })
      await crmApi.bulkUpdateStages(newPipeline.id, sourceStages.map((s: any) => ({
        name: s.name, color_hex: s.color_hex, probability: s.probability,
        is_won_stage: s.is_won_stage, is_lost_stage: s.is_lost_stage, sort_order: s.sort_order,
      })))
      toast.success('Pipeline clonado'); setShowCloneModal(false); setCloneName(''); loadPipelines(); selectPipeline(newPipeline.id)
    } catch { toast.error('Error al clonar') }
  }

  const openReasons = (pipeline: Pipeline) => {
    const config = (pipeline as any).ui_config || {}
    setWonReasons(config.won_reasons || [])
    setLostReasons(config.lost_reasons || [])
    setNewReason('')
    setReasonType('won')
    setShowReasonsModal(true)
  }

  const saveReasons = async () => {
    if (!selectedPipelineId) return
    try {
      await crmApi.updatePipeline(selectedPipelineId, { ui_config: { won_reasons: wonReasons, lost_reasons: lostReasons } })
      toast.success('Motivos guardados'); setShowReasonsModal(false); loadPipelines()
    } catch { toast.error('Error al guardar motivos') }
  }

  const addReason = () => {
    if (!newReason.trim()) return
    if (reasonType === 'won') setWonReasons(prev => [...prev, newReason.trim()])
    else setLostReasons(prev => [...prev, newReason.trim()])
    setNewReason('')
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>

  return (
    <div className="pipeline-manager-layout">
      <div className="pipeline-channels-col">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '2rem', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>CANALES</h3>
          <Button variant="primary" onClick={() => { setEditingPipeline(null); setPipelineName(''); setShowPipelineModal(true) }}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={12} /> Nuevo Canal
          </Button>
        </div>
        <div className="pipeline-channels-list">
          {pipelines.map(p => {
            const isSelected = selectedPipelineId === p.id
            return (
              <EntityCard
                key={p.id}
                title={p.name}
                selected={isSelected}
                onClick={() => selectPipeline(p.id)}
                onEdit={() => { setEditingPipeline(p); setPipelineName(p.name); setShowPipelineModal(true) }}
                onCheck={() => openReasons(p)}
                onClone={() => { setCloneName(`${p.name} (copia)`); setShowCloneModal(true) }}
                onDelete={() => handleDeletePipeline(p.id)}
              />
            )
          })}
          {pipelines.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin canales definidos</p>}
        </div>
      </div>
 
      <div className="pipeline-stages-col">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sys-text-muted)' }}>
            ETAPAS {currentPipeline ? `— ${currentPipeline.name}` : ''}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => { if (selectedPipelineId) setShowTemplateModal(true) }} disabled={!selectedPipelineId}>
              <Layout size={14} /> Aplicar Plantilla
            </Button>
            <Button variant="primary" onClick={addEditingStage} disabled={!selectedPipelineId}>
              <Plus size={14} /> Nueva Etapa
            </Button>
          </div>
        </div>
 
        {selectedPipelineId && editingStages.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editingStages.map((_, i) => `stage-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table-th" style={{ width: '2.5rem', textAlign: 'center' }}></th>
                        <th className="table-th">Nombre de Etapa</th>
                        <th className="table-th" style={{ width: '7rem' }}>Color</th>
                        <th className="table-th" style={{ width: '5.5rem' }}>Probabilidad (%)</th>
                        <th className="table-th" style={{ width: '12rem' }}>Tipo de Etapa</th>
                        <th className="table-th table-th-right" style={{ width: '3.5rem' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingStages.map((stage, idx) => (
                        <SortableStageRow key={`stage-${idx}`} stage={stage} idx={idx} editingStages={editingStages}
                          updateEditingStage={updateEditingStage} removeEditingStage={removeEditingStage} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        ) : selectedPipelineId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', border: '1px dashed var(--sys-border-soft)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>No hay etapas. Agrega la primera.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', border: '1px dashed var(--sys-border-soft)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Selecciona un canal para gestionar sus etapas.</p>
          </div>
        )}
 
        {selectedPipelineId && editingStages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <Button variant="primary" onClick={handleSaveStages}>Guardar Etapas</Button>
          </div>
        )}
      </div>

      <Modal open={showPipelineModal} onClose={() => setShowPipelineModal(false)} title={editingPipeline ? 'Editar Canal' : 'Nuevo Canal'}>
        <form onSubmit={e => { e.preventDefault(); handleSavePipeline() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>NOMBRE DEL CANAL *</label>
            <Input value={pipelineName} onChange={e => setPipelineName(e.target.value)} placeholder="Ej: Ventas Directas" required /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setShowPipelineModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">{editingPipeline ? 'Actualizar' : 'Crear Canal'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Plantillas de Etapas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          {Object.entries(STAGE_TEMPLATES).map(([key, template]) => (
            <button key={key} type="button" onClick={() => applyTemplate(key)}
              style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--sys-text)' }}>{template.label}</span>
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {template.stages.map((s, i) => (
                  <span key={i} style={{ padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 600, background: s.color_hex + '20', color: s.color_hex }}>{s.name}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={showCloneModal} onClose={() => setShowCloneModal(false)} title="Clonar Pipeline">
        <form onSubmit={e => { e.preventDefault(); clonePipeline() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>NOMBRE DEL NUEVO CANAL *</label>
            <Input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="Nombre" required /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCloneModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Clonar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showReasonsModal} onClose={() => setShowReasonsModal(false)} title="Motivos de Ganada/Perdida">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '350px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setReasonType('won')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${reasonType === 'won' ? 'var(--sys-primary)' : 'var(--sys-border-soft)'}`, background: reasonType === 'won' ? 'var(--sys-surface-hover)' : 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', color: 'var(--sys-text)' }}>Ganada</button>
            <button onClick={() => setReasonType('lost')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${reasonType === 'lost' ? 'var(--sys-error)' : 'var(--sys-border-soft)'}`, background: reasonType === 'lost' ? 'var(--sys-surface-hover)' : 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', color: 'var(--sys-text)' }}>Perdida</button>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sys-text-muted)' }}>MOTIVOS</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Nuevo motivo..."
                onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addReason() } }} />
              <button onClick={addReason} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface-raised)', cursor: 'pointer' }}><Plus size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
              {(reasonType === 'won' ? wonReasons : lostReasons).map((r, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 600, background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
                  {r}
                  <button onClick={() => { reasonType === 'won' ? setWonReasons(prev => prev.filter((_, j) => j !== i)) : setLostReasons(prev => prev.filter((_, j) => j !== i)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sys-error)', padding: 0, display: 'flex' }}><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setShowReasonsModal(false)}>Cancelar</Button>
            <Button variant="primary" type="button" onClick={saveReasons}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
