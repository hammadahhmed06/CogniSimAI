import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTeam } from '@/hooks/useTeam'
import { Users, MoreHorizontal, Loader2, Eye, Edit, Shield, Crown, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useEffect, useState, useCallback } from 'react'
import { teamService, type TeamMember, type WorkspaceUser } from '@/lib/api/teamService'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/AuthContext'

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-800'
    case 'admin': return 'bg-blue-100 text-blue-800'
    case 'editor': return 'bg-green-100 text-green-800'
    case 'viewer': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'invited': return 'bg-yellow-100 text-yellow-800'
    case 'disabled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function TeamMembers() {
  const { currentTeam } = useTeam()
  const { user } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canManage = currentTeam?.my_role === 'admin' || currentTeam?.my_role === 'owner'

  const [userSearch, setUserSearch] = useState('')
  const [availableUsers, setAvailableUsers] = useState<WorkspaceUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (!currentTeam) return
    setLoading(true)
    setError(null)
    try {
      const list = await teamService.listMembers(currentTeam.id)
      setMembers(list)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load members'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [currentTeam])

  useEffect(() => { loadMembers() }, [loadMembers])

  const loadAvailableUsers = useCallback(async () => {
    if (!currentTeam || !canManage) { setAvailableUsers([]); return }
    if (!activeWorkspaceId) { setAvailableUsers([]); return }
    setLoadingUsers(true)
    try {
      const list = await teamService.listAvailableUsers(currentTeam.id, userSearch.trim() || undefined, 20)
      setAvailableUsers(list)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load workspace users'
      notify.error(msg)
      setAvailableUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [activeWorkspaceId, canManage, currentTeam, userSearch])

  useEffect(() => { loadAvailableUsers() }, [loadAvailableUsers])

  const isOwner = currentTeam?.my_role === 'owner'
  const myUserId = user?.id || null

  const canModifyMember = (m: TeamMember) => {
    if (!canManage) return false
    // Only owners can change/remove owners
    if (m.role === 'owner' && !isOwner) return false
    return true
  }

  const closeMemberMenu = () => setOpenMemberMenuId(null)

  const changeRole = async (member: TeamMember, role: TeamMember['role']) => {
    if (!currentTeam) return
    if (!canModifyMember(member)) return
    if (member.role === role) return

    // Close the dropdown immediately to avoid any lingering outside-pointer-events layer
    closeMemberMenu()

    // Only owners can transfer ownership
    if (role === 'owner' && !isOwner) {
      notify.error('Only the team owner can transfer ownership')
      return
    }

    const isSelf = myUserId && String(member.user_id) === String(myUserId)
    if (isSelf && member.role === 'owner' && role !== 'owner') {
      notify.error('Owners cannot demote themselves. Transfer ownership first.')
      return
    }

    if (role === 'owner') {
      const ok = window.confirm(`Transfer ownership to ${displayName(member)}? You may lose admin controls.`)
      if (!ok) return
    }

    setUpdatingMemberId(member.id)
    try {
      await teamService.updateMember(currentTeam.id, member.id, { role })
      notify.success('Role updated')
      await loadMembers()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update role'
      notify.error(msg)
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const removeMember = async (member: TeamMember) => {
    if (!currentTeam) return
    if (!canModifyMember(member)) return

    // Close the dropdown immediately to avoid any lingering outside-pointer-events layer
    closeMemberMenu()

    const isSelf = myUserId && String(member.user_id) === String(myUserId)
    if (isSelf) {
      notify.error('You cannot remove yourself from the team here.')
      return
    }

    const ok = window.confirm(`Remove ${displayName(member)} from ${currentTeam.name}?`)
    if (!ok) return

    setUpdatingMemberId(member.id)
    try {
      await teamService.removeMember(currentTeam.id, member.id)
      notify.success('Member removed')
      await loadMembers()
      await loadAvailableUsers()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to remove member'
      notify.error(msg)
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const displayName = (m: TeamMember) => (m.full_name || m.email || m.user_id)
  const displaySub = (m: TeamMember) => (m.full_name ? (m.email || m.user_id) : (m.email ? m.email : ''))
  const initials = (m: TeamMember) => {
    const base = (m.full_name || m.email || m.user_id || '').trim()
    if (!base) return 'U'
    const parts = base.includes('@') ? base.split('@')[0].split(/[\s._-]+/) : base.split(/\s+/)
    const a = (parts[0] || 'U')[0] || 'U'
    const b = (parts[1] || '')[0] || ''
    return (a + b).toUpperCase()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-600 mt-2">Manage who has access to your team.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
            <CardDescription>
              People who have access to {currentTeam?.name || 'this team'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : error ? (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-2">{error}</div>
            ) : (
              <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">{initials(member)}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{displayName(member)}</h3>
                      <p className="text-xs text-gray-500">{displaySub(member) || 'Team member'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                    <Badge className={getStatusBadgeColor(member.status)}>
                      {member.status}
                    </Badge>

                    {canManage && (
                      <DropdownMenu
                        open={openMemberMenuId === member.id}
                        onOpenChange={(open) => setOpenMemberMenuId(open ? member.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={updatingMemberId === member.id}>
                            {updatingMemberId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            disabled={!canModifyMember(member) || member.role === 'viewer'}
                            onClick={() => changeRole(member, 'viewer')}
                          >
                            <Eye className="h-4 w-4 mr-2 text-slate-400" />
                            Set Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canModifyMember(member) || member.role === 'editor'}
                            onClick={() => changeRole(member, 'editor')}
                          >
                            <Edit className="h-4 w-4 mr-2 text-blue-500" />
                            Set Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canModifyMember(member) || member.role === 'admin'}
                            onClick={() => changeRole(member, 'admin')}
                          >
                            <Shield className="h-4 w-4 mr-2 text-purple-500" />
                            Set Admin
                          </DropdownMenuItem>

                          {isOwner && (
                            <DropdownMenuItem
                              disabled={!canModifyMember(member) || member.role === 'owner'}
                              onClick={() => changeRole(member, 'owner')}
                            >
                              <Crown className="h-4 w-4 mr-2 text-amber-500" />
                              Transfer Ownership
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!canModifyMember(member)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => removeMember(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Add from workspace</CardTitle>
              <CardDescription>
                After a user accepts the workspace invite, you can add them to this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeWorkspaceId ? (
                <div className="text-sm text-muted-foreground">Select a workspace first.</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search workspace users by name or email"
                    />
                    <Button variant="outline" onClick={loadAvailableUsers} disabled={loadingUsers}>
                      {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No workspace users found.</div>
                  ) : (
                    <div className="space-y-2">
                      {availableUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 font-semibold">
                              {String(u.full_name || u.email || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{u.full_name || u.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{u.full_name ? u.email : 'Workspace member'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.is_team_member ? (
                              <Badge className="bg-emerald-100 text-emerald-800">Already in team</Badge>
                            ) : (
                              <Button size="sm" onClick={async () => {
                                if (!currentTeam) return
                                try {
                                  await teamService.addMemberDirect(currentTeam.id, u.id)
                                  notify.success('Added to team')
                                  await loadMembers()
                                  await loadAvailableUsers()
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : 'Failed to add to team'
                                  notify.error(msg)
                                }
                              }}>
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}