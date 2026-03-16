import { apiBase, apiFetch } from './client'

export interface IssueDTO {
  id: string
  issue_key: string
  title: string
  status?: string
  priority?: string
  type?: string
  project_id?: string | null
  workspace_id?: string | null
  assignee_name?: string | null
  description?: string | null
  epic_id?: string | null
  story_points?: number | null
  business_value?: number | null
  effort_estimate?: number | null
  risk_level?: string | null
  acceptance_criteria?: { text: string; done?: boolean }[] | null
  sprint_id?: string | null
  started_at?: string | null
  done_at?: string | null
  due_date?: string | null
  priority_score?: number | null
  priority_score_meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
  comment_count?: number
  integration_id?: string | null
  jira_issue_id?: string | null
  jira_issue_key?: string | null
}

export interface CreateIssueInput { title: string; project_id?: string; type?: string; priority?: string; status?: string; assignee_name?: string | null; description?: string; epic_id?: string; story_points?: number; business_value?: number; effort_estimate?: number; risk_level?: string; acceptance_criteria?: { text: string; done?: boolean }[]; sprint_id?: string; due_date?: string }
export interface UpdateIssueInput { title?: string; project_id?: string | null; type?: string; priority?: string; status?: string; assignee_name?: string | null; description?: string | null; epic_id?: string | null; story_points?: number | null; business_value?: number | null; effort_estimate?: number | null; risk_level?: string | null; acceptance_criteria?: { text: string; done?: boolean }[] | null; sprint_id?: string | null; due_date?: string | null }

const p = (path: string) => apiBase(path)

export interface IssueListResponse { items: IssueDTO[]; total: number; limit: number; offset: number }

export interface IssueComment { id: string; issue_id: string; author_user_id: string; body: string; created_at?: string }

export interface IssueDependency { id: string; issue_id: string; depends_on_id: string; created_at?: string; depends_on_issue?: { id: string; issue_key: string; title: string; status?: string } }
export interface EpicProgress { epic_id: string; total: number; todo: number; in_progress: number; done: number; story_points_total: number; story_points_done: number }

export const issueService = {
  listIssues: (opts?: { q?: string; status?: string; project_id?: string; workspace_id?: string; priority?: string; type?: string; epic_id?: string; sprint_id?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (opts?.q) params.append('q', opts.q)
    if (opts?.status) params.append('status', opts.status)
    if (opts?.project_id) params.append('project_id', opts.project_id)
    if (opts?.workspace_id) params.append('workspace_id', opts.workspace_id)
    if (opts?.priority) params.append('priority', opts.priority)
    if (opts?.type) params.append('type', opts.type)
    if (opts?.epic_id) params.append('epic_id', opts.epic_id)
    if (opts?.sprint_id) params.append('sprint_id', opts.sprint_id)
    if (opts?.limit != null) params.append('limit', String(opts.limit))
    if (opts?.offset != null) params.append('offset', String(opts.offset))
    const qs = params.toString()
    return apiFetch<IssueListResponse>(p(`/api/issues${qs? '?' + qs : ''}`))
  },
  createIssue: (body: CreateIssueInput) => apiFetch<IssueDTO>(p('/api/issues'), { method: 'POST', body: JSON.stringify(body)}),
  getIssue: (id: string) => apiFetch<IssueDTO>(p(`/api/issues/${id}`)),
  updateIssue: (id: string, body: UpdateIssueInput) => apiFetch<IssueDTO>(p(`/api/issues/${id}`), { method: 'PATCH', body: JSON.stringify(body)}),
  deleteIssue: (id: string) => apiFetch<{ success: boolean }>(p(`/api/issues/${id}`), { method: 'DELETE' }),
  listComments: (issueId: string) => apiFetch<IssueComment[]>(p(`/api/issues/${issueId}/comments`)),
  addComment: (issueId: string, body: string) => apiFetch<IssueComment>(p(`/api/issues/${issueId}/comments`), { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (issueId: string, commentId: string) => apiFetch<{ success: boolean }>(p(`/api/issues/${issueId}/comments/${commentId}`), { method: 'DELETE' }),
  // Dependencies
  listDependencies: (issueId: string) => apiFetch<IssueDependency[]>(p(`/api/issues/${issueId}/dependencies`)),
  addDependency: (issueId: string, dependsOnId: string) => apiFetch<IssueDependency>(p(`/api/issues/${issueId}/dependencies`), { method: 'POST', body: JSON.stringify({ depends_on_id: dependsOnId }) }),
  deleteDependency: (issueId: string, depId: string) => apiFetch<{ success: boolean }>(p(`/api/issues/${issueId}/dependencies/${depId}`), { method: 'DELETE' }),
  // Epic progress
  getEpicProgress: (epicId: string) => apiFetch<EpicProgress>(p(`/api/issues/${epicId}/progress`)),
  // Scoring
  recomputeScore: (issueId: string) => apiFetch<{ issue: IssueDTO }>(p(`/api/issues/${issueId}/score/recompute`), { method: 'POST' }),
  recomputeAllScores: () => apiFetch<{ updated: number }>(p('/api/issues/score/recompute-all'), { method: 'POST' }),
}
