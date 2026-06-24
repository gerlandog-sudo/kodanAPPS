import { useEffect, useState, useCallback } from 'react'
import { Button } from './Button'
import { Table } from './Table'
import type { TableColumn, TableAction } from './Table'
import { ConfirmDialog } from './ConfirmDialog'
import { EmailTemplateBuilder } from './EmailTemplateBuilder'
import { api } from '../api/client'
import { FileText, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export interface EmailTemplatesSettingsPanelProps {
  moduleContext?: string // 'crm', 'tracker', etc.
}

interface EmailTemplate {
  id: number
  tenant_id: number
  name: string
  subject: string
  body: string
  module: string | null
  created_at: string
  updated_at: string | null
}

export function EmailTemplatesSettingsPanel({ moduleContext = 'crm' }: EmailTemplatesSettingsPanelProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  
  // Deletion state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<EmailTemplate[]>('/api/mail/templates', { module: moduleContext })
      setTemplates(data)
    } catch {
      toast.error('Error al cargar las plantillas de correo')
    } finally {
      setLoading(false)
    }
  }, [moduleContext])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setViewState('create')
  }

  const handleOpenEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setViewState('edit')
  }

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return
    setActionLoading(true)
    try {
      await api.delete(`/api/mail/templates/${templateToDelete.id}`)
      toast.success('Plantilla eliminada correctamente')
      loadTemplates()
    } catch {
      toast.error('Error al eliminar la plantilla')
    } finally {
      setActionLoading(false)
      setDeleteConfirmOpen(false)
      setTemplateToDelete(null)
    }
  }

  const handleSaveTemplate = async (data: { name: string; subject: string; body: string; module?: string | null }) => {
    setActionLoading(true)
    try {
      if (viewState === 'create') {
        await api.post('/api/mail/templates', { ...data, module: moduleContext })
        toast.success('Plantilla creada con éxito')
      } else if (viewState === 'edit' && editingTemplate) {
        await api.patch(`/api/mail/templates/${editingTemplate.id}`, data)
        toast.success('Plantilla actualizada con éxito')
      }
      setViewState('list')
      loadTemplates()
    } catch {
      toast.error('Error al guardar la plantilla')
    } finally {
      setActionLoading(false)
    }
  }

  // Columnas de la Tabla
  const columns: TableColumn<EmailTemplate>[] = [
    {
      key: 'name',
      header: 'Nombre de Plantilla',
      render: (t) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-text-muted shrink-0" />
          <span style={{ fontWeight: 600, color: 'var(--sys-text)' }}>{t.name}</span>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Asunto de Correo',
      render: (t) => (
        <span className="text-text-muted" style={{ fontSize: '0.8125rem' }}>
          {t.subject}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Creado',
      render: (t) => (
        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--sys-text-muted)' }}>
          {new Date(t.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ]

  const rowActions: TableAction<EmailTemplate>[] = [
    {
      label: 'Editar',
      icon: <Edit size={14} />,
      onClick: handleOpenEdit,
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      onClick: handleDeleteClick,
      variant: 'danger',
    },
  ]

  if (viewState === 'create' || viewState === 'edit') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewState('list')}
            className="flex items-center justify-center p-2 rounded-lg bg-surface-raised border border-solid border-border-soft hover:bg-surface-hover text-text transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>
              {viewState === 'create' ? 'Nueva Plantilla de Correo' : 'Editar Plantilla de Correo'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>
              Define el asunto, el cuerpo y las variables dinámicas del correo
            </p>
          </div>
        </div>

        <div className="bg-surface-raised border border-solid border-border-soft rounded-lg p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 215px)' }}>
          <EmailTemplateBuilder
            initialData={editingTemplate ? {
              name: editingTemplate.name,
              subject: editingTemplate.subject,
              body: editingTemplate.body,
              module: editingTemplate.module,
            } : undefined}
            onSave={handleSaveTemplate}
            onCancel={() => setViewState('list')}
            saving={actionLoading}
            moduleContext={moduleContext}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>
            Plantillas de Correo ({moduleContext.toUpperCase()})
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>
            Administra las plantillas para envío de correos desde este módulo
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus size={14} className="mr-1 inline-block" /> Nueva Plantilla
        </Button>
      </div>

      {/* Tabla */}
      <Table<EmailTemplate>
        data={templates}
        columns={columns}
        keyExtractor={(t) => t.id}
        loading={loading}
        actions={rowActions}
        emptyState={{
          icon: <FileText size={24} />,
          title: 'Sin plantillas',
          description: `No hay plantillas de correo registradas para ${moduleContext.toUpperCase()}.`,
        }}
      />

      {/* Diálogo de Confirmación para Borrado */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar Plantilla"
        message={`¿Estás seguro de que deseas eliminar la plantilla "${templateToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        loading={actionLoading}
      />
    </div>
  )
}
