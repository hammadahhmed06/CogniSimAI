import { apiBase, apiFetch } from './client'

export interface Issue {
  id: string
  project_id: string
  issue_key: string
  title: string
  status: string
  priority?: string | null
  type?: string | null
  assignee_name?: string | null
  description?: string | null
  sprint_id?: string | null
  backlog_rank?: number | null
  board_rank?: number | null
  created_at?: string
  updated_at?: string
}

export interface CreateIssueInput {
  title: string
  description?: string
  status?: string
  priority?: string
  type?: string
}

export interface UpdateIssueInput {
  title?: string
  status?: string
  priority?: string
  sprint_id?: string | null
  type?: string
}

const p = (path: string) => apiBase(path)

// The backend returns IssueListResponse { items: Issue[], total, limit, offset }
interface IssueListResponse { items: Issue[]; total: number; limit: number; offset: number }
export const issuesService = {
  listByProject: async (projectId: string) => {
    const res = await apiFetch<IssueListResponse | Issue[]>(p(`/api/issues?project_id=${projectId}`))
    if(Array.isArray(res)) return res
    if(res && typeof res === 'object' && 'items' in res) return (res as IssueListResponse).items
    return [] as Issue[]
  },
  listEpics: async (opts?: { projectId?: string; workspaceId?: string; search?: string; includeArchivedProjects?: boolean; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    params.set('type', 'epic')
    if (opts?.projectId) params.append('project_id', opts.projectId)
    if (opts?.workspaceId) params.append('workspace_id', opts.workspaceId)
    if (opts?.search) params.append('q', opts.search)
    if (opts?.includeArchivedProjects) params.append('include_archived_projects', 'true')
    const limit = typeof opts?.limit === 'number' ? opts.limit : 100
    params.append('limit', String(limit))
    if (typeof opts?.offset === 'number' && opts.offset > 0) params.append('offset', String(opts.offset))
    const query = params.toString()
    const res = await apiFetch<IssueListResponse | Issue[]>(p(`/api/issues${query ? `?${query}` : ''}`))
    if (Array.isArray(res)) return res
    if (res && typeof res === 'object' && 'items' in res) return (res as IssueListResponse).items
    return [] as Issue[]
  },
  create: (projectId: string, body: CreateIssueInput) => apiFetch<Issue>(p(`/api/issues`), { method: 'POST', body: JSON.stringify({ ...body, project_id: projectId }) }),
  update: (projectId: string, issueId: string, body: UpdateIssueInput) => apiFetch<Issue>(p(`/api/issues/${issueId}`), { method: 'PATCH', body: JSON.stringify(body) }),
  reorder: (_projectId: string, ids: string[]) => apiFetch<{ success: boolean }>(p(`/api/issues/reorder`), { method: 'POST', body: JSON.stringify({ issue_ids: ids }) }),
  reorderBoard: (_projectId: string, status: string, ids: string[]) => apiFetch<{ success: boolean }>(p(`/api/issues/reorder`), { method: 'POST', body: JSON.stringify({ issue_ids: ids, status }) }),
}

export type { Issue as IssueDTO }
