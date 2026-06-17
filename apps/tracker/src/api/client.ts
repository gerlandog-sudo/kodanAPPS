import { api } from '@kodan-apps/ui-core';

export interface Project {
  id: number
  tenant_id: number
  account_id: number
  opportunity_id: number | null
  name: string
  budget_hours: number | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export const trackerApi = {
  listProjects: () => api.get<Project[]>('/api/tracker/projects'),
  getProject: (id: number) => api.get<Project>(`/api/tracker/projects/${id}`),
};
