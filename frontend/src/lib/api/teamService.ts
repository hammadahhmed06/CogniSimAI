import { apiBase, apiFetch } from './client'

const p = (path: string) => apiBase(path)

export interface Team {
  id: string
  name: string
  my_role?: 'viewer' | 'editor' | 'admin' | 'owner'
}

export interface TeamDetail extends Team {
  members_count?: number
}

export interface TeamMember {
  id: string
  user_id: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role: 'viewer' | 'editor' | 'admin' | 'owner'
  status: 'active' | 'invited' | 'disabled'
}

export interface TeamQuotaResponse {
  team_id: string
  daily_runs_used: number
  daily_runs_limit: number
  daily_runs_remaining: number
  tokens_30d_used: number | null
  tokens_30d_limit: number | null
}

// Team Metrics Types (Sprint 1)
export interface VelocityDataPoint {
  date: string
  velocity: number | null
  stories_completed: number
}

export interface VelocityResponse {
  team_id: string
  period_days: number
  data_points: VelocityDataPoint[]
  average_velocity: number | null
  trend: 'increasing' | 'stable' | 'decreasing' | null
}

export interface CycleTimeDataPoint {
  date: string
  avg_cycle_time_hours: number | null
  issues_count: number
}

export interface CycleTimeResponse {
  team_id: string
  period_days: number
  data_points: CycleTimeDataPoint[]
  average_cycle_time_hours: number | null
  trend: 'increasing' | 'stable' | 'decreasing' | null
}

export interface WorkloadMember {
  user_id: string
  user_name: string
  user_email: string
  assigned_issues: number
  in_progress_issues: number
  story_points: number | null
  capacity_utilization: number | null
}

export interface WorkloadResponse {
  team_id: string
  members: WorkloadMember[]
  total_issues: number
  total_in_progress: number
  average_workload: number
}

export interface SprintCompletionData {
  sprint_id: string
  sprint_name: string
  start_date: string | null
  end_date: string | null
  committed_points: number
  completed_points: number
  completion_rate: number
}

export interface SprintCompletionResponse {
  team_id: string
  sprints: SprintCompletionData[]
  average_completion_rate: number
  trend: 'increasing' | 'stable' | 'decreasing' | null
}

export interface TeamMetricsSummary {
  team_id: string
  team_name: string
  current_sprint_id: string | null
  current_sprint_name: string | null
  current_sprint_progress: number | null
  current_velocity: number | null
  average_velocity_30d: number | null
  velocity_trend: 'increasing' | 'stable' | 'decreasing' | null
  avg_cycle_time_hours: number | null
  cycle_time_trend: 'increasing' | 'stable' | 'decreasing' | null
  total_active_issues: number
  total_in_progress: number
  team_member_count: number
  avg_workload_per_member: number
  last_sprint_completion_rate: number | null
  avg_sprint_completion_rate: number | null
  bugs_fixed_30d: number
  bugs_created_30d: number
  bug_fix_rate: number | null
  calculated_at: string
}

export interface TeamCapacityMember {
  user_id: string
  user_name: string
  user_email: string
  capacity_points: number
  committed_points: number
  completed_points: number
  availability_percent: number
  notes: string | null
}

export interface TeamCapacityResponse {
  team_id: string
  sprint_id: string | null
  sprint_name: string | null
  members: TeamCapacityMember[]
  total_capacity: number
  total_committed: number
  total_completed: number
  capacity_utilization: number
}

export interface SetCapacityMemberRequest {
  user_id: string
  capacity_points: number
  availability_percent?: number
  notes?: string
}

export interface SetCapacityRequest {
  sprint_id?: string
  members: SetCapacityMemberRequest[]
}

// ===== Sprint 2: Team Settings Types =====
export interface TeamSettingsResponse {
  id: string
  team_id: string
  timezone: string
  working_hours_start: string
  working_hours_end: string
  working_days: number[]
  sprint_length_days: number
  velocity_tracking_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UpdateTeamSettingsRequest {
  timezone?: string
  working_hours_start?: string
  working_hours_end?: string
  working_days?: number[]
  sprint_length_days?: number
  velocity_tracking_enabled?: boolean
}

// ===== Sprint 2: Team Goals Types =====
export interface TeamGoalResponse {
  id: string
  team_id: string
  title: string
  description: string | null
  goal_type: 'okr' | 'kpi' | 'target'
  target_value: number | null
  current_value: number
  unit: string | null
  quarter: string | null
  status: 'active' | 'achieved' | 'at_risk' | 'abandoned'
  owner_user_id: string | null
  owner_name: string | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  progress_percentage: number | null
}

export interface CreateGoalRequest {
  title: string
  description?: string
  goal_type?: 'okr' | 'kpi' | 'target'
  target_value?: number
  current_value?: number
  unit?: string
  quarter?: string
  owner_user_id?: string
  due_date?: string
}

export interface UpdateGoalRequest {
  title?: string
  description?: string
  target_value?: number
  current_value?: number
  unit?: string
  quarter?: string
  status?: 'active' | 'achieved' | 'at_risk' | 'abandoned'
  owner_user_id?: string
  due_date?: string
}

// ===== Sprint 2: Notification Settings Types =====
export interface NotificationSettingsResponse {
  id: string
  team_id: string
  user_id: string
  email_daily_digest: boolean
  email_sprint_summary: boolean
  email_mentions: boolean
  email_assignments: boolean
  slack_notifications: boolean
  slack_webhook_url: string | null
  created_at: string
  updated_at: string
}

export interface UpdateNotificationSettingsRequest {
  email_daily_digest?: boolean
  email_sprint_summary?: boolean
  email_mentions?: boolean
  email_assignments?: boolean
  slack_notifications?: boolean
  slack_webhook_url?: string
}

// ===== Sprint 2: Default Assignees Types =====
export interface DefaultAssigneeResponse {
  id: string
  team_id: string
  issue_type: string | null
  priority: string | null
  assignee_user_id: string
  assignee_name: string
  assignee_email: string
  created_at: string
}

export interface SetDefaultAssigneeRequest {
  issue_type?: string
  priority?: string
  assignee_user_id: string
}

// ===== Sprint 2: Team Labels Types =====
export interface TeamLabelResponse {
  id: string
  team_id: string
  name: string
  color: string
  description: string | null
  created_at: string
}

export interface CreateLabelRequest {
  name: string
  color?: string
  description?: string
}

export interface UpdateLabelRequest {
  name?: string
  color?: string
  description?: string
}

// =====================================================
// Sprint 3: Collaboration & Resources Types
// =====================================================

// Resource Categories
export interface ResourceCategory {
  id: string
  team_id: string
  name: string
  description?: string
  color: string
  icon: string
  parent_category_id?: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  parent_category_id?: string
  display_order?: number
}

export interface UpdateCategoryRequest {
  name?: string
  description?: string
  color?: string
  icon?: string
  parent_category_id?: string
  display_order?: number
}

// Team Resources
export interface TeamResource {
  id: string
  team_id: string
  category_id?: string
  title: string
  description?: string
  resource_type: 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image'
  url?: string
  content?: string
  file_size_bytes?: number
  mime_type?: string
  tags: string[]
  is_pinned: boolean
  is_archived: boolean
  view_count: number
  last_viewed_at?: string
  created_by?: string
  created_by_name?: string
  created_by_email?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface CreateResourceRequest {
  title: string
  description?: string
  resource_type: 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image'
  url?: string
  content?: string
  category_id?: string
  tags?: string[]
  is_pinned?: boolean
  file_size_bytes?: number
  mime_type?: string
}

export interface UpdateResourceRequest {
  title?: string
  description?: string
  resource_type?: 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image'
  url?: string
  content?: string
  category_id?: string
  tags?: string[]
  is_pinned?: boolean
  is_archived?: boolean
}

// Team Chat
export interface ChatMessage {
  id: string
  team_id: string
  parent_message_id?: string
  message: string
  message_type: 'text' | 'announcement' | 'system' | 'file_share'
  mentioned_user_ids: string[]
  reactions: Record<string, string[]>
  is_edited: boolean
  edited_at?: string
  user_id?: string
  user_name?: string
  user_email?: string
  is_pinned: boolean
  is_deleted: boolean
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface CreateChatMessageRequest {
  message: string
  message_type?: 'text' | 'announcement' | 'system' | 'file_share'
  parent_message_id?: string
  mentioned_user_ids?: string[]
}

export interface UpdateChatMessageRequest {
  message?: string
  is_pinned?: boolean
  is_deleted?: boolean
}

// Workspace Users for Direct Team Addition
export interface WorkspaceUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_team_member: boolean
}

export const teamService = {
  listTeams() {
    return apiFetch<TeamDetail[]>(p('/api/teams'))
  },
  getTeam(teamId: string) {
    return apiFetch<TeamDetail>(p(`/api/teams/${teamId}`))
  },
  createTeam(name: string) {
    return apiFetch<Team>(p('/api/teams'), {
      method: 'POST',
      body: JSON.stringify({ name })
    })
  },
  cleanupOrphanTeams() {
    return apiFetch<{ message: string; deleted: Array<{ id: string; name: string }> }>(
      p('/api/teams/cleanup/orphans'),
      { method: 'DELETE' }
    )
  },
  updateTeam(teamId: string, name: string) {
    return apiFetch<Team>(p(`/api/teams/${teamId}`), {
      method: 'PATCH',
      body: JSON.stringify({ name })
    })
  },
  inviteMember(teamId: string, email: string, role: TeamMember['role'] = 'viewer', redirect?: string) {
    return apiFetch<{ 
      success: boolean
      message: string
      token: string
      invite_link: string
      email_sent: boolean
      email_error?: string
      invitation_stored: boolean
      expires_at: string
    }>(p(`/api/teams/${teamId}/invite`), {
      method: 'POST',
      body: JSON.stringify({ email, role, redirect })
    })
  },
  listMembers(teamId: string) {
    return apiFetch<TeamMember[]>(p(`/api/teams/${teamId}/members`))
  },
  addMember(teamId: string, member: { user_id: string; role?: TeamMember['role']; status?: TeamMember['status'] }) {
    return apiFetch<TeamMember>(p(`/api/teams/${teamId}/members`), {
      method: 'POST',
      body: JSON.stringify(member),
    })
  },
  addMembersBatch(teamId: string, users: string[], role: TeamMember['role'] = 'viewer', status: TeamMember['status'] = 'active') {
    return apiFetch<{ added: number }>(p(`/api/teams/${teamId}/members/batch`), {
      method: 'POST',
      body: JSON.stringify({ users, role, status })
    })
  },
  updateMember(teamId: string, memberId: string, patch: Partial<Pick<TeamMember, 'role' | 'status'>>) {
    return apiFetch<TeamMember>(p(`/api/teams/${teamId}/members/${memberId}`), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  },
  removeMember(teamId: string, memberId: string) {
    return apiFetch<{ success: boolean }>(p(`/api/teams/${teamId}/members/${memberId}`), {
      method: 'DELETE',
    })
  },
  // Convenience helpers
  promote(teamId: string, memberId: string) {
    return this.updateMember(teamId, memberId, { role: 'admin' })
  },
  demote(teamId: string, memberId: string) {
    return this.updateMember(teamId, memberId, { role: 'viewer' })
  },
  disable(teamId: string, memberId: string) {
    return this.updateMember(teamId, memberId, { status: 'disabled' })
  },
  getQuota() {
    return apiFetch<TeamQuotaResponse>(p('/api/agents/team_quota'))
  },

  // ===== Team Metrics (Sprint 1) =====
  getVelocity(teamId: string, days: number = 30) {
    return apiFetch<VelocityResponse>(p(`/api/teams/${teamId}/metrics/velocity?days=${days}`))
  },

  getCycleTime(teamId: string, days: number = 30) {
    return apiFetch<CycleTimeResponse>(p(`/api/teams/${teamId}/metrics/cycle-time?days=${days}`))
  },

  getWorkload(teamId: string) {
    return apiFetch<WorkloadResponse>(p(`/api/teams/${teamId}/metrics/workload`))
  },

  getSprintCompletion(teamId: string, sprints: number = 5) {
    return apiFetch<SprintCompletionResponse>(p(`/api/teams/${teamId}/metrics/sprint-completion?sprints=${sprints}`))
  },

  getMetricsSummary(teamId: string) {
    return apiFetch<TeamMetricsSummary>(p(`/api/teams/${teamId}/metrics/summary`))
  },

  // ===== Team Capacity (Sprint 1) =====
  getCapacity(teamId: string, sprintId?: string) {
    const url = sprintId 
      ? p(`/api/teams/${teamId}/capacity?sprint_id=${sprintId}`)
      : p(`/api/teams/${teamId}/capacity`)
    return apiFetch<TeamCapacityResponse>(url)
  },

  setCapacity(teamId: string, body: SetCapacityRequest) {
    return apiFetch<{ message: string; sprint_id: string }>(p(`/api/teams/${teamId}/capacity`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  // ===== Team Settings (Sprint 2) =====
  getSettings(teamId: string) {
    return apiFetch<TeamSettingsResponse>(p(`/api/teams/${teamId}/settings`))
  },

  updateSettings(teamId: string, body: UpdateTeamSettingsRequest) {
    return apiFetch<TeamSettingsResponse>(p(`/api/teams/${teamId}/settings`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  // ===== Team Goals/OKRs (Sprint 2) =====
  listGoals(teamId: string, quarter?: string) {
    const url = quarter
      ? p(`/api/teams/${teamId}/goals?quarter=${quarter}`)
      : p(`/api/teams/${teamId}/goals`)
    return apiFetch<TeamGoalResponse[]>(url)
  },

  createGoal(teamId: string, body: CreateGoalRequest) {
    return apiFetch<TeamGoalResponse>(p(`/api/teams/${teamId}/goals`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateGoal(teamId: string, goalId: string, body: UpdateGoalRequest) {
    return apiFetch<TeamGoalResponse>(p(`/api/teams/${teamId}/goals/${goalId}`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  deleteGoal(teamId: string, goalId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/goals/${goalId}`), {
      method: 'DELETE'
    })
  },

  // ===== Notification Settings (Sprint 2) =====
  getNotificationSettings(teamId: string) {
    return apiFetch<NotificationSettingsResponse>(p(`/api/teams/${teamId}/notifications/settings`))
  },

  updateNotificationSettings(teamId: string, body: UpdateNotificationSettingsRequest) {
    return apiFetch<NotificationSettingsResponse>(p(`/api/teams/${teamId}/notifications/settings`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  // ===== Default Assignees (Sprint 2) =====
  listDefaultAssignees(teamId: string) {
    return apiFetch<DefaultAssigneeResponse[]>(p(`/api/teams/${teamId}/default-assignees`))
  },

  setDefaultAssignee(teamId: string, body: SetDefaultAssigneeRequest) {
    return apiFetch<DefaultAssigneeResponse>(p(`/api/teams/${teamId}/default-assignees`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  deleteDefaultAssignee(teamId: string, issueType?: string, priority?: string) {
    const params = new URLSearchParams()
    if (issueType) params.append('issue_type', issueType)
    if (priority) params.append('priority', priority)
    const url = p(`/api/teams/${teamId}/default-assignees${params.toString() ? '?' + params.toString() : ''}`)
    return apiFetch<{ message: string }>(url, {
      method: 'DELETE'
    })
  },

  // ===== Team Labels (Sprint 2) =====
  listLabels(teamId: string) {
    return apiFetch<TeamLabelResponse[]>(p(`/api/teams/${teamId}/labels`))
  },

  createLabel(teamId: string, body: CreateLabelRequest) {
    return apiFetch<TeamLabelResponse>(p(`/api/teams/${teamId}/labels`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateLabel(teamId: string, labelId: string, body: UpdateLabelRequest) {
    return apiFetch<TeamLabelResponse>(p(`/api/teams/${teamId}/labels/${labelId}`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  deleteLabel(teamId: string, labelId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/labels/${labelId}`), {
      method: 'DELETE'
    })
  },

  // =====================================================
  // Sprint 3: Collaboration & Resources
  // =====================================================

  // Resource Categories
  listCategories(teamId: string) {
    return apiFetch<ResourceCategory[]>(p(`/api/teams/${teamId}/categories`))
  },

  createCategory(teamId: string, body: CreateCategoryRequest) {
    return apiFetch<ResourceCategory>(p(`/api/teams/${teamId}/categories`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateCategory(teamId: string, categoryId: string, body: UpdateCategoryRequest) {
    return apiFetch<ResourceCategory>(p(`/api/teams/${teamId}/categories/${categoryId}`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  deleteCategory(teamId: string, categoryId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/categories/${categoryId}`), {
      method: 'DELETE'
    })
  },

  // Team Resources
  listResources(teamId: string, params?: {
    category_id?: string
    resource_type?: string
    tags?: string
    include_archived?: boolean
  }) {
    const query = new URLSearchParams()
    if (params?.category_id) query.set('category_id', params.category_id)
    if (params?.resource_type) query.set('resource_type', params.resource_type)
    if (params?.tags) query.set('tags', params.tags)
    if (params?.include_archived) query.set('include_archived', 'true')
    const queryString = query.toString()
    return apiFetch<TeamResource[]>(p(`/api/teams/${teamId}/resources${queryString ? `?${queryString}` : ''}`))
  },

  createResource(teamId: string, body: CreateResourceRequest) {
    return apiFetch<TeamResource>(p(`/api/teams/${teamId}/resources`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateResource(teamId: string, resourceId: string, body: UpdateResourceRequest) {
    return apiFetch<TeamResource>(p(`/api/teams/${teamId}/resources/${resourceId}`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  deleteResource(teamId: string, resourceId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/resources/${resourceId}`), {
      method: 'DELETE'
    })
  },

  trackResourceView(teamId: string, resourceId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/resources/${resourceId}/view`), {
      method: 'POST'
    })
  },

  // Team Chat
  listChatMessages(teamId: string, params?: {
    limit?: number
    before_id?: string
    parent_message_id?: string
  }) {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.before_id) query.set('before_id', params.before_id)
    if (params?.parent_message_id) query.set('parent_message_id', params.parent_message_id)
    const queryString = query.toString()
    return apiFetch<ChatMessage[]>(p(`/api/teams/${teamId}/chat${queryString ? `?${queryString}` : ''}`))
  },

  createChatMessage(teamId: string, body: CreateChatMessageRequest) {
    return apiFetch<ChatMessage>(p(`/api/teams/${teamId}/chat`), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateChatMessage(teamId: string, messageId: string, body: UpdateChatMessageRequest) {
    return apiFetch<ChatMessage>(p(`/api/teams/${teamId}/chat/${messageId}`), {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  deleteChatMessage(teamId: string, messageId: string) {
    return apiFetch<{ message: string }>(p(`/api/teams/${teamId}/chat/${messageId}`), {
      method: 'DELETE'
    })
  },

  addMessageReaction(teamId: string, messageId: string, emoji: string) {
    return apiFetch<{ message: string; reactions: Record<string, string[]> }>(p(`/api/teams/${teamId}/chat/${messageId}/react`), {
      method: 'POST',
      body: JSON.stringify({ emoji })
    })
  },

  // Direct Team Member Addition
  listAvailableUsers(teamId: string, search?: string, limit: number = 20) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('limit', limit.toString())
    return apiFetch<WorkspaceUser[]>(p(`/api/teams/${teamId}/available-users?${params.toString()}`))
  },

  addMemberDirect(teamId: string, userId: string, role: TeamMember['role'] = 'viewer') {
    return apiFetch<TeamMember>(p(`/api/teams/${teamId}/members/direct`), {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role })
    })
  },
}

