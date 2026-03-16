import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ChevronsUpDown, Plus, RefreshCcw, FolderPlus, Bug, Bell, Sparkles, CalendarRange, UserPlus, Layers, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/lib/api/projectService'
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, loading, refresh } = useWorkspace()
  const navigate = useNavigate()
  const [rotating, setRotating] = useState(false)
  const active = workspaces.find(w => w.id === activeWorkspaceId)

  const handleRefresh = async () => {
    setRotating(true)
    try { await refresh() } finally { setTimeout(()=> setRotating(false), 600) }
  }

  if (!workspaces.length && !loading) {
    return (
      <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/workspaces')} className="h-8 text-xs gap-1.5 border-dashed">
        <Plus className="w-3.5 h-3.5" /> New workspace
      </Button>
    )
  }

  const quotaFor = (plan?: string | null) => {
    switch ((plan || '').toLowerCase()) {
      case 'pro': return 20
      case 'enterprise': return 999
      default: return 5
    }
  }
  const totalWorkspaces = workspaces.length
  const quota = quotaFor(active?.plan)
  const usagePct = Math.min(100, Math.round((totalWorkspaces / quota) * 100))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 text-sm px-3 gap-2 max-w-[200px] justify-start hover:bg-slate-100 group"
        >
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{active?.name?.substring(0, 2).toUpperCase() || 'WS'}</span>
          </div>
          <span className="truncate flex-1 text-left font-medium text-slate-700 group-hover:text-slate-900">{active ? active.name : (loading ? 'Loading…' : 'Select')}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2">
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500">Workspaces</div>
        {workspaces.map(w => (
          <DropdownMenuItem 
            key={w.id} 
            onClick={() => setActiveWorkspace(w.id)} 
            className={cn(
              "rounded-lg px-2 py-2.5 cursor-pointer",
              w.id === activeWorkspaceId && "bg-blue-50"
            )}
          >
            <div className="flex items-center gap-2.5 w-full">
              <div className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0",
                w.id === activeWorkspaceId 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                  : "bg-slate-200"
              )}>
                <span className={cn(
                  "text-[10px] font-bold",
                  w.id === activeWorkspaceId ? "text-white" : "text-slate-600"
                )}>
                  {w.name?.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{w.name}</span>
                  {w.plan && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-semibold",
                      w.plan.toLowerCase() === 'pro' 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {w.plan}
                    </span>
                  )}
                </div>
                {w.id === activeWorkspaceId && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        usagePct > 85 ? 'bg-red-500' : usagePct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                      )} 
                      style={{ width: `${usagePct}%` }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem onClick={() => navigate('/dashboard/workspaces')} className="rounded-lg gap-2 py-2 cursor-pointer">
          <Plus className="w-4 h-4 text-slate-500" /> 
          <span>Manage Workspaces</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefresh} className="rounded-lg gap-2 py-2 cursor-pointer">
          <RefreshCcw className={cn("w-4 h-4 text-slate-500", rotating && 'animate-spin')} /> 
          <span>Refresh</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  const navigate = useNavigate()
  const [notificationCount] = useState(3) // TODO: Connect to real notification system
  const [refreshing, setRefreshing] = useState(false)
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
  const [createIssueType, setCreateIssueType] = useState('task')

  const projectsQuery = useQuery({
    queryKey: ['header-projects'],
    queryFn: () => projectService.listProjects({ status: 'active' }),
    staleTime: 30000,
  })

  const handleRefresh = () => {
    setRefreshing(true)
    // Reload the current page
    window.location.reload()
  }
  
  return (
    <TooltipProvider delayDuration={0}>
    <CreateIssueDialog
      open={createIssueOpen}
      onOpenChange={setCreateIssueOpen}
      projects={projectsQuery.data || []}
      defaultType={createIssueType}
    />
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-slate-200/80 bg-white/95 backdrop-blur-sm font-space">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        {/* Workspace Switcher */}
        <WorkspaceSwitcher />
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {/* Quick Create Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                className="h-9 gap-2 px-3 sm:px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                onClick={() => {
                  setCreateIssueType('task')
                  setCreateIssueOpen(true)
                }}
                className="rounded-lg gap-3 py-2.5 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Bug className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Create Issue</span>
                  <span className="text-xs text-slate-500">Track bugs and tasks</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCreateIssueType('epic')
                  setCreateIssueOpen(true)
                }}
                className="rounded-lg gap-3 py-2.5 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Create Epic</span>
                  <span className="text-xs text-slate-500">Large feature or initiative</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => navigate('/dashboard/projects')} className="rounded-lg gap-3 py-2.5 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FolderPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Create Project</span>
                  <span className="text-xs text-slate-500">Start a new project</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/sprints')} className="rounded-lg gap-3 py-2.5 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <CalendarRange className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Create Sprint</span>
                  <span className="text-xs text-slate-500">Plan an iteration</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => navigate('/dashboard/agents/epic-decomposer')} className="rounded-lg gap-3 py-2.5 cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Epic Architect</span>
                  <span className="text-xs text-slate-500">Decompose epics with AI</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/agents/prd-generator')} className="rounded-lg gap-3 py-2.5 cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">PRD Generator</span>
                  <span className="text-xs text-slate-500">Generate PRD with AI</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Page Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && 'animate-spin')} />
                <span className="sr-only">Refresh</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Refresh page
            </TooltipContent>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-xl relative text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
                onClick={() => navigate('/dashboard/notifications')}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {notificationCount > 0 ? `${notificationCount} notifications` : 'Notifications'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
    </TooltipProvider>
  )
}
