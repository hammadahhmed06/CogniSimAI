import { apiBase, apiFetch } from './client'

// Workspace domain models
export interface Workspace {
  id: string
  name: string
  description?: string | null
  slug?: string | null
  plan?: string | null
  member_role?: string | null
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id?: string | null
  invited_email?: string | null
  role: string
  status: string
  created_at?: string
  joined_at?: string
}

export interface WorkspaceInviteResponse extends WorkspaceMember {
  invite_link?: string | null
  invitation_token?: string | null
  expires_at?: string | null
  email_sent?: boolean
  email_error?: string | null
}

export interface WorkspaceInviteLinkResponse {
  invite_link: string
  invitation_token: string
  expires_at: string
}

export interface WorkspaceDetail extends Workspace {
  members_count: number
}

export interface WorkspaceActivityEvent {
  id: string
  workspace_id: string
  action: string
  actor_user_id?: string | null
  created_at?: string
  meta?: Record<string, unknown> | null
}

const p = (path: string) => apiBase(path)

export const workspaceService = {
  // Workspaces
  listWorkspaces: () => apiFetch<Workspace[]>(p('/api/workspaces')),
  createWorkspace: (body: CreateWorkspaceInput) => 
    apiFetch<Workspace>(p('/api/workspaces'), { 
      method: 'POST', 
      body: JSON.stringify(body) 
    }),
  getDefaultWorkspace: () => apiFetch<Workspace>(p('/api/workspaces/default')),
  getWorkspaceDetail: (id: string) => apiFetch<WorkspaceDetail>(p(`/api/workspaces/${id}`)),
  updateWorkspace: (id: string, data: Partial<CreateWorkspaceInput>) => 
    apiFetch<Workspace>(p(`/api/workspaces/${id}`), { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWorkspace: (id: string) => apiFetch<void>(p(`/api/workspaces/${id}`), { method: 'DELETE' }),
  leaveWorkspace: (id: string) => apiFetch<void>(p(`/api/workspaces/${id}/leave`), { method: 'POST' }),
  transferOwnership: (id: string, newOwnerMemberId: string) =>
    apiFetch<void>(p(`/api/workspaces/${id}/transfer-owner`), { method: 'POST', body: JSON.stringify({ new_owner_member_id: newOwnerMemberId }) }),
  listActivity: (id: string) => apiFetch<WorkspaceActivityEvent[]>(p(`/api/workspaces/${id}/activity`)),
  switchWorkspace: (workspaceId: string) => apiFetch<Workspace>(p('/api/workspaces/switch'), { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId }) }),
  updateSettings: (workspaceId: string, data: { estimation_scale?: string; default_sprint_length?: number; timezone?: string }) =>
    apiFetch<void>(p(`/api/workspaces/${workspaceId}/settings`), { method: 'PATCH', body: JSON.stringify(data) }),
  // Members
  listMembers: (workspaceId: string) => apiFetch<WorkspaceMember[]>(p(`/api/workspaces/${workspaceId}/members`)),
  inviteMember: (workspaceId: string, email: string, role: string, sendEmail: boolean = true) =>
    apiFetch<WorkspaceInviteResponse>(p(`/api/workspaces/${workspaceId}/members/invite`), {
      method: 'POST',
      body: JSON.stringify({ email, role, send_email: sendEmail }),
    }),
  createInviteLink: (workspaceId: string, role: string = 'viewer', expiresDays: number = 7) =>
    apiFetch<WorkspaceInviteLinkResponse>(p(`/api/workspaces/${workspaceId}/invite-link`), {
      method: 'POST',
      body: JSON.stringify({ role, expires_days: expiresDays }),
    }),
  updateMemberRole: (workspaceId: string, memberId: string, role: string) =>
    apiFetch<WorkspaceMember>(p(`/api/workspaces/${workspaceId}/members/${memberId}/role`), {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (workspaceId: string, memberId: string) =>
    apiFetch<void>(p(`/api/workspaces/${workspaceId}/members/${memberId}`), { method: 'DELETE' }),
}

export type { Workspace as WorkspaceDTO }
