/**
 * GitHub App Integration Service
 * Handles GitHub App OAuth, repository discovery, issue sync, and conflict resolution.
 */

import { apiBase, apiFetch } from './client'

// ============================================
// TYPES
// ============================================

export type GitHubStatusResponse = {
  is_connected: boolean
  workspace_id: string
  github_installation_id?: number
  account_login?: string
  account_type?: string
  repository_selection?: string
  installed_by?: string
  created_at?: string
}

export type GitHubInstallUrlResponse = {
  install_url: string
  state: string
  expires_at: string
}

export type GitHubRepo = {
  github_repo_id: number
  full_name: string
  private: boolean
  archived: boolean
  default_branch?: string
  html_url?: string
}

export type GitHubRefreshReposResponse = {
  success: boolean
  count: number
}

export type GitHubPushIssuesResult = {
  internal_issue_id: string
  github_repo_id: number
  github_issue_number?: number
  github_issue_url?: string
  action: 'created' | 'updated' | 'skipped'
  error?: string
}

export type GitHubConflict = {
  id: string
  workspace_id: string
  conflict_type: string
  local_entity_type: string
  local_entity_id: string
  github_entity_type: string
  github_entity_id: string
  conflicting_fields: string[]
  local_version: Record<string, unknown>
  github_version: Record<string, unknown>
  local_updated_at?: string
  github_updated_at?: string
  status: 'pending' | 'resolved'
  resolved_by?: string
  resolved_at?: string
  created_at?: string
}

export type GitHubDisconnectResponse = {
  success: boolean
}

export type GitHubConflictResolveResponse = {
  success: boolean
}

// ---------- Projects v2 types ----------

export type GitHubProjectField = {
  id: string
  name: string
  dataType: string
  options?: { id: string; name: string }[]
  configuration?: {
    iterations?: { id: string; title: string; startDate: string; duration: number }[]
  }
}

export type GitHubProjectSyncJob = {
  id: string
  workspace_id: string
  sync_type: string
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

export type GitHubProjectLink = {
  id: string
  workspace_id: string
  owner_login: string
  owner_type: 'org' | 'user'
  project_number: number
  project_node_id: string
  title?: string
  url?: string
  sync_enabled: boolean
  last_reconciled_at?: string
  field_mappings?: Record<string, unknown>
}

export type GitHubPushItemResult = {
  internal_issue_id: string
  action: 'created' | 'updated' | 'skipped'
  error?: string
  item_node_id?: string
}

// ============================================
// SERVICE
// ============================================

const p = (path: string) => apiBase(path)

export const githubService = {
  /**
   * Get GitHub integration status for a workspace.
   */
  getStatus: (workspaceId: string) =>
    apiFetch<GitHubStatusResponse>(p(`/api/workspaces/${workspaceId}/github/status`)),

  /**
   * Generate GitHub App installation URL. Admin-only.
   * The returned install_url should be used to redirect the user to GitHub.
   */
  getInstallUrl: (workspaceId: string) =>
    apiFetch<GitHubInstallUrlResponse>(p(`/api/workspaces/${workspaceId}/github/install-url`)),

  /**
   * Disconnect (deactivate) the GitHub installation for a workspace. Admin-only.
   */
  disconnect: (workspaceId: string) =>
    apiFetch<GitHubDisconnectResponse>(p(`/api/workspaces/${workspaceId}/github/disconnect`), {
      method: 'POST',
    }),

  /**
   * List cached GitHub repositories accessible via the installation.
   */
  listRepos: (workspaceId: string) =>
    apiFetch<GitHubRepo[]>(p(`/api/workspaces/${workspaceId}/github/repos`)),

  /**
   * Refresh the repository list from GitHub API. Admin-only.
   */
  refreshRepos: (workspaceId: string) =>
    apiFetch<GitHubRefreshReposResponse>(p(`/api/workspaces/${workspaceId}/github/repos/refresh`), {
      method: 'POST',
    }),

  /**
   * Push internal issues to GitHub Issues (create or update). Admin-only.
   */
  pushIssues: (
    workspaceId: string,
    issueIds: string[],
    githubRepoId?: number,
    repoFullName?: string,
  ) =>
    apiFetch<GitHubPushIssuesResult[]>(p(`/api/workspaces/${workspaceId}/github/issues/push`), {
      method: 'POST',
      body: JSON.stringify({
        issue_ids: issueIds,
        github_repo_id: githubRepoId,
        repo_full_name: repoFullName,
      }),
    }),

  /**
   * List pending sync conflicts for a workspace.
   */
  listConflicts: (workspaceId: string) =>
    apiFetch<GitHubConflict[]>(p(`/api/workspaces/${workspaceId}/github/conflicts`)),

  /**
   * Resolve a sync conflict by choosing the local or GitHub version.
   */
  resolveConflict: (
    workspaceId: string,
    conflictId: string,
    resolution: 'local' | 'github',
  ) =>
    apiFetch<GitHubConflictResolveResponse>(
      p(`/api/workspaces/${workspaceId}/github/conflicts/${conflictId}/resolve`),
      {
        method: 'POST',
        body: JSON.stringify({ resolution }),
      },
    ),

  // ==============================
  // Projects v2
  // ==============================

  /**
   * Discover GitHub Projects v2 for an owner (org or user).
   */
  discoverProjects: (workspaceId: string, ownerLogin: string, ownerType: 'org' | 'user') =>
    apiFetch<{ owner_login: string; owner_type: string; projects: Array<{ id: string; number: number; title: string; url: string; closed: boolean }> }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2?owner_login=${encodeURIComponent(ownerLogin)}&owner_type=${ownerType}`),
    ),

  /**
   * Link a GitHub Project v2 to the workspace.
   */
  linkProject: (
    workspaceId: string,
    project: {
      owner_login: string
      owner_type: 'org' | 'user'
      project_number: number
      project_node_id: string
      title?: string
      url?: string
    },
  ) =>
    apiFetch<{ success: boolean }>(p(`/api/workspaces/${workspaceId}/github/projects-v2/link`), {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  /**
   * Fetch field definitions for a linked project.
   */
  getProjectFields: (workspaceId: string, linkId: string) =>
    apiFetch<{ fields: GitHubProjectField[] }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2/${linkId}/fields`),
    ),

  /**
   * Save field mappings for a linked project.
   */
  saveFieldMappings: (workspaceId: string, linkId: string, mappings: Record<string, unknown>) =>
    apiFetch<{ success: boolean }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2/${linkId}/field-mappings`),
      {
        method: 'POST',
        body: JSON.stringify({ mappings }),
      },
    ),

  /**
   * Trigger manual reconciliation for a linked project.
   */
  syncProject: (workspaceId: string, linkId: string) =>
    apiFetch<{ job_id: string; updated: number; conflicts: number; pushed: number }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2/${linkId}/sync`),
      { method: 'POST' },
    ),

  /**
   * Push selected issues into a GitHub Project v2 as items.
   */
  pushItemsToProject: (workspaceId: string, linkId: string, issueIds: string[]) =>
    apiFetch<{ results: GitHubPushItemResult[] }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2/${linkId}/push-items`),
      {
        method: 'POST',
        body: JSON.stringify({ issue_ids: issueIds }),
      },
    ),

  /**
   * Get latest sync job status for a linked project.
   */
  getProjectSyncStatus: (workspaceId: string, linkId: string) =>
    apiFetch<{ sync_job: GitHubProjectSyncJob | null }>(
      p(`/api/workspaces/${workspaceId}/github/projects-v2/${linkId}/sync-status`),
    ),
}

export default githubService
