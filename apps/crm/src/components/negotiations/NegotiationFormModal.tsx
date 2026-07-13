import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  CustomFieldsForm,
  Select,
  DatePicker,
} from '@kodan-apps/ui-core';
import type { CustomFieldDef } from '../../api/client';
import { QuoteLineItemsEditor } from '../quotes/QuoteLineItemsEditor';
import type { QuoteLineItem } from '../../types/admin';
import {
  FileText,
  Trophy,
  AlertTriangle,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
}

export interface OppFormData {
  name: string;
  value: string;
  close_date: string;
  account_id: string;
  contact_id: string;
  pipeline_stage_id: string;
  owner_user_id: string;
}

interface NegotiationFormModalProps {
  open: boolean;
  isEdit: boolean;
  isReadOnly: boolean;
  editingOppId: number | null;
  isArchived: boolean | undefined;
  editingOppStatus?: 'open' | 'won' | 'lost';

  formData: OppFormData;
  lineItems: QuoteLineItem[];
  quoteId: number | null;
  customFields: Record<string, unknown>;

  fieldDefs: CustomFieldDef[];
  pipelineStageOptions: SelectOption[];
  accountOptions: SelectOption[];
  contactOptions: SelectOption[];
  userOptions: SelectOption[];

  onFormDataChange: (data: OppFormData) => void;
  onLineItemsChange: (items: QuoteLineItem[]) => void;
  onCustomFieldsChange: (fields: Record<string, unknown>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onArchiveToggle: () => void;
  onClose: () => void;
}

export function NegotiationFormModal({
  open,
  isEdit,
  isReadOnly,
  editingOppId,
  isArchived,
  editingOppStatus,
  formData,
  lineItems,
  customFields,
  fieldDefs,
  pipelineStageOptions,
  accountOptions,
  contactOptions,
  userOptions,
  onFormDataChange,
  onLineItemsChange,
  onCustomFieldsChange,
  onSubmit,
  onArchiveToggle,
  onClose,
}: NegotiationFormModalProps) {
  const [modalTab, setModalTab] = useState<'general' | 'custom-fields'>('general');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? (isReadOnly ? 'Ver Negociación' : 'Editar Negociación') : 'Nueva Negociación'}
      className="max-w-5xl"
    >
      <div
        className="flex gap-1 p-1 rounded-lg mb-4 mt-2"
        style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}
      >
        <button
          onClick={() => setModalTab('general')}
          className="bg-transparent border-none px-4 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors"
          style={{
            background: modalTab === 'general' ? 'var(--sys-primary-container)' : 'transparent',
            color: modalTab === 'general' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
          }}
        >
          General
        </button>
        {fieldDefs.length > 0 && (
          <button
            onClick={() => setModalTab('custom-fields')}
            className="bg-transparent border-none px-4 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors"
            style={{
              background: modalTab === 'custom-fields' ? 'var(--sys-primary-container)' : 'transparent',
              color: modalTab === 'custom-fields' ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
            }}
          >
            Campos Personalizados
          </button>
        )}
      </div>

      {modalTab === 'general' ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-2">
          {/* Banner de estado Ganada/Perdida */}
          {isReadOnly && editingOppStatus && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border mb-2"
              style={{
                background: editingOppStatus === 'won'
                  ? 'color-mix(in srgb, var(--sys-success) 10%, transparent)'
                  : 'color-mix(in srgb, var(--sys-error) 10%, transparent)',
                borderColor: editingOppStatus === 'won'
                  ? 'color-mix(in srgb, var(--sys-success) 20%, transparent)'
                  : 'color-mix(in srgb, var(--sys-error) 20%, transparent)',
              }}
            >
              {editingOppStatus === 'won' ? (
                <Trophy size={18} style={{ color: 'var(--sys-success)' }} />
              ) : (
                <AlertTriangle size={18} style={{ color: 'var(--sys-error)' }} />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>
                  {editingOppStatus === 'won' ? 'Negociación Ganada' : 'Negociación Perdida'}
                </p>
                <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  {editingOppStatus === 'won' ? 'Motivo de éxito' : 'Motivo de pérdida'}
                </p>
              </div>
            </div>
          )}

          {/* ── Datos básicos ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                NOMBRE DE LA NEGOCIACIÓN
              </label>
              <Input
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="Ej: Licencias Enterprise KODAN"
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                VALOR ESTIMADO (ARS)
              </label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => onFormDataChange({ ...formData, value: e.target.value })}
                placeholder="0"
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                FECHA CIERRE PROYECTADA
              </label>
              <DatePicker
                value={formData.close_date}
                onChange={(val) => onFormDataChange({ ...formData, close_date: val })}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                CUENTA B2B
              </label>
              <Select
                options={accountOptions}
                value={formData.account_id}
                onChange={(val) => onFormDataChange({ ...formData, account_id: String(val) })}
                placeholder="Selecciona una cuenta corporativa"
                searchable
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                CONTACTO
              </label>
              <Select
                options={contactOptions}
                value={formData.contact_id}
                onChange={(val) => onFormDataChange({ ...formData, contact_id: String(val) })}
                placeholder="Selecciona un contacto corporativo"
                searchable
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                ETAPA
              </label>
              <Select
                options={pipelineStageOptions}
                value={formData.pipeline_stage_id}
                onChange={(val) => onFormDataChange({ ...formData, pipeline_stage_id: String(val) })}
                placeholder="Selecciona una etapa"
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                ASESOR COMERCIAL (DUEÑO)
              </label>
              <Select
                options={userOptions}
                value={formData.owner_user_id}
                onChange={(val) => onFormDataChange({ ...formData, owner_user_id: String(val) })}
                placeholder="Selecciona un asesor"
                searchable
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* ── Separador ── */}
          <hr style={{ borderColor: 'var(--sys-border-soft)' }} />

          {/* ── Cotización integrada ── */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--sys-text-muted)' }}>
              <FileText size={15} className="inline mr-1.5" style={{ color: 'var(--sys-primary)' }} />
              Cotización
            </h3>
            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
                PRODUCTOS / SERVICIOS
              </label>
              <QuoteLineItemsEditor items={lineItems} onChange={onLineItemsChange} readOnly={isReadOnly} />
            </div>
          </div>

          {/* ── Archivar / Restaurar (Solo si es edición) ── */}
          {editingOppId !== null && (
            <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>ESTADO DE ARCHIVO</span>
              <button
                type="button"
                onClick={onArchiveToggle}
                className="bg-transparent gap-1.5 text-xs font-semibold py-1.5 px-3 flex items-center rounded-lg cursor-pointer transition-colors"
                style={{
                  color: 'var(--sys-text-muted)',
                  border: '1px solid var(--sys-border-soft)',
                }}
              >
                {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {isArchived ? 'Restaurar' : 'Archivar Negociación'}
              </button>
            </div>
          )}

          {/* ── Acciones ── */}
          <div
            className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
            style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
          >
            <Button variant="secondary" type="button" onClick={onClose}>
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button variant="primary" type="submit" className="btn-primary">
                {isEdit ? 'Guardar Cambios' : 'Crear Negociación'}
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          <CustomFieldsForm
            definitions={fieldDefs}
            values={customFields as Record<string, string>}
            onChange={(key, value) => onCustomFieldsChange({ ...customFields, [key]: value })}
            disabled={isReadOnly}
          />
          <div
            className="flex justify-end gap-3 mt-2 pt-3 sticky bottom-0"
            style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}
          >
            <Button variant="secondary" type="button" onClick={onClose}>
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button variant="primary" onClick={() => onSubmit()} className="btn-primary">
                {isEdit ? 'Guardar Cambios' : 'Crear Negociación'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
