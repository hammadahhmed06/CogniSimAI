/**
 * Slack Service
 * Handles all Slack integration API calls beyond basic OAuth (connect/disconnect/status).
 * For OAuth operations, use integrationService.ts.
 */

import { apiBase, apiFetch } from './client'

// ============================================
// TYPES
// ============================================

export type SlackChannel = {
  id: string
  name: string
  is_channel: boolean
  is_private: boolean
  is_archived: boolean
  num_members: number | null
}

export type SlackUser = {
  id: string
  name: string
  real_name: string | null
  email: string | null
  is_bot: boolean
  is_admin: boolean
}

export type SlackIntegrationDetails = {
  id: string
  workspace_id: string
  slack_workspace_id: string
  slack_workspace_name: string | null
  slack_team_id: string | null
  bot_user_id: string | null
  default_channel_id: string | null
  default_channel_name: string | null
  notifications_enabled: boolean
  slash_commands_enabled: boolean
  webhook_url: string | null
  scopes: string[]
  installed_by: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export type UpdateSlackSettingsRequest = {
  default_channel_id?: string
  default_channel_name?: string
  notifications_enabled?: boolean
  slash_commands_enabled?: boolean
  is_active?: boolean
}

export type TeamSlackConfig = {
  id: string
  team_id: string
  slack_integration_id: string
  channel_id: string | null
  channel_name: string | null
  notifications_enabled: boolean
  mention_team_on_critical: boolean
  created_at: string
  updated_at: string
}

export type UpdateTeamSlackConfigRequest = {
  channel_id?: string
  channel_name?: string
  notifications_enabled?: boolean
  mention_team_on_critical?: boolean
}

export type SlackNotificationRequest = {
  channel_id?: string
  message: string
  blocks?: Record<string, unknown>[]
  thread_ts?: string
  username?: string
  icon_emoji?: string
}

export type SlackNotificationResponse = {
  success: boolean
  message_ts: string | null
  channel_id: string | null
  error: string | null
}

export type SlackConnectionTestResult = {
  success: boolean
  message: string
  workspace_name?: string
  bot_user_id?: string
}

// ============================================
// SERVICE
// ============================================

export const slackService = {
  // ============= Channels & Users =============

  /**
   * List all channels in the connected Slack workspace
   */
  getChannels: (workspaceId: string) =>
    apiFetch<SlackChannel[]>(apiBase(`/api/workspaces/${workspaceId}/slack/channels`)),

  /**
   * List all users in the connected Slack workspace
   */
  getUsers: (workspaceId: string) =>
    apiFetch<SlackUser[]>(apiBase(`/api/workspaces/${workspaceId}/slack/users`)),

  // ============= Settings =============

  /**
   * Get full integration details
   */
  getDetails: (workspaceId: string) =>
    apiFetch<SlackIntegrationDetails>(apiBase(`/api/workspaces/${workspaceId}/slack`)),

  /**
   * Update Slack integration settings
   */
  updateSettings: (workspaceId: string, data: UpdateSlackSettingsRequest) =>
    apiFetch<SlackIntegrationDetails>(apiBase(`/api/workspaces/${workspaceId}/slack`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /**
   * Test the Slack connection
   */
  testConnection: (workspaceId: string) =>
    apiFetch<SlackConnectionTestResult>(apiBase(`/api/workspaces/${workspaceId}/slack/test`), {
      method: 'POST',
    }),

  // ============= Team Channel Configs =============

  /**
   * Get team-specific Slack channel config
   */
  getTeamConfig: (teamId: string) =>
    apiFetch<TeamSlackConfig>(apiBase(`/api/teams/${teamId}/slack/config`)),

  /**
   * Update team Slack channel config
   */
  updateTeamConfig: (teamId: string, data: UpdateTeamSlackConfigRequest) =>
    apiFetch<TeamSlackConfig>(apiBase(`/api/teams/${teamId}/slack/config`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // ============= Notifications =============

  /**
   * Send a test notification to a Slack channel
   */
  sendNotification: (teamId: string, data: SlackNotificationRequest) =>
    apiFetch<SlackNotificationResponse>(apiBase(`/api/teams/${teamId}/slack/notify`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
}

export default slackService
