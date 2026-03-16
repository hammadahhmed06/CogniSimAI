import { apiBase, apiFetch } from './client'

// Backend Project domain models
export type ProjectType = 'scrum' | 'kanban'
export interface Project {
  id: string
  name: string
  key: string
  type: ProjectType
  description?: string | null
  status?: 'active' | 'archived' | string
  created_at?: string
  updated_at?: string | null
  archived_at?: string | null
  slug?: string | null
  // Jira integration fields
  integration_id?: string | null
  jira_project_id?: string | null
  jira_project_key?: string | null
}

export interface CreateProjectInput {
  name: string
  key: string
  type?: ProjectType
}

// DEPRECATED: Item (use Issue from issuesService instead)
export interface Item {
  id: string
  project_id: string
  item_key: string
  title: string
  status: string
  priority?: string | null
  sprint_id?: string | null
}

export interface CreateItemInput {
  title: string
  description?: string
  status?: string
  priority?: string
  type?: string
}

export interface UpdateItemInput {
  title?: string
  status?: string
  priority?: string
  sprint_id?: string | null
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  state: 'future' | 'active' | 'closed'
  goal?: string | null
  start_date?: string | null
  end_date?: string | null
}

export interface CreateSprintInput {
  name: string
  goal?: string
  startDate?: string
  endDate?: string
}

export interface AssignItemsInput { item_ids: string[] }

export interface ProjectStatsResponse {
  status_counts: Record<string, number>
  category_counts: { todo: number; in_progress: number; done: number }
  total: number
}

const p = (path: string) => apiBase(path)

export const projectService = {
  // Projects
  listProjects: (opts?: { q?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (opts?.q) params.append('q', opts.q)
    if (opts?.status) params.append('status', opts.status)
    const qs = params.toString()
    return apiFetch<Project[]>(p(`/api/projects${qs ? '?' + qs : ''}`))
  },
  listProjectsPaginated: (opts?: { q?: string; status?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (opts?.q) params.append('q', opts.q)
    if (opts?.status) params.append('status', opts.status)
    if (opts?.limit != null) params.append('limit', String(opts.limit))
    if (opts?.offset != null) params.append('offset', String(opts.offset))
    const qs = params.toString()
    return apiFetch<{ items: Project[]; total: number; limit: number; offset: number }>(p(`/api/projects/paginated${qs ? '?' + qs : ''}`))
  },
  batchProjectStats: (ids: string[]) => {
    if (!ids.length) return Promise.resolve({} as Record<string, { todo: number; in_progress: number; done: number }>)
    const qs = new URLSearchParams({ ids: ids.join(',') })
    return apiFetch<Record<string, { todo: number; in_progress: number; done: number }>>(p(`/api/projects/stats-batch?${qs.toString()}`))
  },
  createProject: (body: CreateProjectInput) => apiFetch<Project>(p('/api/projects'), { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id: string) => apiFetch<Project>(p(`/api/projects/${id}`)),
  getProjectBySlug: (slug: string) => apiFetch<Project>(p(`/api/projects/by-slug/${slug}`)),
  updateProject: (id: string, data: Partial<CreateProjectInput & { description?: string; status?: string }>) =>
    apiFetch<Project>(p(`/api/projects/${id}`), { method: 'PATCH', body: JSON.stringify(data) }),
  archiveProject: (id: string) => apiFetch<Project>(p(`/api/projects/${id}/archive`), { method: 'POST' }),
  deleteProject: (id: string) => apiFetch<{ success: boolean }>(p(`/api/projects/${id}`), { method: 'DELETE' }),
  completeProject: (id: string) => apiFetch<Project>(p(`/api/projects/${id}/complete`), { method: 'POST' }),
  listProjectActivity: (id: string, limit = 50) => apiFetch<{ id: string; project_id: string; actor_user_id: string; action: string; meta?: Record<string, unknown>; created_at?: string }[]>(p(`/api/projects/${id}/activity?limit=${limit}`)),
  getProjectStats: (id: string) => apiFetch<ProjectStatsResponse>(p(`/api/projects/${id}/stats`)),

  // Items (deprecated) - kept temporarily while migrating to issuesService
  listItems: (projectId: string) => apiFetch<Item[]>(p(`/api/projects/${projectId}/items`)),
  createItem: (projectId: string, body: CreateItemInput) =>
    apiFetch<Item>(p(`/api/projects/${projectId}/items`), { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (projectId: string, itemId: string, body: UpdateItemInput) =>
    apiFetch<Item>(p(`/api/projects/${projectId}/items/${itemId}`), { method: 'PATCH', body: JSON.stringify(body) }),
  reorderItems: (projectId: string, itemIds: string[]) =>
    apiFetch<{ success: boolean }>(p(`/api/projects/${projectId}/items/reorder`), { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }),
  inlineUpdateItemTitle: (projectId: string, itemId: string, title: string) =>
    apiFetch<Item>(p(`/api/projects/${projectId}/items/${itemId}`), { method: 'PATCH', body: JSON.stringify({ title }) }),

  // Sprints
  listSprints: (projectId: string) => apiFetch<Sprint[]>(p(`/api/projects/${projectId}/sprints`)),
  createSprint: (projectId: string, body: CreateSprintInput) =>
    apiFetch<Sprint>(p(`/api/projects/${projectId}/sprints`), { method: 'POST', body: JSON.stringify(body) }),
  startSprint: (projectId: string, sprintId: string) =>
    apiFetch<Sprint>(p(`/api/projects/${projectId}/sprints/${sprintId}/start`), { method: 'PATCH' }),
  completeSprint: (projectId: string, sprintId: string) =>
    apiFetch<Sprint>(p(`/api/projects/${projectId}/sprints/${sprintId}/complete`), { method: 'PATCH' }),
  assignItemsToSprint: (projectId: string, sprintId: string, itemIds: string[]) =>
    apiFetch<{ success: boolean; count: number }>(p(`/api/projects/${projectId}/sprints/${sprintId}/items`), {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds } as AssignItemsInput),
    }),
}

export type { Project as ProjectDTO, Item as ItemDTO, Sprint as SprintDTO }
