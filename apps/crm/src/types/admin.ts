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
  ui_config?: {
    won_reasons?: string[]
    lost_reasons?: string[]
  } | null
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

// ── Quotes ──
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteLineItem {
  id?: number
  quote_id?: number
  product_id: number
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  discount_percentage: number
  tax_percentage: number
}

export interface Quote {
  id: number
  tenant_id: number
  opportunity_id: number
  opportunity_title?: string
  account_name?: string
  quote_number: string
  status: QuoteStatus
  total_amount: string
  created_at: string
  items?: QuoteLineItem[]
}

// ── Custom Fields ──
export type EntityType = 'account' | 'contact' | 'opportunity'
export type { CustomFieldDef }
