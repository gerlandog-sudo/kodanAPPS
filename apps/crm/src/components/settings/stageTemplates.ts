import type { StageBulkInput } from '../../api/client'

export interface StageTemplate {
  label: string
  stages: StageBulkInput[]
}

export const STAGE_TEMPLATES: Record<string, StageTemplate> = {
  'saas-b2b': {
    label: 'SaaS B2B',
    stages: [
      { name: 'Prospección', color_hex: '#6366F1', probability: 10, sort_order: 10 },
      { name: 'Demo', color_hex: '#8B5CF6', probability: 30, sort_order: 20 },
      { name: 'Negociación', color_hex: '#EC4899', probability: 60, sort_order: 30 },
      { name: 'Cierre Cerrado', color_hex: '#F97316', probability: 90, sort_order: 40 },
      { name: 'Ganada', color_hex: '#22C55E', probability: 100, sort_order: 50, is_won_stage: 1 },
      { name: 'Perdida', color_hex: '#F43F5E', probability: 0, sort_order: 60, is_lost_stage: 1 },
    ],
  },
  'e-commerce': {
    label: 'E-commerce',
    stages: [
      { name: 'Lead', color_hex: '#6366F1', probability: 10, sort_order: 10 },
      { name: 'Carrito', color_hex: '#8B5CF6', probability: 30, sort_order: 20 },
      { name: 'Pago', color_hex: '#EC4899', probability: 60, sort_order: 30 },
      { name: 'Envío', color_hex: '#F97316', probability: 90, sort_order: 40 },
      { name: 'Completada', color_hex: '#22C55E', probability: 100, sort_order: 50, is_won_stage: 1 },
      { name: 'Cancelada', color_hex: '#F43F5E', probability: 0, sort_order: 60, is_lost_stage: 1 },
    ],
  },
  services: {
    label: 'Servicios',
    stages: [
      { name: 'Contacto', color_hex: '#6366F1', probability: 10, sort_order: 10 },
      { name: 'Propuesta', color_hex: '#8B5CF6', probability: 30, sort_order: 20 },
      { name: 'Aprobación', color_hex: '#EC4899', probability: 60, sort_order: 30 },
      { name: 'Ejecución', color_hex: '#F97316', probability: 90, sort_order: 40 },
      { name: 'Ganada', color_hex: '#22C55E', probability: 100, sort_order: 50, is_won_stage: 1 },
      { name: 'Perdida', color_hex: '#F43F5E', probability: 0, sort_order: 60, is_lost_stage: 1 },
    ],
  },
}
