import { useState, useEffect, useRef, useCallback } from 'react'
import { SlidePanel } from './SlidePanel'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import { Bold, Italic, Underline, List, Send, Eye, EyeOff, Braces } from 'lucide-react'
import { toast } from 'sonner'

export interface EmailComposerProps {
  open: boolean
  onClose: () => void
  entityType?: string
  entityId?: number
  recipientEmail?: string
  entityData?: Record<string, any>
  moduleContext?: string // 'crm', 'tracker', etc.
  onSent?: () => void
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
  module: string | null
}

export function EmailComposer({
  open,
  onClose,
  entityType,
  entityId,
  recipientEmail = '',
  entityData = {},
  moduleContext = 'crm',
  onSent,
}: EmailComposerProps) {
  const { user: currentUser } = useAuth(moduleContext)
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  
  const [to, setTo] = useState(recipientEmail)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  
  const [previewMode, setPreviewMode] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  // Reset inputs when opened
  useEffect(() => {
    if (open) {
      setTo(recipientEmail)
      setSubject('')
      setBodyHtml('')
      setSelectedTemplateId('')
      setPreviewMode(false)
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
      
      // Cargar plantillas
      api.get<EmailTemplate[]>('/api/mail/templates', { module: moduleContext })
        .then(setTemplates)
        .catch(() => toast.error('Error al cargar plantillas'))

      // Buscar email de contacto automáticamente para crm_opportunity
      if (entityType === 'crm_opportunity' && entityId && !recipientEmail) {
        api.get<any[]>('/api/crm/opportunities')
          .then(opps => {
            const opp = opps.find(o => o.id === entityId)
            if (opp && opp.contact_id) {
              api.get<any[]>('/api/crm/contacts')
                .then(contacts => {
                  const contact = contacts.find(c => c.contact_id === opp.contact_id)
                  if (contact && contact.email) {
                    setTo(contact.email)
                  }
                })
            }
          })
          .catch(() => {})
      }
    }
  }, [open, recipientEmail, moduleContext, entityType, entityId])

  // Cambiar contenido al elegir una plantilla
  const handleTemplateChange = (val: string) => {
    setSelectedTemplateId(val)
    if (!val) {
      setSubject('')
      setBodyHtml('')
      if (editorRef.current) editorRef.current.innerHTML = ''
      return
    }

    const t = templates.find(x => String(x.id) === val)
    if (t) {
      setSubject(t.subject)
      setBodyHtml(t.body)
      if (editorRef.current) {
        editorRef.current.innerHTML = t.body
      }
    }
  }

  // Guardar y restaurar selección
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedRangeRef.current)
      }
    }
  }

  const handleFormat = (command: string) => {
    if (previewMode) return
    restoreSelection()
    document.execCommand(command, false)
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }
    saveSelection()
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }
    saveSelection()
  }

  // Insertar variable manual en compositor
  const handleInsertVariable = (key: string) => {
    if (previewMode) return
    restoreSelection()
    const variableTag = `{{${key}}}`
    const sel = window.getSelection()
    
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const node = document.createTextNode(variableTag)
      range.insertNode(node)
      range.setStartAfter(node)
      range.setEndAfter(node)
      sel.removeAllRanges()
      sel.addRange(range)
    } else if (editorRef.current) {
      editorRef.current.innerHTML += variableTag
    }

    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
      editorRef.current.focus()
    }
    saveSelection()
  }

  // Reemplazar variables para la previsualización en caliente y el envío final
  const getInterpolationMap = useCallback(() => {
    return {
      contact_name: entityData.contact_name || entityData.name || '',
      contact_email: entityData.contact_email || entityData.email || to,
      contact_phone: entityData.contact_phone || entityData.phone || '',
      opportunity_name: entityData.opportunity_name || entityData.title || '',
      opportunity_value: entityData.opportunity_value || (entityData.value ? `$ ${entityData.value}` : ''),
      account_name: entityData.account_name || entityData.company || '',
      sender_name: currentUser?.display_name || '',
      sender_email: currentUser?.email || '',
    }
  }, [entityData, currentUser, to])

  const interpolateString = (text: string) => {
    const map = getInterpolationMap()
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const k = key.trim() as keyof typeof map
      return map[k] !== undefined ? String(map[k]) : match
    })
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !bodyHtml.trim()) {
      return toast.warning('Por favor completa todos los campos obligatorios.')
    }

    setLoading(true)
    try {
      // Reemplazar variables dinámicas antes del envío final en backend
      const finalSubject = interpolateString(subject)
      const finalBody = interpolateString(bodyHtml)

      await api.post('/api/mail/send', {
        to: to.trim(),
        subject: finalSubject,
        body: finalBody,
        entity_type: entityType,
        entity_id: entityId,
      })

      toast.success('Correo electrónico enviado correctamente.')
      if (onSent) onSent()
      onClose()
    } catch {
      toast.error('Error al enviar el correo.')
    } finally {
      setLoading(false)
    }
  }

  const variables = [
    { key: 'contact_name', label: 'Nombre Contacto' },
    { key: 'opportunity_name', label: 'Nombre Oportunidad' },
    { key: 'account_name', label: 'Empresa' },
    { key: 'sender_name', label: 'Remitente' },
  ]

  const templateOptions = [
    { value: '', label: 'Sin plantilla (Redactar libre)' },
    ...templates.map(t => ({ value: String(t.id), label: t.name }))
  ]

  return (
    <SlidePanel open={open} onClose={onClose} title="Enviar Correo Electrónico" width="550px">
      <div className="flex flex-col gap-4 h-full pb-4" style={{ fontFamily: 'var(--font-hanken-grotesk, system-ui)' }}>
        
        {/* Dropdown de Plantillas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Cargar Plantilla</label>
          <Select
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            options={templateOptions}
          />
        </div>

        {/* Input Para */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Para</label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="destinatario@correo.com"
            disabled={previewMode}
            required
          />
        </div>

        {/* Input Asunto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Asunto</label>
          <Input
            value={previewMode ? interpolateString(subject) : subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            disabled={previewMode}
            required
          />
        </div>

        {/* Editor de Mensaje */}
        <div className="flex-1 flex flex-col border border-solid rounded-lg overflow-hidden" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
          
          {/* Toolbar del Compositor */}
          <div className="flex items-center justify-between p-2 border-b border-solid border-border-soft bg-surface-raised shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFormat('bold')}
                disabled={previewMode}
                title="Negrita"
                style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: previewMode ? 'var(--sys-text-muted)' : 'var(--sys-text)', borderRadius: '0.25rem', cursor: previewMode ? 'not-allowed' : 'pointer' }}
                className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('italic')}
                disabled={previewMode}
                title="Cursiva"
                style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: previewMode ? 'var(--sys-text-muted)' : 'var(--sys-text)', borderRadius: '0.25rem', cursor: previewMode ? 'not-allowed' : 'pointer' }}
                className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('underline')}
                disabled={previewMode}
                title="Subrayado"
                style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: previewMode ? 'var(--sys-text-muted)' : 'var(--sys-text)', borderRadius: '0.25rem', cursor: previewMode ? 'not-allowed' : 'pointer' }}
                className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
              >
                <Underline size={14} />
              </button>
              <div style={{ width: '1px', height: '1rem', background: 'var(--sys-border-soft)', margin: '0 0.125rem' }} />
              <button
                type="button"
                onClick={() => handleFormat('insertUnorderedList')}
                disabled={previewMode}
                title="Lista Desordenada"
                style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: previewMode ? 'var(--sys-text-muted)' : 'var(--sys-text)', borderRadius: '0.25rem', cursor: previewMode ? 'not-allowed' : 'pointer' }}
                className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
              >
                <List size={14} />
              </button>
            </div>

            {/* Toggle de Previsualización */}
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid var(--sys-border-soft)',
                background: previewMode ? 'color-mix(in srgb, var(--sys-primary) 10%, var(--sys-surface))' : 'var(--sys-surface)',
                color: previewMode ? 'var(--sys-primary)' : 'var(--sys-text)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
              className="hover:bg-surface-hover transition-colors"
            >
              {previewMode ? (
                <>
                  <EyeOff size={12} />
                  <span>Volver a Editar</span>
                </>
              ) : (
                <>
                  <Eye size={12} />
                  <span>Previsualizar</span>
                </>
              )}
            </button>
          </div>

          {/* Área contentEditable o Preview */}
          {previewMode ? (
            <div
              className="flex-1 p-4 overflow-y-auto"
              style={{
                color: 'var(--sys-text)',
                background: 'var(--sys-surface-raised)',
                fontFamily: 'sans-serif',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ __html: interpolateString(bodyHtml) }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onBlur={saveSelection}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              className="flex-1 p-4 overflow-y-auto outline-none"
              style={{
                color: 'var(--sys-text)',
                background: 'var(--sys-surface)',
                fontFamily: 'sans-serif',
                lineHeight: '1.6',
              }}
              data-placeholder="Redacta el contenido de tu correo..."
            />
          )}
        </div>

        {/* Tags de Variables Rápidas */}
        {!previewMode && (
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-solid border-border-soft bg-surface-raised shrink-0">
            <div className="flex items-center gap-1.5">
              <Braces size={12} className="text-primary" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text)' }}>Insertar Variable</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  className="px-2 py-1 rounded text-xs border border-solid border-border-soft hover:border-primary hover:bg-surface active:scale-[0.95] transition-all cursor-pointer font-semibold"
                  style={{
                    background: 'var(--sys-surface)',
                    color: 'var(--sys-text-muted)',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-3 border-t border-solid border-border-soft shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={loading || !to.trim() || !subject.trim() || !bodyHtml.trim()}>
            <Send size={14} className="mr-1 inline-block" /> {loading ? 'Enviando...' : 'Enviar Correo'}
          </Button>
        </div>

      </div>
    </SlidePanel>
  )
}
