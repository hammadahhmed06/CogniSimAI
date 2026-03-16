/**
 * Integration Service
 * Handles OAuth and status for Jira and Slack integrations
 * For detailed Jira operations (issues, sync, webhooks), use jiraService.ts
 */

import { apiBase, apiFetch } from './client'

// ============================================
// JIRA INTEGRATION TYPES
// ============================================

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

export type JiraDisconnectResponse = {
  success: boolean
  message: string
}

// ============================================
// SLACK INTEGRATION TYPES
// ============================================

export type SlackIntegrationStatusResponse = {
  is_connected: boolean
  workspace_id?: string
  workspace_name?: string
  slack_workspace_name?: string
  default_channel_name?: string
  notifications_enabled: boolean
  slash_commands_enabled: boolean
  last_sync_at?: string | null
  installed_by_email?: string
  scopes: string[]
}

export type SlackOAuthInitResponse = {
  authorization_url: string
  state: string
  expires_at: string
}

// ============================================
// INTEGRATION SERVICE
// ============================================

export const integrationService = {
  // ============= JIRA OAUTH =============
  
  /**
   * Initialize Jira OAuth flow
   * @returns Authorization URL and state for OAuth
   */
  initJiraOAuth: () =>
    apiFetch<JiraOAuthInitResponse>(apiBase('/api/jira/oauth/init')),

  /**
   * Get Jira OAuth connection status
   * @returns Current Jira connection status
   */
  getJiraOAuthStatus: () =>
    apiFetch<JiraOAuthStatus>(apiBase('/api/jira/oauth/status')),

  /**
   * Disconnect Jira integration
   * @returns Success status
   */
  disconnectJira: () =>
    apiFetch<JiraDisconnectResponse>(apiBase('/api/jira/oauth/disconnect'), {
      method: 'POST',
    }),

  // ============= SLACK INTEGRATION =============
  
  /**
   * Get Slack integration status
   * @param workspaceId - Workspace ID
   * @returns Slack connection status
   */
  getSlackStatus: (workspaceId: string) =>
    apiFetch<SlackIntegrationStatusResponse>(apiBase(`/api/workspaces/${workspaceId}/slack`)),

  /**
   * Initialize Slack OAuth flow
   * @param workspaceId - Workspace ID
   * @returns Authorization URL and state for OAuth
   */
  initSlackOAuth: (workspaceId: string) =>
    apiFetch<SlackOAuthInitResponse>(apiBase(`/api/workspaces/${workspaceId}/slack/oauth/init`)),

  /**
   * Disconnect Slack integration
   * @param workspaceId - Workspace ID
   * @returns Success message
   */
  disconnectSlack: (workspaceId: string) =>
    apiFetch<{ message: string }>(apiBase(`/api/workspaces/${workspaceId}/slack`), {
      method: 'DELETE',
    }),
}

export default integrationService
