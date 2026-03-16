/**
 * Jira Integration API Service
 * Comprehensive Jira API methods for OAuth, projects, issues, sync, and webhooks
 */

import { apiBase, apiFetch } from './client'

// ============================================
// TYPE DEFINITIONS
// ============================================

// OAuth Types
export type JiraOAuthInitResponse = {
  authorization_url: string
  state: string
}

export type JiraOAuthStatus = {
  is_connected: boolean
  integration_id?: string
  site_url?: string
  cloud_id?: string
  connection_status?: 'connected' | 'failed' | 'disconnected' | 'pending'
  last_tested_at?: string
}

// Project Types
export type JiraProject = {
  id: string
  key: string
  name: string
  description?: string
  lead?: { displayName: string; emailAddress: string }
  projectTypeKey?: string
}

// Issue Types
export type JiraIssue = {
  id: string
  key: string
  fields: {
    summary: string
    description?: unknown
    issuetype: { name: string; id: string }
    status: { name: string; id: string }
    priority?: { name: string; id: string }
    assignee?: { displayName: string; emailAddress: string }
    created: string
    updated: string
    [key: string]: unknown
  }
}

export type JiraSearchRequest = {
  jql: string
  max_results?: number
  start_at?: number
  fields?: string[]
}

export type JiraSearchResponse = {
  success: boolean
  issues: JiraIssue[]
  total: number
  start_at: number
  max_results: number
}

export type JiraCreateIssueRequest = {
  project_key: string
  summary: string
  description?: string
  issue_type?: string
  priority?: string
  epic_link?: string
  labels?: string[]
  assignee_id?: string
}

export type JiraCreateIssueResponse = {
  success: boolean
  issue_key: string
  issue_id: string
  self: string
}

// Sync Types
export type SyncProjectRequest = {
  project_key: string
  include_issues?: boolean
  since?: string
}

export type SyncProjectResponse = {
  success: boolean
  message: string
  job_id: string
  project_id: string
  items_processed: number
  items_created: number
  items_updated: number
}

export type SyncJob = {
  id: string
  workspace_id: string
  integration_id: string
  sync_type: 'manual' | 'auto' | 'initial' | 'webhook'
  resource_type: string
  resource_id?: string
  status: 'in_progress' | 'success' | 'failed' | 'partial'
  items_processed: number
  items_created: number
  items_updated: number
  items_failed: number
  error_message?: string
  started_at: string
  completed_at?: string
  sync_metadata?: Record<string, unknown>
}

export type SyncJobStatusResponse = {
  success: boolean
  job: SyncJob
}

export type SyncJobsListResponse = {
  success: boolean
  jobs: SyncJob[]
  count: number
}

// Webhook Types
export type WebhookRegisterRequest = {
  project_key?: string
  events?: string[]
}

export type Webhook = {
  id: string
  workspace_id: string
  integration_id: string
  jira_webhook_id: string
  webhook_name: string
  webhook_url: string
  events: string[]
  jql_filter?: string
  is_active: boolean
  last_received_at?: string
  created_at: string
  updated_at: string
}

export type WebhookRegisterResponse = {
  success: boolean
  message: string
  webhook_id: string
  jira_webhook_id: string
  webhook_url: string
}

export type WebhookListResponse = {
  success: boolean
  webhooks: Webhook[]
}

// Push to Jira Types
export type PushToJiraRequest = {
  issue_ids: string[]
  epic_key?: string
}

export type PushToJiraResponse = {
  success: boolean
  created_count: number
  failed_count: number
  results: Array<{
    title: string
    jira_key: string
    jira_url: string
  }>
  failed: Array<{
    title: string
    error: string
  }>
}

// Board & Sprint Types
export type JiraBoard = {
  id: number
  name: string
  type: string
}

export type JiraSprint = {
  id: number
  name: string
  state: 'active' | 'future' | 'closed'
  startDate?: string
  endDate?: string
  originBoardId: number
}

// ============================================
// JIRA SERVICE
// ============================================

export const jiraService = {
  // ============= OAuth =============
  
  /**
   * Initialize Jira OAuth flow
   */
  initOAuth: () =>
    apiFetch<JiraOAuthInitResponse>(apiBase('/api/jira/oauth/init')),

  /**
   * Get Jira OAuth connection status
   */
  getOAuthStatus: () =>
    apiFetch<JiraOAuthStatus>(apiBase('/api/jira/oauth/status')),

  /**
   * Disconnect Jira integration
   */
  disconnect: () =>
    apiFetch<{ success: boolean; message: string }>(apiBase('/api/jira/oauth/disconnect'), {
      method: 'POST',
    }),

  // ============= Projects =============
  
  /**
   * List all accessible Jira projects
   */
  listProjects: (integrationId: string) =>
    apiFetch<{ projects: JiraProject[] }>(apiBase(`/api/jira/projects/${integrationId}`)),

  /**
   * Get a specific project by key
   */
  getProject: (integrationId: string, projectKey: string) =>
    apiFetch<JiraProject>(apiBase(`/api/jira/projects/${integrationId}/${projectKey}`)),

  /**
   * Get assignable users for a project
   */
  getProjectUsers: (integrationId: string, projectKey: string) =>
    apiFetch<unknown[]>(apiBase(`/api/jira/projects/${integrationId}/${projectKey}/users`)),

  /**
   * Get issue types for a project
   */
  getProjectIssueTypes: (integrationId: string, projectKey: string) =>
    apiFetch<unknown[]>(apiBase(`/api/jira/projects/${integrationId}/${projectKey}/issue-types`)),

  /**
   * Get statuses for a project
   */
  getProjectStatuses: (integrationId: string, projectKey: string) =>
    apiFetch<unknown[]>(apiBase(`/api/jira/projects/${integrationId}/${projectKey}/statuses`)),

  // ============= Issues =============
  
  /**
   * Search for issues using JQL
   */
  searchIssues: (integrationId: string, request: JiraSearchRequest) =>
    apiFetch<JiraSearchResponse>(apiBase(`/api/jira/issues/${integrationId}/search`), {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * Get a specific issue by key
   */
  getIssue: (integrationId: string, issueKey: string, fields?: string[], expand?: string[]) => {
    const params = new URLSearchParams()
    if (fields) params.append('fields', fields.join(','))
    if (expand) params.append('expand', expand.join(','))
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiFetch<{ success: boolean; issue: JiraIssue }>(
      apiBase(`/api/jira/issues/${integrationId}/${issueKey}${query}`)
    )
  },

  /**
   * Create a new issue in Jira
   */
  createIssue: (integrationId: string, request: JiraCreateIssueRequest) =>
    apiFetch<JiraCreateIssueResponse>(apiBase(`/api/jira/issues/${integrationId}/create`), {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * Update an existing issue
   */
  updateIssue: (
    integrationId: string,
    issueKey: string,
    updates: {
      summary?: string
      description?: string
      priority?: string
      labels?: string[]
    }
  ) =>
    apiFetch<{ success: boolean; message: string }>(
      apiBase(`/api/jira/issues/${integrationId}/${issueKey}`),
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    ),

  /**
   * Get available transitions for an issue
   */
  getIssueTransitions: (integrationId: string, issueKey: string) =>
    apiFetch<{ success: boolean; transitions: unknown[] }>(
      apiBase(`/api/jira/issues/${integrationId}/${issueKey}/transitions`)
    ),

  /**
   * Transition an issue to a new status
   */
  transitionIssue: (integrationId: string, issueKey: string, transitionId: string, comment?: string) =>
    apiFetch<{ success: boolean; message: string }>(
      apiBase(`/api/jira/issues/${integrationId}/${issueKey}/transition`),
      {
        method: 'POST',
        body: JSON.stringify({ transition_id: transitionId, comment }),
      }
    ),

  /**
   * Add a comment to an issue
   */
  addComment: (integrationId: string, issueKey: string, comment: string) =>
    apiFetch<{ success: boolean; comment_id: string; message: string }>(
      apiBase(`/api/jira/issues/${integrationId}/${issueKey}/comment`),
      {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }
    ),

  /**
   * Push multiple local issues to Jira
   */
  pushToJira: (integrationId: string, request: PushToJiraRequest) =>
    apiFetch<PushToJiraResponse>(apiBase(`/api/jira/issues/${integrationId}/push`), {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * Push a single local issue to Jira
   */
  pushSingleIssue: (integrationId: string, issueId: string) =>
    apiFetch<{
      success: boolean
      action: 'created' | 'updated'
      jira_key: string
      jira_url: string
    }>(apiBase(`/api/jira/issues/${integrationId}/push/${issueId}`), {
      method: 'POST',
    }),

  // ============= Boards & Sprints =============
  
  /**
   * List all boards
   */
  listBoards: (integrationId: string, projectKey?: string) => {
    const query = projectKey ? `?project_key=${projectKey}` : ''
    return apiFetch<{ values: JiraBoard[] }>(apiBase(`/api/jira/boards/${integrationId}${query}`))
  },

  /**
   * Get board details
   */
  getBoard: (integrationId: string, boardId: number) =>
    apiFetch<JiraBoard>(apiBase(`/api/jira/boards/${integrationId}/${boardId}`)),

  /**
   * Get sprints for a board
   */
  getBoardSprints: (integrationId: string, boardId: number, state?: 'active' | 'future' | 'closed') => {
    const query = state ? `?state=${state}` : ''
    return apiFetch<{ values: JiraSprint[] }>(
      apiBase(`/api/jira/boards/${integrationId}/${boardId}/sprints${query}`)
    )
  },

  /**
   * Get sprint details
   */
  getSprint: (integrationId: string, sprintId: number) =>
    apiFetch<JiraSprint>(apiBase(`/api/jira/boards/${integrationId}/sprints/${sprintId}`)),

  /**
   * Get issues in a sprint
   */
  getSprintIssues: (integrationId: string, sprintId: number, jql?: string) => {
    const query = jql ? `?jql=${encodeURIComponent(jql)}` : ''
    return apiFetch<{ issues: JiraIssue[]; total: number }>(
      apiBase(`/api/jira/boards/${integrationId}/sprints/${sprintId}/issues${query}`)
    )
  },

  // ============= Sync =============
  
  /**
   * Sync a Jira project to local database
   */
  syncProject: (integrationId: string, request: SyncProjectRequest) =>
    apiFetch<SyncProjectResponse>(apiBase(`/api/jira/sync/${integrationId}/project`), {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * Sync a sprint
   */
  syncSprint: (integrationId: string, sprintId: number, boardId?: number) =>
    apiFetch<{
      success: boolean
      message: string
      job_id: string
      sprint_name?: string
      items_processed: number
      items_created: number
      items_updated: number
    }>(apiBase(`/api/jira/sync/${integrationId}/sprint`), {
      method: 'POST',
      body: JSON.stringify({ sprint_id: sprintId, board_id: boardId }),
    }),

  /**
   * Get sync job status
   */
  getSyncStatus: (integrationId: string, jobId: string) =>
    apiFetch<SyncJobStatusResponse>(apiBase(`/api/jira/sync/${integrationId}/status/${jobId}`)),

  /**
   * List sync jobs
   */
  listSyncJobs: (integrationId: string, status?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
    if (status) params.append('status', status)
    return apiFetch<SyncJobsListResponse>(apiBase(`/api/jira/sync/${integrationId}/jobs?${params.toString()}`))
  },

  // ============= Webhooks =============
  
  /**
   * Register a webhook for real-time sync
   */
  registerWebhook: (integrationId: string, request: WebhookRegisterRequest) =>
    apiFetch<WebhookRegisterResponse>(apiBase(`/api/jira/sync/${integrationId}/webhook/register`), {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * List registered webhooks
   */
  listWebhooks: (integrationId: string) =>
    apiFetch<WebhookListResponse>(apiBase(`/api/jira/sync/${integrationId}/webhook/list`)),

  /**
   * Delete a webhook
   */
  deleteWebhook: (integrationId: string, webhookId: string) =>
    apiFetch<{ success: boolean; message: string }>(
      apiBase(`/api/jira/sync/${integrationId}/webhook/${webhookId}`),
      {
        method: 'DELETE',
      }
    ),
  /**
   * List webhook events
   */
  listWebhookEvents: (integrationId: string, processed?: boolean, limit = 50) => {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (processed !== undefined) params.append('processed', processed.toString())
    return apiFetch<{
      success: boolean
      events: Array<{
        id: string
        event_type: string
        issue_key?: string
        payload: unknown
        processed: boolean
        received_at: string
      }>
      count: number
    }>(apiBase(`/api/jira/sync/${integrationId}/webhook/events?${params.toString()}`))
  },

  // ============= Settings & Preferences =============

  /**
   * Get sync preferences for a Jira integration
   */
  getSyncPreferences: (integrationId: string) =>
    apiFetch<{
      success: boolean
      preferences: {
        id: string
        workspace_id: string
        integration_id: string
        auto_sync_enabled: boolean
        real_time_updates_enabled: boolean
        bidirectional_sync_enabled: boolean
        sync_comments_enabled: boolean
        auto_sync_interval_minutes: number
        sync_project_keys?: string[]
        sync_issue_types?: string[]
        created_at: string
        updated_at: string
      }
    }>(apiBase(`/api/jira/settings/${integrationId}/preferences`)),

  /**
   * Update sync preferences
   */
  updateSyncPreferences: (
    integrationId: string,
    preferences: {
      auto_sync_enabled?: boolean
      real_time_updates_enabled?: boolean
      bidirectional_sync_enabled?: boolean
      sync_comments_enabled?: boolean
      auto_sync_interval_minutes?: number
      sync_project_keys?: string[]
      sync_issue_types?: string[]
    }
  ) =>
    apiFetch<{
      success: boolean
      message: string
      preferences: unknown
    }>(apiBase(`/api/jira/settings/${integrationId}/preferences`), {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    }),

  /**
   * Import all projects from Jira
   */
  importProjects: (integrationId: string) =>
    apiFetch<{
      success: boolean
      message: string
      imported_count: number
    }>(apiBase(`/api/jira/settings/${integrationId}/actions/import-projects`), {
      method: 'POST',
    }),

  /**
   * Import issues from Jira projects
   */
  importIssues: (integrationId: string, projectKeys?: string[]) =>
    apiFetch<{
      success: boolean
      message: string
      imported_count: number
      updated_count: number
    }>(apiBase(`/api/jira/settings/${integrationId}/actions/import-issues`), {
      method: 'POST',
      body: projectKeys ? JSON.stringify({ project_keys: projectKeys }) : undefined,
    }),

  /**
   * Export local issues to Jira
   */
  exportIssues: (integrationId: string, projectKey?: string) =>
    apiFetch<{
      success: boolean
      message: string
      note?: string
    }>(apiBase(`/api/jira/settings/${integrationId}/actions/export-issues`), {
      method: 'POST',
      body: projectKey ? JSON.stringify({ project_key: projectKey }) : undefined,
    }),

  /**
   * Force full resync of all Jira data
   */
  forceResync: (integrationId: string) =>
    apiFetch<{
      success: boolean
      message: string
      synced_projects: string[]
    }>(apiBase(`/api/jira/settings/${integrationId}/actions/force-resync`), {
      method: 'POST',
    }),
}

export default jiraService