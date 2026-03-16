import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  type DragEndEvent,
} from '@/components/ui/kibo-ui/kanban'
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject, useProjectIssues } from '@/contexts/ProjectHooks'
import { projectService, type SprintDTO } from '@/lib/api/projectService'
import { issuesService, type IssueDTO } from '@/lib/api/issuesService'
import { calculateSprintMetrics, mapIssuesToBoardItems, type SprintBoardItem } from '@/lib/board/projectSprint'
import { ISSUE_STATUSES, type IssueStatus } from '@/constants/issueStatus'
import { IssueBoardCard, type IssueBoardCardBadge } from '@/components/issues/IssueBoardCard'
import { IssueDetailSheet } from '@/components/IssueDetailSheet'
import { toast } from 'sonner'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FlagTriangleRight,
  Layers,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusLabel: Record<IssueStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const sprintColumns = ISSUE_STATUSES.map((status) => ({
  id: status,
  name: statusLabel[status],
}))

const sprintStateLabel: Record<SprintDTO['state'], string> = {
  future: 'Planned',
  active: 'Active',
  closed: 'Completed',
}

const sprintStateVariant: Record<SprintDTO['state'], 'default' | 'secondary' | 'outline'> = {
  future: 'secondary',
  active: 'default',
  closed: 'outline',
}

const formatDateSegment = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'MMM d')
}

const parseDateValue = (value?: string | null) => {
  if (!value) return undefined
  const parts = value.split('-')
  if (parts.length !== 3) return undefined
  const [year, month, day] = parts.map((segment) => Number(segment))
  if ([year, month, day].some((part) => Number.isNaN(part))) return undefined
  return new Date(year, month - 1, day)
}

const sprintDateSummary = (sprint?: SprintDTO) => {
  if (!sprint) return 'No sprint selected'
  const start = formatDateSegment(sprint.start_date)
  const end = formatDateSegment(sprint.end_date)
  if (start && end) return `${start} → ${end}`
  if (start) return `Starts ${start}`
  if (end) return `Ends ${end}`
  return 'No dates scheduled'
}

const MetricCard: React.FC<{
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
}> = ({ title, value, description, icon }) => (
  <Card className="border-slate-200">
    <CardHeader className="pb-2 flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </CardContent>
  </Card>
)

type SprintAction = 'start' | 'complete' | null
type ProjectIssue = IssueDTO & { sprint_id?: string | null }

export default function ProjectBoardPage() {
  const { projectId: routeProjectId } = useParams()
  const queryClient = useQueryClient()
  const { project, projectId, loading: projectLoading } = useProject()
  const { issues, loading: issuesLoading } = useProjectIssues()

  const typedIssues = useMemo(() => (Array.isArray(issues) ? (issues as ProjectIssue[]) : []), [issues])
  const issuesLookup = useMemo(() => {
    const map = new Map<string, ProjectIssue>()
    typedIssues.forEach((issue) => map.set(issue.id, issue))
    return map
  }, [typedIssues])

  const [activeSprintId, setActiveSprintId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [sprintAction, setSprintAction] = useState<SprintAction>(null)
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null)
  const [completingSprintId, setCompletingSprintId] = useState<string | null>(null)
  const [assigningIssueId, setAssigningIssueId] = useState<string | null>(null)
  const [openIssueId, setOpenIssueId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
  })
  const startDateObj = useMemo(() => parseDateValue(createForm.startDate), [createForm.startDate])
  const endDateObj = useMemo(() => parseDateValue(createForm.endDate), [createForm.endDate])

  useEffect(() => {
    if (startDateObj && endDateObj && endDateObj < startDateObj) {
      setCreateForm((prev) => ({ ...prev, endDate: '' }))
    }
  }, [startDateObj, endDateObj])

  const sprintsQuery = useQuery({
    queryKey: ['project-sprints', projectId],
    enabled: Boolean(projectId),
    queryFn: () => projectService.listSprints(projectId!),
  })

  const sprints = useMemo(() => sprintsQuery.data ?? [], [sprintsQuery.data])
  const hasSprints = sprints.length > 0
  const currentSprint = useMemo(() => sprints.find((s) => s.id === activeSprintId), [sprints, activeSprintId])

  useEffect(() => {
    if (!hasSprints) {
      setActiveSprintId(null)
      return
    }
    if (activeSprintId && sprints.some((sprint) => sprint.id === activeSprintId)) {
      return
    }
    const candidate =
      sprints.find((s) => s.state === 'active') ||
      sprints.find((s) => s.state === 'future') ||
      sprints[0]
    setActiveSprintId(candidate?.id ?? null)
  }, [hasSprints, sprints, activeSprintId])

  const sprintIssues = useMemo(
    () => {
      // For Kanban projects, show all issues on the board
      if (project?.type === 'kanban') {
        return typedIssues
      }
      // For Scrum projects, show only issues assigned to the active sprint
      return activeSprintId
        ? typedIssues.filter((issue) => issue.sprint_id === activeSprintId)
        : []
    },
    [typedIssues, activeSprintId, project?.type]
  )

  const sprintBoardItems = useMemo(() => mapIssuesToBoardItems(sprintIssues), [sprintIssues])
  const sprintMetrics = useMemo(() => calculateSprintMetrics(sprintIssues), [sprintIssues])

  const [kanbanData, setKanbanData] = useState<SprintBoardItem[]>([])
  const dataRef = useRef<SprintBoardItem[]>([])

  useEffect(() => {
    setKanbanData(sprintBoardItems)
    dataRef.current = sprintBoardItems
  }, [sprintBoardItems])

  const handleKanbanChange = useCallback((next: SprintBoardItem[]) => {
    setKanbanData(next)
    dataRef.current = next
  }, [])

  const refreshQueries = useCallback(() => {
    if (!projectId) return
    queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] })
  }, [projectId, queryClient])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!projectId) return
      const moved = dataRef.current.find((item) => item.id === event.active.id)
      if (!moved) return
      const currentIssue = issuesLookup.get(moved.id)
      if (!currentIssue) return
      const newStatus = moved.column
      try {
        if (currentIssue.status !== newStatus) {
          await issuesService.update(projectId, moved.id, { status: newStatus })
          toast.success('Issue status updated')
        } else {
          const orderedIds = dataRef.current
            .filter((item) => item.column === newStatus)
            .map((item) => item.id)
          if (orderedIds.length > 1) {
            await issuesService.reorderBoard(projectId, newStatus, orderedIds)
          }
        }
      } catch (error) {
        toast.error('Unable to persist drag operation')
      } finally {
        refreshQueries()
      }
    },
    [projectId, issuesLookup, refreshQueries]
  )

  const handleAssignToSprint = useCallback(
    async (issueId: string, sprintId: string | null) => {
      if (!projectId) return
      setAssigningIssueId(issueId)
      try {
        await issuesService.update(projectId, issueId, { sprint_id: sprintId })
        toast.success(sprintId ? 'Issue added to sprint' : 'Issue moved to backlog')
      } catch (error) {
        toast.error('Failed to update sprint assignment')
      } finally {
        setAssigningIssueId(null)
        refreshQueries()
      }
    },
    [projectId, refreshQueries]
  )

  const handleCreateSprint = async () => {
    if (!projectId || !createForm.name.trim()) {
      toast.error('Sprint name is required')
      return
    }
    setCreateLoading(true)
    try {
      await projectService.createSprint(projectId, {
        name: createForm.name.trim(),
        goal: createForm.goal.trim() || undefined,
        startDate: createForm.startDate || undefined,
        endDate: createForm.endDate || undefined,
      })
      toast.success('Sprint created')
      setCreateForm({ name: '', goal: '', startDate: '', endDate: '' })
      setCreateDialogOpen(false)
      refreshQueries()
    } catch (error) {
      toast.error('Unable to create sprint')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSprintLifecycle = async (action: Exclude<SprintAction, null>) => {
    if (!projectId || !activeSprintId) return
    setSprintAction(action)
    
    if (action === 'start') {
      setStartingSprintId(activeSprintId)
    } else if (action === 'complete') {
      setCompletingSprintId(activeSprintId)
    }
    
    try {
      if (action === 'start') {
        await projectService.startSprint(projectId, activeSprintId)
        toast.success('Sprint started')
      } else if (action === 'complete') {
        await projectService.completeSprint(projectId, activeSprintId)
        toast.success('Sprint completed')
      }
      refreshQueries()
    } catch (error) {
      toast.error(`Failed to ${action} sprint`)
    } finally {
      setSprintAction(null)
      setStartingSprintId(null)
      setCompletingSprintId(null)
    }
  }

  const renderSprintMoveMenu = (issue: ProjectIssue, variant: 'default' | 'ghost' = 'default') => {
    if (project?.type !== 'scrum') return null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant={variant}
            className="h-6 px-2 text-xs gap-1"
            disabled={assigningIssueId === issue.id}
          >
            {assigningIssueId === issue.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowLeftRight className="h-3 w-3" />
            )}
            Move
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">Assign to sprint</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {issue.sprint_id && (
            <>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleAssignToSprint(issue.id, null)
                }}
                disabled={assigningIssueId === issue.id}
              >
                Move to backlog
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {sprints.filter((sprint) => sprint.state !== 'closed').map((sprint) => (
            <DropdownMenuItem
              key={sprint.id}
              onSelect={(event) => {
                event.preventDefault()
                handleAssignToSprint(issue.id, sprint.id)
              }}
              disabled={assigningIssueId === issue.id || issue.sprint_id === sprint.id}
            >
              {sprint.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const buildIssueFooterBadges = (issue: ProjectIssue): IssueBoardCardBadge[] => {
    const badges: IssueBoardCardBadge[] = []
    const priorityLabel = issue.priority
      ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)
      : undefined
    const statusDisplay = issue.status ? statusLabel[issue.status as IssueStatus] : undefined

    if (priorityLabel) {
      badges.push({ label: priorityLabel, variant: 'secondary', className: 'lowercase' })
    }

    if (statusDisplay) {
      badges.push({ label: statusDisplay, variant: 'outline' })
    }

    return badges
  }

  const metricsCards = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Issues"
        value={sprintMetrics.total}
        description={project?.type === 'kanban' ? 'All issues' : 'Issues in this sprint'}
        icon={<Layers className="h-4 w-4 text-slate-500" />}
      />
      <MetricCard
        title="To Do"
        value={sprintMetrics.statusCounts.todo}
        description="Not started"
        icon={<FlagTriangleRight className="h-4 w-4 text-slate-500" />}
      />
      <MetricCard
        title="In Progress"
        value={sprintMetrics.statusCounts.in_progress}
        description="Currently working"
        icon={<CalendarClock className="h-4 w-4 text-slate-500" />}
      />
      <MetricCard
        title="Done"
        value={sprintMetrics.statusCounts.done}
        description="Completed"
        icon={<CheckCircle2 className="h-4 w-4 text-slate-500" />}
      />
    </div>
  )

  return (
    <ProjectTabLayout>
      <div className="p-4 sm:p-6 max-w-full mx-auto font-space space-y-6">
        <PageHeader
          title={project?.name ? `${project.name} Board` : 'Project Board'}
          description={
            project?.type === 'kanban'
              ? 'Visualize continuous flow and manage your work.'
              : 'Sprint-based workflow - plan, track, and deliver iteratively.'
          }
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Projects', href: '/dashboard/projects' },
            { label: project?.name || project?.key || routeProjectId || '...' },
            { label: 'Board' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              {projectId && (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/dashboard/projects/${projectId}`}>Hub</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/dashboard/projects/${projectId}/backlog`}>Backlog</Link>
                  </Button>
                </>
              )}
            </div>
          }
        />

        {projectLoading && !project ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            {/* Kanban Info Alert */}
            {project?.type === 'kanban' && (
              <Alert className="border-blue-200 bg-blue-50/50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Kanban Workflow</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This project uses continuous flow. All issues appear on the board - use the Backlog page to manage new work.
                </AlertDescription>
              </Alert>
            )}

            {/* Sprint Management Header (Scrum only) */}
            {project?.type === 'scrum' && (
              <div className="grid gap-4 lg:grid-cols-[1fr,350px,350px]">
                {/* Sprint Selector & Actions */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700">Active Sprint:</label>
                        <Select
                          value={activeSprintId ?? '__none__'}
                          onValueChange={(value) => setActiveSprintId(value === '__none__' ? null : value)}
                          disabled={!hasSprints}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a sprint" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Choose sprint…</SelectItem>
                            {sprints.map((sprint) => (
                              <SelectItem key={sprint.id} value={sprint.id}>
                                <div className="flex items-center gap-2">
                                  <Badge variant={sprintStateVariant[sprint.state]} className="text-xs">
                                    {sprintStateLabel[sprint.state]}
                                  </Badge>
                                  {sprint.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          New Sprint
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 flex-1"
                          onClick={refreshQueries}
                          disabled={sprintsQuery.isLoading || issuesLoading}
                        >
                          <RefreshCw
                            className={cn('h-4 w-4', (sprintsQuery.isFetching || issuesLoading) && 'animate-spin')}
                          />
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sprint Details */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Sprint Details</CardTitle>
                    <CardDescription className="text-xs">
                      {currentSprint ? sprintDateSummary(currentSprint) : 'No sprint selected'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {currentSprint ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium text-xs">Status</span>
                          <Badge variant={sprintStateVariant[currentSprint.state]} className="text-xs">
                            {sprintStateLabel[currentSprint.state]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 rounded p-2">
                            <div className="text-xl font-bold text-slate-700">{sprintMetrics.statusCounts.todo}</div>
                            <div className="text-[10px] text-slate-500 uppercase">To Do</div>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <div className="text-xl font-bold text-blue-700">{sprintMetrics.statusCounts.in_progress}</div>
                            <div className="text-[10px] text-blue-600 uppercase">Active</div>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <div className="text-xl font-bold text-green-700">{sprintMetrics.statusCounts.done}</div>
                            <div className="text-[10px] text-green-600 uppercase">Done</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500 text-center py-4">
                        Select a sprint to view details
                      </div>
                    )}
                  </CardContent>
                  {currentSprint && currentSprint.state !== 'closed' && (
                    <CardFooter className="pt-0 pb-3 px-6 gap-2">
                      {currentSprint.state === 'future' && (
                        <Button
                          size="sm"
                          className="w-full gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleSprintLifecycle('start')}
                          disabled={startingSprintId === currentSprint.id}
                        >
                          {startingSprintId === currentSprint.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <FlagTriangleRight className="h-3 w-3" />
                          )}
                          Start Sprint
                        </Button>
                      )}
                      {currentSprint.state === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1"
                          onClick={() => handleSprintLifecycle('complete')}
                          disabled={completingSprintId === currentSprint.id}
                        >
                          {completingSprintId === currentSprint.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Complete Sprint
                        </Button>
                      )}
                    </CardFooter>
                  )}
                </Card>

                {/* All Sprints */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">All Sprints</CardTitle>
                    <CardDescription className="text-xs">Switch between sprints</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[180px] overflow-y-auto">
                    {sprints.length === 0 ? (
                      <div className="text-sm text-slate-500 text-center py-4">
                        No sprints yet
                      </div>
                    ) : (
                      sprints.map((sprint) => (
                        <button
                          key={sprint.id}
                          onClick={() => setActiveSprintId(sprint.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg border transition-all text-sm',
                            activeSprintId === sprint.id
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">{sprint.name}</div>
                              <div className="text-xs text-slate-500">
                                {sprint.start_date && sprint.end_date
                                  ? `${formatDateSegment(sprint.start_date)} → ${formatDateSegment(sprint.end_date)}`
                                  : 'No dates set'}
                              </div>
                            </div>
                            <Badge variant={sprintStateVariant[sprint.state]} className="text-xs shrink-0">
                              {sprintStateLabel[sprint.state]}
                            </Badge>
                          </div>
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {/* Main Board Area */}
              <div className="space-y-4">

                {/* Board Content */}
                {project?.type === 'scrum' && !hasSprints ? (
                  /* No sprints created yet */
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Create Your First Sprint</h3>
                    <p className="text-sm text-slate-600 mb-6 max-w-md">
                      Sprints help you organize work into time-boxed iterations. Create your first sprint to get started.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-5 w-5" />
                      Create Sprint
                    </Button>
                  </div>
                ) : project?.type === 'scrum' && !activeSprintId ? (
                  /* Sprint exists but none selected */
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                      <BarChart3 className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a Sprint</h3>
                    <p className="text-sm text-slate-600 max-w-md">
                      Choose a sprint from the dropdown above to view and manage its board.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Loading State */}
                    {(issuesLoading || sprintsQuery.isLoading) && (
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-96 w-full" />
                      </div>
                    )}

                    {/* Empty Sprint State */}
                    {!issuesLoading && !sprintIssues.length && (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                          {project?.type === 'kanban' ? 'Board Ready' : 'Sprint Ready'}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4 max-w-md">
                          {project?.type === 'kanban'
                            ? 'Create issues in the Backlog page to see them on this board.'
                            : `Add issues to "${currentSprint?.name}" from the Backlog page to start planning.`}
                        </p>
                        {projectId && (
                          <Button variant="outline" asChild>
                            <Link to={`/dashboard/projects/${projectId}/backlog`}>Go to Backlog</Link>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Kanban Board */}
                    {sprintIssues.length > 0 && (
                      <KanbanProvider
                        columns={sprintColumns}
                        data={kanbanData}
                        onDataChange={handleKanbanChange}
                        onDragEnd={handleDragEnd}
                        columnMinWidth={280}
                        className="min-h-[500px]"
                      >
                        {(column) => {
                          const columnItems = kanbanData.filter((item) => item.column === column.id)
                          return (
                            <KanbanBoard
                              key={column.id}
                              id={column.id}
                              className="bg-slate-50/50 rounded-lg border-2 border-slate-200"
                            >
                              <KanbanHeader className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 bg-white">
                                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                  {column.name}
                                </span>
                                <Badge variant="secondary" className="text-xs font-semibold">
                                  {columnItems.length}
                                </Badge>
                              </KanbanHeader>
                              <KanbanCards id={column.id} className="min-h-[400px] p-3">
                                {(item) => {
                                  const issue = issuesLookup.get(item.id)
                                  if (!issue) return null
                                  const footerBadges = buildIssueFooterBadges(issue)
                                  return (
                                    <KanbanCard
                                      key={item.id}
                                      id={item.id}
                                      name={item.name}
                                      column={item.column}
                                      className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-blue-300 transition-all mb-3 rounded-lg"
                                    >
                                      <IssueBoardCard
                                        title={issue.title || 'Untitled issue'}
                                        issueKey={issue.issue_key}
                                        typeLabel={issue.type}
                                        footerBadges={footerBadges}
                                        headerAccessory={renderSprintMoveMenu(issue, 'ghost')}
                                        onTitleClick={() => setOpenIssueId(issue.id)}
                                        projectName={project?.name}
                                        className="border-none bg-transparent px-0 py-0 shadow-none hover:border-transparent hover:shadow-none"
                                      />
                                    </KanbanCard>
                                  )
                                }}
                              </KanbanCards>
                            </KanbanBoard>
                          )
                        }}
                      </KanbanProvider>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Create Sprint Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Sprint</DialogTitle>
                  <DialogDescription>Define your sprint details and timeline</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="sprint-name">
                      Sprint Name *
                    </label>
                    <Input
                      id="sprint-name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Sprint 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="sprint-goal">
                      Sprint Goal (optional)
                    </label>
                    <Textarea
                      id="sprint-goal"
                      value={createForm.goal}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, goal: e.target.value }))}
                      placeholder="What does this sprint aim to achieve?"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Start Date</label>
                      <Input
                        type="date"
                        value={createForm.startDate}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">End Date</label>
                      <Input
                        type="date"
                        value={createForm.endDate}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        min={createForm.startDate || undefined}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSprint} disabled={createLoading || !createForm.name.trim()}>
                    {createLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Sprint'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Issue Detail Sheet */}
            <IssueDetailSheet
              issueId={openIssueId}
              onClose={() => setOpenIssueId(null)}
              onUpdated={refreshQueries}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
            />
          </>
        )}
      </div>
    </ProjectTabLayout>
  )
}
