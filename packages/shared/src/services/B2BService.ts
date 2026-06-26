import { api } from '@kodan-apps/ui-core';
import type { B2BAccount, B2BContact, CustomFieldDef } from '../types';

export const B2BService = {
  listAccounts: () =>
    api.get<B2BAccount[]>('/api/crm/accounts'),

  createAccount: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; id: number; message: string }>('/api/crm/accounts', data),

  updateAccount: (id: number, data: Record<string, unknown>) =>
    api.patch<{ success: boolean; affected: number; message: string }>(`/api/crm/accounts/${id}`, data),

  deleteAccount: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/api/crm/accounts/${id}`),

  listContacts: (accountId?: number) =>
    api.get<B2BContact[]>(
      accountId ? `/api/crm/contacts?account_id=${accountId}` : '/api/crm/contacts'
    ),

  createContact: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; id: number; message: string }>('/api/crm/contacts', data),

  updateContact: (id: number, data: Record<string, unknown>) =>
    api.patch<{ success: boolean; affected: number; message: string }>(`/api/crm/contacts/${id}`, data),

  deleteContact: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/api/crm/contacts/${id}`),

  listCustomFields: (entity: string) =>
    api.get<CustomFieldDef[]>('/api/app-config/custom-fields', { entity }),
};
