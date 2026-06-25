import { useState, useRef, useEffect } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Bold, Italic, Underline, List, ListOrdered, Braces } from 'lucide-react'

export interface EmailTemplateBuilderProps {
  initialData?: {
    name: string
    subject: string
    body: string
    module?: string | null
  }
  onSave: (data: { name: string; subject: string; body: string; module?: string | null }) => void | Promise<void>
  onCancel: () => void
  saving?: boolean
  moduleContext?: string
}

interface VariableOption {
  key: string
  label: string
  description: string
}

type InsertTarget = 'subject' | 'body'

export function EmailTemplateBuilder({
  initialData,
  onSave,
  onCancel,
  saving = false,
  moduleContext,
}: EmailTemplateBuilderProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(initialData?.body ?? '')
  const [module] = useState(initialData?.module ?? moduleContext ?? 'crm')

  const editorRef = useRef<HTMLDivElement>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const subjectCursorRef = useRef<number>(0)
  const activeTargetRef = useRef<InsertTarget>('body')

  // Indicador visual de target activo
  const [activeTarget, setActiveTarget] = useState<InsertTarget>('body')

  // Sincronizar estado inicial
  useEffect(() => {
    if (editorRef.current && initialData) {
      editorRef.current.innerHTML = initialData.body
    }
  }, [initialData])

  // Lista de variables contextuales
  const variables: VariableOption[] = [
    { key: 'contact_name', label: 'Nombre del Contacto', description: 'Nombre completo del contacto/lead' },
    { key: 'contact_email', label: 'Email del Contacto', description: 'Correo electrónico del destinatario' },
    { key: 'contact_phone', label: 'Teléfono del Contacto', description: 'Teléfono del contacto' },
    { key: 'opportunity_name', label: 'Nombre de Oportunidad', description: 'Nombre de la oportunidad asociada' },
    { key: 'opportunity_value', label: 'Valor de Oportunidad', description: 'Valor estimado de la venta' },
    { key: 'account_name', label: 'Empresa', description: 'Nombre de la empresa/cuenta' },
    { key: 'sender_name', label: 'Operador', description: 'Nombre del remitente (operador)' },
    { key: 'sender_email', label: 'Email del Operador', description: 'Email del remitente (operador)' },
  ]

  // ========================================================================
  // Body editor: selection tracking
  // ========================================================================

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      // Only save if selection is inside our editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
        activeTargetRef.current = 'body'
      }
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
    restoreSelection()
    document.execCommand(command, false)
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }
    saveSelection()
  }

  // ========================================================================
  // Subject field: cursor tracking
  // ========================================================================

  const handleSubjectFocus = () => {
    activeTargetRef.current = 'subject'
    setActiveTarget('subject')
  }

  const handleSubjectSelect = () => {
    if (subjectInputRef.current) {
      subjectCursorRef.current = subjectInputRef.current.selectionStart ?? subject.length
      activeTargetRef.current = 'subject'
    }
  }

  // ========================================================================
  // Variable insertion — target-aware
  // ========================================================================

  const insertVariableIntoSubject = (variableKey: string) => {
    const tag = `{{${variableKey}}}`
    const pos = subjectCursorRef.current
    const newSubject = subject.slice(0, pos) + tag + subject.slice(pos)
    setSubject(newSubject)
    // Move cursor after inserted tag
    const newPos = pos + tag.length
    subjectCursorRef.current = newPos
    // Focus back and set cursor
    requestAnimationFrame(() => {
      if (subjectInputRef.current) {
        subjectInputRef.current.focus()
        subjectInputRef.current.setSelectionRange(newPos, newPos)
      }
    })
  }

  const insertVariableIntoBody = (variableKey: string) => {
    restoreSelection()
    const variableTag = `{{${variableKey}}}`

    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      // Verify we're inside the editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents()
        const textNode = document.createTextNode(variableTag)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        sel.removeAllRanges()
        sel.addRange(range)
      } else {
        // Fallback: append at end
        if (editorRef.current) {
          editorRef.current.focus()
          document.execCommand('insertText', false, variableTag)
        }
      }
    } else if (editorRef.current) {
      editorRef.current.innerHTML += variableTag
    }

    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
      editorRef.current.focus()
    }
    saveSelection()
  }

  const handleInsertVariable = (variableKey: string) => {
    if (activeTargetRef.current === 'subject') {
      insertVariableIntoSubject(variableKey)
    } else {
      insertVariableIntoBody(variableKey)
    }
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }
    saveSelection()
  }

  const handleEditorFocus = () => {
    activeTargetRef.current = 'body'
    setActiveTarget('body')
  }

  const handleSave = () => {
    onSave({
      name,
      subject,
      body: bodyHtml,
      module,
    })
  }

  return (
    <div className="flex flex-col gap-6 h-full min-h-[500px]" style={{ fontFamily: 'var(--font-hanken-grotesk, system-ui)' }}>
      {/* Campos de Nombre y Asunto */}
      <div className="flex flex-col gap-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Nombre de la Plantilla</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bienvenida a Cliente"
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Asunto por Defecto</label>
          <input
            ref={subjectInputRef}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              handleSubjectSelect()
            }}
            onFocus={handleSubjectFocus}
            onSelect={handleSubjectSelect}
            onKeyUp={handleSubjectSelect}
            onClick={handleSubjectSelect}
            placeholder="Ej. Hola {{contact_name}}, bienvenido a nuestra plataforma"
            required
            className="w-full px-4 py-3 rounded-md border border-border-soft bg-surface-raised text-text text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-[300px]">
        {/* Editor WYSIWYG */}
        <div className="flex-1 flex flex-col border border-solid rounded-lg overflow-hidden" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
          {/* Barra de Herramientas */}
          <div className="flex items-center gap-1 p-2 border-b border-solid border-border-soft bg-surface-raised shrink-0">
            <button
              type="button"
              onClick={() => handleFormat('bold')}
              title="Negrita"
              style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--sys-text)', borderRadius: '0.25rem', cursor: 'pointer' }}
              className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('italic')}
              title="Cursiva"
              style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--sys-text)', borderRadius: '0.25rem', cursor: 'pointer' }}
              className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('underline')}
              title="Subrayado"
              style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--sys-text)', borderRadius: '0.25rem', cursor: 'pointer' }}
              className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
            >
              <Underline size={16} />
            </button>
            <div style={{ width: '1px', height: '1.25rem', background: 'var(--sys-border-soft)', margin: '0 0.25rem' }} />
            <button
              type="button"
              onClick={() => handleFormat('insertUnorderedList')}
              title="Lista Desordenada"
              style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--sys-text)', borderRadius: '0.25rem', cursor: 'pointer' }}
              className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('insertOrderedList')}
              title="Lista Ordenada"
              style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--sys-text)', borderRadius: '0.25rem', cursor: 'pointer' }}
              className="hover:bg-surface-hover active:scale-[0.95] transition-transform"
            >
              <ListOrdered size={16} />
            </button>
          </div>

          {/* Área contentEditable */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onBlur={saveSelection}
            onFocus={handleEditorFocus}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            className="flex-1 p-4 overflow-y-auto outline-none min-h-[200px]"
            style={{
              color: 'var(--sys-text)',
              background: 'var(--sys-surface)',
              fontFamily: 'sans-serif',
              lineHeight: '1.6',
              maxHeight: '280px',
            }}
            data-placeholder="Escribe el cuerpo de tu correo aquí..."
          />
        </div>

        {/* Panel Lateral de Variables — inserta donde esté el cursor */}
        <div className="w-64 border border-solid rounded-lg p-4 flex flex-col gap-3 shrink-0" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface-raised)' }}>
          <div className="flex items-center gap-2 border-b border-solid border-border-soft pb-2 shrink-0">
            <Braces size={16} className="text-primary" />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--sys-text)' }}>Variables Dinámicas</h4>
          </div>
          {/* Active target indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: activeTarget === 'subject'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(59, 130, 246, 0.1)',
              color: activeTarget === 'subject'
                ? 'rgb(245, 158, 11)'
                : 'rgb(59, 130, 246)',
              border: `1px solid ${activeTarget === 'subject' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            Insertando en: {activeTarget === 'subject' ? 'Asunto' : 'Cuerpo'}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1" style={{ maxHeight: '280px' }}>
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleInsertVariable(v.key)}
                className="text-left p-2 rounded-lg border border-solid hover:border-primary hover:bg-surface-hover active:scale-[0.98] transition-all flex flex-col gap-0.5"
                style={{
                  borderColor: 'var(--sys-border-soft)',
                  background: 'var(--sys-surface)',
                  cursor: 'pointer',
                }}
              >
                <code style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sys-primary)', fontFamily: 'monospace' }}>
                  {`{{${v.key}}}`}
                </code>
                <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones del Editor */}
      <div className="flex justify-end gap-3 border-t border-solid border-border-soft pt-4 shrink-0">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || !name.trim() || !subject.trim()}>
          {saving ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </div>
  )
}
