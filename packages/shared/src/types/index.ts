export interface B2BAccount {
  account_id: number
  name: string
  legal_name: string | null
  tax_id: string | null
  website: string | null
  phone: string | null
  address: string | null
  custom_fields: Record<string, any>
}

export interface B2BContact {
  contact_id: number
  account_id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  mobile: string | null
  custom_fields: Record<string, any>
  account_name?: string
}

export interface CustomFieldDef {
  id: number
  entity_type: 'account' | 'contact' | 'opportunity'
  field_key: string
  field_label: string
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'boolean'
  options: string[] | null
  is_required: boolean
  sort_order: number
}

export interface B2BAccountFormData {
  name: string
  legal_name: string
  tax_id: string
  website: string
  phone: string
  address: string
}

export interface B2BContactFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile: string
  account_id: string
}
