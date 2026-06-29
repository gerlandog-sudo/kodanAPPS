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
  budget_money?: number
  start_date?: string | null
  end_date?: string | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
  client_name?: string
  actual_hours?: number
  actual_cost?: number
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
  kanban_status: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
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
  project_name?: string
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

export interface ProjectKpis {
  scope: number;
  schedule: number;
  budget: number;
  risks: 'green' | 'amber' | 'red';
  quality: number;
  value: number;
}

export interface PortfolioProject {
  id: number;
  name: string;
  status: string;
  budget_hours: number | null;
  budget_money: number | null;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  kpis: ProjectKpis;
}

export interface DetailedProjectMetrics {
  project: {
    id: number;
    name: string;
    client_name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  };
  kpis: {
    scope: {
      percentage: number;
      completed: number;
      total: number;
      source: 'kanban' | 'budget';
    };
    schedule: {
      spi: number;
      status: string;
      planned_progress: number;
    };
    budget: {
      burn_rate: number;
      cost: number;
      budget: number;
      status: string;
    };
    quality: {
      percentage: number;
      status: string;
    };
    value: {
      percentage: number;
      revenue: number;
      target: number;
      status: string;
    };
    risks: {
      total: number;
      high: number;
      medium: number;
      status: string;
      warnings: string[];
    };
  };
  trends: Array<{
    name: string;
    alcance: number;
    cronograma: number;
    presupuesto: number;
  }>;
}

// F3 — Insight types
export interface HeatmapUser {
  id: number;
  name: string;
  weekly_capacity: number;
  days: { date: string; hours: number; capacity: number; saturation: number }[];
}

export interface TimelineProject {
  id: number;
  name: string;
  budget_hours: number;
  actual_hours: number;
  status: string;
  data: { date: string; total_hours: number }[];
}

export interface TimelineResource {
  id: number;
  name: string;
  position: string;
  seniority: string;
  weekly_capacity: number;
  total_load: number;
  logged_hours: { date: string; total_hours: number }[];
}

export interface TimelineDetails {
  tasks: { id: number; description: string; priority: string; estimated_hours: number; collaborator_name?: string; project_name?: string }[];
  entries: { id: number; hours: number; description: string; collaborator_name: string; task_name: string }[];
}

export interface PredictiveAlertsResponse {
  alerts: {
    projectId: number;
    projectName: string;
    priority: 'High' | 'Medium' | 'Low';
    metrics: {
      budget_hours: number;
      consumed_hours: number;
      budget_exhausted_percent: number;
      avg_weekly_hours: number;
      weeks_to_depletion: number | string;
      seniority_mix: { senior_percent: number };
    };
  }[];
}

export const trackerApi = {
  listProjects: () => api.get<Project[]>('/api/tracker/projects'),
  getProject: (id: number) => api.get<Project>(`/api/tracker/projects/${id}`),
  createProject: (data: Partial<Project>) => api.post<{ success: boolean; id: number; message: string }>('/api/tracker/projects', data),
  updateProject: (id: number, data: Partial<Project>) => api.patch<{ success: boolean; message: string }>(`/api/tracker/projects/${id}`, data),
  deleteProject: (id: number) => api.delete<{ success: boolean; message: string }>(`/api/tracker/projects/${id}`),
  listAccounts: () => api.get<Array<{ account_id: number; name: string }>>('/api/crm/accounts'),

  getBoard: (projectId: number, includeArchived = false) => {
    const params: Record<string, string> = {};
    if (includeArchived) params.include_archived = 'true';
    return api.get<KanbanBoardData>(`/api/tracker/kanban/${projectId}`, params);
  },
  getAllBoards: (includeArchived = false) => {
    const params: Record<string, string> = {};
    if (includeArchived) params.include_archived = 'true';
    return api.get<KanbanBoardData>('/api/tracker/kanban/all', params);
  },
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
  bulkRejectTimeEntries: (ids: number[], reason: string) => api.post<{ rejected: number }>('/api/tracker/time-entries/bulk-reject', { ids, reason }),
  pendingApprovals: (params?: Record<string, string>) => api.get<TimeEntry[]>('/api/tracker/time-entries/pending-approvals', params),

  getMetrics: (projectId?: number, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = String(projectId);
    if (from) params.from = from;
    if (to) params.to = to;
    return api.get<any>('/api/tracker/metrics', params);
  },

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

  // F3 — Insights
  getHeatmap: (startDate: string, endDate: string) =>
    api.get<HeatmapUser[]>('/api/tracker/insights/heatmap', { start_date: startDate, end_date: endDate }),
  getTimelineProjects: (params?: Record<string, string>) =>
    api.get<TimelineProject[]>('/api/tracker/insights/timeline/projects', params),
  getTimelineResources: (params?: Record<string, string>) =>
    api.get<TimelineResource[]>('/api/tracker/insights/timeline/resources', params),
  getTimelineDetails: (type: string, id: number, date: string) =>
    api.get<TimelineDetails>('/api/tracker/insights/timeline/details', { type, id: String(id), date }),
  reassignSuggestions: (data: { project_id?: number; task_id?: number }) =>
    api.post<any>('/api/tracker/insights/timeline/reassign-suggestions', data),
  reassignExecute: (taskId: number, userId: number) =>
    api.post<any>('/api/tracker/insights/timeline/reassign-execute', { task_id: taskId, user_id: userId }),
  getPredictiveAlerts: () =>
    api.get<PredictiveAlertsResponse>('/api/tracker/insights/predictive-alerts'),
  generateAiText: (prompt: string) =>
    api.post<{ success: boolean; text: string }>('/api/tracker/insights/ai/generate-text', { prompt }),

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
