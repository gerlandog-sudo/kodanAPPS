import { api } from '@kodan-apps/ui-core';

export interface Project {
  id: number
  tenant_id: number
  account_id: number
  opportunity_id: number | null
  name: string
  description: string | null
  color_hex: string | null
  budget_hours: number | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export interface TaskType {
  id: number
  tenant_id: number
  module: string
  name: string
  icon: string
  color_hex: string
}

export interface ProjectTask {
  id: number
  project_id: number
  task_type_id: number | null
  title: string
  description: string | null
  assigned_to: number | null
  assigned_name: string | null
  kanban_status: 'todo' | 'in_progress' | 'review' | 'done'
  position: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  created_by: number
  created_at: string
  task_type_name: string | null
  task_type_color: string | null
  task_type_icon: string | null
}

export interface KanbanBoardData {
  columns: string[]
  itemsByStage: Record<string, ProjectTask[]>
}

export interface TimeEntry {
  id: number
  project_id: number
  task_id: number | null
  user_id: number
  date: string
  duration_minutes: number
  description: string | null
  hourly_cost: number
  calculated_cost: number
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at: string | null
  approved_by: number | null
  approved_at: string | null
  rejected_reason: string | null
  created_at: string
  project_name?: string
  user_name?: string
}

export interface TimeEntryListResponse {
  data: TimeEntry[]
  total: number
  page: number
  per_page: number
}

export interface DashboardKpis {
  active_projects: number
  hours_today: number
  hours_week: number
  open_tasks: number
  pending_approvals: number
}

export interface HoursByDay {
  date: string
  hours: number
}

export interface ProjectsByStatus {
  status: string
  count: number
}

export interface TopUser {
  user_id: number
  user_name: string
  total_hours: number
}

export interface UserProfile {
  id: number
  user_id: number
  user_name: string
  position_id: number | null
  position_name: string | null
  seniority_id: number | null
  seniority_name: string | null
  hourly_cost: number
  weekly_capacity: number
}

export interface CatalogItem {
  id: number
  name: string
}

export const trackerApi = {
  listProjects: () => api.get<Project[]>('/api/tracker/projects'),
  getProject: (id: number) => api.get<Project>(`/api/tracker/projects/${id}`),

  getBoard: (projectId: number) => api.get<KanbanBoardData>(`/api/tracker/kanban/${projectId}`),
  createTask: (data: Partial<ProjectTask>) => api.post<ProjectTask>('/api/tracker/kanban/tasks', data),
  getTask: (id: number) => api.get<ProjectTask>(`/api/tracker/kanban/tasks/${id}`),
  updateTask: (id: number, data: Partial<ProjectTask>) => api.patch<ProjectTask>(`/api/tracker/kanban/tasks/${id}`, data),
  moveTask: (id: number, data: { to_stage: string; position?: number }) => api.post<ProjectTask>(`/api/tracker/kanban/tasks/${id}/move`, data),
  deleteTask: (id: number) => api.delete(`/api/tracker/kanban/tasks/${id}`),
  listTaskTypes: () => api.get<TaskType[]>('/api/tracker/kanban/task-types'),

  listTimeEntries: (params?: Record<string, string>) => api.get<TimeEntryListResponse>('/api/tracker/time-entries', params),
  createTimeEntry: (data: Partial<TimeEntry>) => api.post<TimeEntry>('/api/tracker/time-entries', data),
  updateTimeEntry: (id: number, data: Partial<TimeEntry>) => api.patch<TimeEntry>(`/api/tracker/time-entries/${id}`, data),
  deleteTimeEntry: (id: number) => api.delete(`/api/tracker/time-entries/${id}`),
  submitTimeEntry: (id: number) => api.post<TimeEntry>(`/api/tracker/time-entries/${id}/submit`, {}),
  approveTimeEntry: (id: number) => api.post<TimeEntry>(`/api/tracker/time-entries/${id}/approve`, {}),
  rejectTimeEntry: (id: number, reason: string) => api.post<TimeEntry>(`/api/tracker/time-entries/${id}/reject`, { reason }),
  bulkApproveTimeEntries: (ids: number[]) => api.post<{ approved: number }>('/api/tracker/time-entries/bulk-approve', { ids }),
  pendingApprovals: () => api.get<TimeEntry[]>('/api/tracker/time-entries/pending-approvals'),

  getDashboardKpis: () => api.get<DashboardKpis>('/api/tracker/dashboard/kpis'),
  getHoursByDay: (params?: Record<string, string>) => api.get<HoursByDay[]>('/api/tracker/dashboard/hours-by-day', params),
  getProjectsByStatus: () => api.get<ProjectsByStatus[]>('/api/tracker/dashboard/projects-by-status'),
  getTopUsers: (limit?: number) => api.get<TopUser[]>('/api/tracker/dashboard/top-users', limit ? { limit: String(limit) } : undefined),
  getRecentEntries: (limit?: number) => api.get<TimeEntry[]>('/api/tracker/dashboard/recent-entries', limit ? { limit: String(limit) } : undefined),

  listProfiles: () => api.get<UserProfile[]>('/api/tracker/profiles'),
  upsertProfile: (data: Partial<UserProfile>) => api.post('/api/tracker/profiles', data),

  listPositions: () => api.get<CatalogItem[]>('/api/tracker/positions'),
  createPosition: (name: string) => api.post<CatalogItem>('/api/tracker/positions', { name }),
  deletePosition: (id: number) => api.delete(`/api/tracker/positions/${id}`),
  listSeniorities: () => api.get<CatalogItem[]>('/api/tracker/seniorities'),
  createSeniority: (name: string) => api.post<CatalogItem>('/api/tracker/seniorities', { name }),
  deleteSeniority: (id: number) => api.delete(`/api/tracker/seniorities/${id}`),

  downloadReport: async (type: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/tracker/reports/${type}${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Error al descargar reporte');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
