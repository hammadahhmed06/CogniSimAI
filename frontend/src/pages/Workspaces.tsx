import { useState, Fragment, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService, type Workspace, type WorkspaceDetail } from '@/lib/api/workspaceService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ActivityFeed } from '@/components/ActivityFeed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Building2, Users, Settings2, LogOut, Trash2, Loader2, Crown, Shield, UserCheck, ChevronRight, Briefcase, Globe, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { notify } from '../lib/notify'
import { motion } from 'framer-motion'

export default function Workspaces() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

  // Query workspaces (duplicate fetch for now; context also loads them but we want reactivity & role data)
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.listWorkspaces,
  })
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspace()

  // Detail query (enabled when a workspace is selected)
  const detailQuery = useQuery<WorkspaceDetail | undefined>({
    queryKey: ['workspace-detail', selectedWorkspaceId],
    queryFn: () => selectedWorkspaceId ? workspaceService.getWorkspaceDetail(selectedWorkspaceId) : Promise.resolve(undefined),
    enabled: !!selectedWorkspaceId && detailOpen,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string, name: string, description?: string }) => workspaceService.updateWorkspace(payload.id, { name: payload.name, description: payload.description }),
    onSuccess: () => {
  notify.success('Workspace updated')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      if (selectedWorkspaceId) queryClient.invalidateQueries({ queryKey: ['workspace-detail', selectedWorkspaceId] })
    },
  onError: (e: Error) => notify.error(e.message || 'Update failed')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workspaceService.deleteWorkspace(id),
    onSuccess: () => {
  notify.success('Workspace deleted')
      setDetailOpen(false)
      setSelectedWorkspaceId(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      if (activeWorkspaceId === selectedWorkspaceId) setActiveWorkspace(null)
    },
  onError: (e: Error) => notify.error(e.message || 'Delete failed')
  })

  const leaveMutation = useMutation({
    mutationFn: (id: string) => workspaceService.leaveWorkspace(id),
    onSuccess: () => {
  notify.success('Left workspace')
      setDetailOpen(false)
      setSelectedWorkspaceId(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      if (activeWorkspaceId === selectedWorkspaceId) setActiveWorkspace(null)
    },
  onError: (e: Error) => notify.error(e.message || 'Leave failed')
  })

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setIsDialogOpen(false)
      setNewWorkspaceName('')
      setNewWorkspaceDesc('')
  notify.success('Workspace created successfully')
    },
    onError: (error) => {
  notify.error('Failed to create workspace')
      console.error('Create workspace error:', error)
    },
  })

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) {
  notify.error('Workspace name is required')
      return
    }
    createWorkspaceMutation.mutate({ name: newWorkspaceName.trim(), description: newWorkspaceDesc.trim() || undefined })
  }

  // Command palette event: open create workspace dialog
  useEffect(() => {
    const openHandler = () => setIsDialogOpen(true)
    window.addEventListener('open-create-workspace', openHandler as EventListener)
    return () => window.removeEventListener('open-create-workspace', openHandler as EventListener)
  }, [])

  const workspaces = workspacesQuery.data || []

  // Helper for role icons and badges
  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5 text-amber-500" />
      case 'admin': return <Shield className="w-3.5 h-3.5 text-purple-500" />
      default: return <UserCheck className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'editor': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const getPlanBadge = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case 'pro': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'enterprise': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  // (duplicate listener removed; consolidated above)

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Workspaces</h1>
            <p className="text-slate-500 mt-1">Manage your workspaces and organize your projects</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="w-4 h-4" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace to organize your projects and collaborate with your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="e.g., Marketing Team, Product Development"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateWorkspace()
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-desc">Description (optional)</Label>
                  <Textarea
                    id="workspace-desc"
                    placeholder="What's this workspace for?"
                    value={newWorkspaceDesc}
                    onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateWorkspace}
                    disabled={createWorkspaceMutation.isPending || !newWorkspaceName.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createWorkspaceMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Workspace'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{workspaces.length}</p>
                  <p className="text-xs text-slate-500">Total Workspaces</p>
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
                    {workspaces.filter((w: Workspace) => w.member_role === 'owner').length}
                  </p>
                  <p className="text-xs text-slate-500">Owned by You</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {activeWorkspaceId ? 1 : 0}
                  </p>
                  <p className="text-xs text-slate-500">Active Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {workspaces.filter((w: Workspace) => w.member_role !== 'owner').length}
                  </p>
                  <p className="text-xs text-slate-500">Shared with You</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspaces Grid */}
        {workspacesQuery.isLoading ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-4" />
              <p className="text-slate-500">Loading workspaces...</p>
            </CardContent>
          </Card>
        ) : workspacesQuery.error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-1">Failed to load workspaces</h3>
              <p className="text-red-600 text-center max-w-sm mb-4">
                There was an error loading your workspaces. Please try again.
              </p>
              <Button onClick={() => workspacesQuery.refetch()} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : workspaces.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No workspaces yet</h3>
              <p className="text-slate-500 text-center max-w-sm mb-4">
                Create your first workspace to organize your projects and start collaborating.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace: Workspace, index: number) => {
              const isActive = activeWorkspaceId === workspace.id
              return (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`group hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50/30' 
                        : 'hover:border-slate-300'
                    }`}
                    onClick={() => setActiveWorkspace(workspace.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold ${
                            isActive ? 'bg-blue-600' : 'bg-slate-700'
                          }`}>
                            {workspace.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {workspace.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-xs px-2 py-0 h-5 gap-1 ${getRoleBadgeVariant(workspace.member_role)}`}>
                                {getRoleIcon(workspace.member_role)}
                                {workspace.member_role || 'member'}
                              </Badge>
                              {workspace.plan && (
                                <Badge variant="outline" className={`text-xs px-2 py-0 h-5 ${getPlanBadge(workspace.plan)}`}>
                                  {workspace.plan}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {isActive && (
                          <Badge className="bg-blue-600 text-white text-xs shrink-0">Active</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {workspace.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {workspace.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Briefcase className="w-4 h-4" />
                          <span>{isActive ? 'Selected' : 'Click to select'}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/workspace/${workspace.id}/members`) }}
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Members</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                onClick={(e) => { 
                                  e.stopPropagation()
                                  setSelectedWorkspaceId(workspace.id)
                                  setDetailOpen(true)
                                  setEditName(workspace.name)
                                  setEditDesc(workspace.description || '')
                                  setConfirmDelete('')
                                }}
                              >
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Settings</TooltipContent>
                          </Tooltip>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Workspace Settings Sheet */}
        <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) { setSelectedWorkspaceId(null); } }}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="space-y-1">
              <SheetTitle className="text-xl">Workspace Settings</SheetTitle>
              <SheetDescription>Manage workspace details and membership</SheetDescription>
            </SheetHeader>
            
            {detailQuery.isLoading && (
              <div className="mt-8 flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-4" />
                <p className="text-sm text-slate-500">Loading workspace details...</p>
              </div>
            )}
            
            {detailQuery.data && (
              <div className="mt-8 space-y-8">
                {/* General Settings */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded">
                      <Building2 className="w-4 h-4 text-slate-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">General</h2>
                  </div>
                  <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Name</Label>
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        disabled={updateMutation.isPending}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Description</Label>
                      <Textarea 
                        value={editDesc} 
                        onChange={(e) => setEditDesc(e.target.value)} 
                        rows={3} 
                        disabled={updateMutation.isPending}
                        className="bg-white resize-none"
                        placeholder="What's this workspace for?"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => { 
                          if (!selectedWorkspaceId) return
                          updateMutation.mutate({ id: selectedWorkspaceId, name: editName.trim(), description: editDesc.trim() || undefined }) 
                        }} 
                        disabled={updateMutation.isPending || !editName.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} 
                        Save Changes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { 
                          if (detailQuery.data) { 
                            setEditName(detailQuery.data.name)
                            setEditDesc(detailQuery.data.description || '') 
                          } 
                        }} 
                        disabled={updateMutation.isPending}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Membership Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Membership</h2>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Total Members</span>
                      <Badge variant="secondary">{detailQuery.data.members_count}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { if (selectedWorkspaceId) navigate(`/dashboard/workspace/${selectedWorkspaceId}/members`) }}
                        className="gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Manage Members
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { if (selectedWorkspaceId) window.location.href = '/dashboard/integrations' }}
                        className="gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Integrations
                      </Button>
                      {activeWorkspaceId !== selectedWorkspaceId && (
                        <Button 
                          size="sm"
                          onClick={() => { 
                            if (selectedWorkspaceId) { 
                              setActiveWorkspace(selectedWorkspaceId)
                              notify.success('Workspace selected') 
                            } 
                          }}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4" />
                          Set Active
                        </Button>
                      )}
                      {detailQuery.data.member_role && detailQuery.data.member_role !== 'owner' && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => { if (selectedWorkspaceId) leaveMutation.mutate(selectedWorkspaceId) }} 
                          disabled={leaveMutation.isPending}
                          className="gap-2"
                        >
                          {leaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} 
                          Leave Workspace
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Danger Zone - Only for owners */}
                {detailQuery.data.member_role === 'owner' && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Danger Zone</h2>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200 space-y-3">
                      <p className="text-sm text-red-700">
                        Once you delete a workspace, there is no going back. This will remove access for all members.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-red-600">
                          Type "{detailQuery.data.name}" to confirm
                        </Label>
                        <Input 
                          value={confirmDelete} 
                          onChange={(e) => setConfirmDelete(e.target.value)} 
                          placeholder={detailQuery.data.name} 
                          disabled={deleteMutation.isPending}
                          className="bg-white border-red-200 focus:border-red-400"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        disabled={confirmDelete !== detailQuery.data.name || deleteMutation.isPending} 
                        onClick={() => { if (selectedWorkspaceId) deleteMutation.mutate(selectedWorkspaceId) }}
                        className="gap-2"
                      >
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                        Delete Workspace
                      </Button>
                    </div>
                  </section>
                )}

                {/* Error Display */}
                {(updateMutation.isError || deleteMutation.isError || leaveMutation.isError) && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                    {(updateMutation.error as Error)?.message || (deleteMutation.error as Error)?.message || (leaveMutation.error as Error)?.message}
                  </div>
                )}

                {/* Activity Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded">
                      <Briefcase className="w-4 h-4 text-slate-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</h2>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <ActivityFeed limit={10} className="text-sm" />
                  </div>
                </section>
              </div>
            )}
            
            {detailQuery.isError && (
              <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">Failed to load workspace details. Please try again.</p>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  )
}
