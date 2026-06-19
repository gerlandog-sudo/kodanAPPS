import type { CustomFieldDef, StageBulkInput } from '../api/client'

// ── Tenant Users ──
export interface TenantUser {
  id: number
  email: string
  display_name: string
  is_active: number
  created_at: string
  role_id: number | null
  role_name: string | null
  role_description: string | null
}

export interface CrmRole {
  id: number
  name: string
  description: string
}

// ── Pipelines ──
export interface Pipeline {
  id: number
  name: string
  is_default: number
}

export interface Stage {
  id: number
  name: string
  color_hex: string
  sort_order: number
  is_won_stage: number
  is_lost_stage: number
  probability: number
  pipeline_id: number
}

export interface StageWithUIConfig extends StageBulkInput {
  ui_config?: Record<string, any> | null
}

// ── Custom Fields ──
export type EntityType = 'account' | 'contact' | 'opportunity'
export type { CustomFieldDef }
