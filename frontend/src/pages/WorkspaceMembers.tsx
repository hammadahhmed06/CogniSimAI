import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService, type WorkspaceMember, type WorkspaceDetail, type WorkspaceInviteResponse, type WorkspaceInviteLinkResponse } from '@/lib/api/workspaceService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { notify } from '@/lib/notify'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Mail, 
  Link, 
  Copy, 
  Check, 
  Loader2, 
  MoreHorizontal, 
  Crown, 
  Shield, 
  UserCheck, 
  Eye, 
  Trash2,
  Search,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

const getRoleBadgeStyle = (role?: string) => {
  switch (role) {
    case 'owner': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'member': return 'bg-blue-50 text-blue-700 border-blue-200'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

const getRoleIcon = (role?: string) => {
  switch (role) {
    case 'owner': return <Crown className="w-3.5 h-3.5 text-amber-500" />
    case 'admin': return <Shield className="w-3.5 h-3.5 text-purple-500" />
    case 'member': return <UserCheck className="w-3.5 h-3.5 text-blue-500" />
    default: return <Eye className="w-3.5 h-3.5 text-slate-400" />
  }
}

const getStatusBadgeStyle = (status?: string) => {
  switch (status) {
    case 'active': return 'bg-green-50 text-green-700 border-green-200'
    case 'invited': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'disabled': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'active': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    case 'invited': return <Clock className="w-3.5 h-3.5 text-yellow-500" />
    case 'disabled': return <XCircle className="w-3.5 h-3.5 text-red-500" />
    default: return null
  }
}

const getInitials = (email?: string, userId?: string) => {
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return userId?.slice(0, 2).toUpperCase() || '??'
}

export default function WorkspaceMembers() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State for invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('member')
  const [shareInviteLink, setShareInviteLink] = useState<string>('')
  const [shareInviteExpiresAt, setShareInviteExpiresAt] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<WorkspaceMember | null>(null)

  // Fetch workspace detail
  const workspaceQuery = useQuery<WorkspaceDetail | undefined>({
    queryKey: ['workspace-detail', workspaceId],
    queryFn: () => workspaceId ? workspaceService.getWorkspaceDetail(workspaceId) : Promise.resolve(undefined),
    enabled: !!workspaceId,
  })

  // Fetch workspace members
  const membersQuery = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceId ? workspaceService.listMembers(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
  })

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRole }) => 
      workspaceService.inviteMember(workspaceId!, email, role, true),
    onSuccess: (data: WorkspaceInviteResponse) => {
      if (data.email_sent === false && data.invite_link) {
        notify.error('Email could not be sent. Invite link copied to clipboard.')
        try {
          navigator.clipboard.writeText(data.invite_link)
        } catch { /* ignore */ }
      } else {
        notify.success('Invitation sent successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
      setInviteEmail('')
      setInviteRole('member')
      setIsInviteDialogOpen(false)
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to send invitation')
    }
  })

  // Shareable invite link mutation
  const inviteLinkMutation = useMutation({
    mutationFn: ({ role }: { role: MemberRole }) => workspaceService.createInviteLink(workspaceId!, role, 7),
    onSuccess: (data: WorkspaceInviteLinkResponse) => {
      setShareInviteLink(data.invite_link)
      setShareInviteExpiresAt(data.expires_at)
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to generate invite link')
    }
  })

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) =>
      workspaceService.updateMemberRole(workspaceId!, memberId, role),
    onSuccess: () => {
      notify.success('Member role updated')
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to update role')
    }
  })

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: (memberId: string) => workspaceService.removeMember(workspaceId!, memberId),
    onSuccess: () => {
      notify.success('Member removed from workspace')
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['workspace-detail', workspaceId] })
      setConfirmRemoveMember(null)
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to remove member')
    }
  })

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      notify.error('Email is required')
      return
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole })
  }

  const handleUpdateRole = (member: WorkspaceMember, newRole: MemberRole) => {
    updateRoleMutation.mutate({ memberId: member.id, role: newRole })
  }

  const handleRemoveMember = (member: WorkspaceMember) => {
    removeMutation.mutate(member.id)
  }

  const copyInviteLink = async () => {
    try {
      let linkToCopy = shareInviteLink
      if (!linkToCopy) {
        const created = await workspaceService.createInviteLink(workspaceId!, 'viewer', 7)
        linkToCopy = created.invite_link
        setShareInviteLink(created.invite_link)
        setShareInviteExpiresAt(created.expires_at)
      }
      await navigator.clipboard.writeText(linkToCopy)
      notify.success('Invite link copied to clipboard')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to copy invite link'
      notify.error(msg)
    }
  }

  // Filter members based on search
  const filteredMembers = (membersQuery.data || []).filter(member => {
    if (!searchQuery) return true
    const email = member.invited_email?.toLowerCase() || ''
    const userId = member.user_id?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return email.includes(query) || userId.includes(query)
  })

  const activeMembers = filteredMembers.filter(m => m.status === 'active')
  const pendingMembers = filteredMembers.filter(m => m.status === 'invited')

  const workspace = workspaceQuery.data
  const currentUserRole = workspace?.member_role
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

  if (!workspaceId) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-slate-500">No workspace selected</p>
          <Button className="mt-4" onClick={() => navigate('/dashboard/workspaces')}>
            Go to Workspaces
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 self-start"
            onClick={() => navigate('/dashboard/workspaces')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-semibold">
                {workspace?.name?.charAt(0).toUpperCase() || 'W'}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Members</h1>
                <p className="text-slate-500 mt-0.5">
                  Manage members of <span className="font-medium text-slate-700">{workspace?.name || 'this workspace'}</span>
                </p>
              </div>
            </div>
          </div>
          {canManageMembers && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add someone to this workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInvite()
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-slate-400" />
                            <span>Viewer - Can view content</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-500" />
                            <span>Member - Can edit content</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-500" />
                            <span>Admin - Can manage members</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending || !inviteEmail.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {inviteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{membersQuery.data?.length || 0}</p>
                  <p className="text-xs text-slate-500">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{activeMembers.length}</p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{pendingMembers.length}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {(membersQuery.data || []).filter(m => m.role === 'owner').length}
                  </p>
                  <p className="text-xs text-slate-500">Owners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Methods */}
        {canManageMembers && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email Invite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-slate-200 shadow-sm h-full">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Email Invitation</CardTitle>
                      <CardDescription className="text-sm">
                        Invite someone via email address
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-email" className="text-sm">Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="quick-email"
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending || !inviteEmail.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Invite
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Share Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-slate-200 shadow-sm h-full">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Link className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Share Invite Link</CardTitle>
                      <CardDescription className="text-sm">
                        Share a link for quick access
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Invite Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareInviteLink || 'Click “Generate” to create a secure invite link'}
                        readOnly
                        className="bg-slate-50 text-slate-600 font-mono text-sm flex-1"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={copyInviteLink} disabled={inviteLinkMutation.isPending}>
                            {inviteLinkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy link</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => inviteLinkMutation.mutate({ role: 'viewer' })}
                      disabled={inviteLinkMutation.isPending}
                      className="w-full"
                    >
                      {inviteLinkMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Generate New Link
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <span className="font-medium">Note:</span> This link is token-based and expires{shareInviteExpiresAt ? ` on ${new Date(shareInviteExpiresAt).toLocaleDateString()}` : ''}. Anyone with the link (and an account) can join.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Members List */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  Workspace Members
                </CardTitle>
                <CardDescription>
                  {membersQuery.data?.length || 0} members in this workspace
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {membersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : membersQuery.error ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm text-red-600 mb-4">Failed to load members</p>
                <Button variant="outline" onClick={() => membersQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No members match your search' : 'No members yet'}
                </p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <div className="px-4 pt-4 border-b">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="all" className="text-sm">
                      All ({filteredMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-sm">
                      Active ({activeMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-sm">
                      Pending ({pendingMembers.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="mt-0">
                  <MembersList 
                    members={filteredMembers} 
                    canManage={canManageMembers}
                    currentUserRole={currentUserRole}
                    onUpdateRole={handleUpdateRole}
                    onRemove={setConfirmRemoveMember}
                    isUpdating={updateRoleMutation.isPending}
                  />
                </TabsContent>
                <TabsContent value="active" className="mt-0">
                  <MembersList 
                    members={activeMembers} 
                    canManage={canManageMembers}
                    currentUserRole={currentUserRole}
                    onUpdateRole={handleUpdateRole}
                    onRemove={setConfirmRemoveMember}
                    isUpdating={updateRoleMutation.isPending}
                  />
                </TabsContent>
                <TabsContent value="pending" className="mt-0">
                  <MembersList 
                    members={pendingMembers} 
                    canManage={canManageMembers}
                    currentUserRole={currentUserRole}
                    onUpdateRole={handleUpdateRole}
                    onRemove={setConfirmRemoveMember}
                    isUpdating={updateRoleMutation.isPending}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Role Permissions</CardTitle>
              <CardDescription>
                Understand what each role can do in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-700">Viewer</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      View content
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Access dashboards
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-700">Member</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-blue-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      All Viewer permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Create & edit content
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Manage projects
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-700">Admin</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-purple-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      All Member permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Manage members
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Configure settings
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-amber-200 rounded-xl bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-700">Owner</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-amber-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      All Admin permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Transfer ownership
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Delete workspace
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Remove Member Confirmation Dialog */}
        <Dialog open={!!confirmRemoveMember} onOpenChange={(open) => !open && setConfirmRemoveMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this member from the workspace? They will lose access to all workspace content.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {confirmRemoveMember && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-slate-500 to-slate-600 text-white">
                      {getInitials(confirmRemoveMember.invited_email, confirmRemoveMember.user_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">
                      {confirmRemoveMember.invited_email || confirmRemoveMember.user_id}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{confirmRemoveMember.role}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemoveMember(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => confirmRemoveMember && handleRemoveMember(confirmRemoveMember)}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

// Members list component
interface MembersListProps {
  members: WorkspaceMember[]
  canManage: boolean
  currentUserRole?: string
  onUpdateRole: (member: WorkspaceMember, role: MemberRole) => void
  onRemove: (member: WorkspaceMember) => void
  isUpdating: boolean
}

function MembersList({ members, canManage, currentUserRole, onUpdateRole, onRemove, isUpdating }: MembersListProps) {
  if (members.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">No members found</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {members.map((member, index) => {
        const isOwner = member.role === 'owner'
        const canModify = canManage && !isOwner // Can't modify owners unless you're an owner
        
        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                  {getInitials(member.invited_email, member.user_id)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {member.invited_email || member.user_id || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-xs px-2 py-0 h-5 gap-1 ${getRoleBadgeStyle(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </Badge>
                  <Badge variant="outline" className={`text-xs px-2 py-0 h-5 gap-1 ${getStatusBadgeStyle(member.status)}`}>
                    {getStatusIcon(member.status)}
                    {member.status}
                  </Badge>
                </div>
              </div>
            </div>

            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onUpdateRole(member, 'viewer')}>
                    <Eye className="w-4 h-4 mr-2 text-slate-400" />
                    Set as Viewer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateRole(member, 'member')}>
                    <UserCheck className="w-4 h-4 mr-2 text-blue-500" />
                    Set as Member
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateRole(member, 'admin')}>
                    <Shield className="w-4 h-4 mr-2 text-purple-500" />
                    Set as Admin
                  </DropdownMenuItem>
                  {currentUserRole === 'owner' && (
                    <DropdownMenuItem onClick={() => onUpdateRole(member, 'owner')}>
                      <Crown className="w-4 h-4 mr-2 text-amber-500" />
                      Transfer Ownership
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onRemove(member)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
