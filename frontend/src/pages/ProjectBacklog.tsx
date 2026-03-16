import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  GripVertical,
  Flag,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Target,
  Sparkles,
} from 'lucide-react'
import { issueService, IssueDTO } from '@/lib/api/issueService'
import { projectService, Sprint } from '@/lib/api/projectService'
import { IssueDetailSheet } from '@/components/IssueDetailSheet'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog'

const priorityConfig = {
  highest: { label: 'Highest', color: 'text-red-600', bg: 'bg-red-100', icon: Flag },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle },
  med: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Circle },
  low: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-100', icon: Circle },
  lowest: { label: 'Lowest', color: 'text-gray-600', bg: 'bg-gray-100', icon: Circle },
}

const typeConfig = {
  epic: { label: 'Epic', color: 'text-purple-700', bg: 'bg-purple-100', icon: Target },
  story: { label: 'Story', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  task: { label: 'Task', color: 'text-blue-700', bg: 'bg-blue-100', icon: Circle },
  bug: { label: 'Bug', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
}

export default function ProjectBacklog() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [moveToSprintDialogOpen, setMoveToSprintDialogOpen] = useState(false)
  const [selectedIssueForMove, setSelectedIssueForMove] = useState<IssueDTO | null>(null)
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  // Fetch project (for the create dialog project list)
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  })

  // Fetch backlog issues (issues without a sprint assigned)
  const { data: allIssues = [], isLoading } = useQuery<IssueDTO[]>({
    queryKey: ['backlog-issues', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const response = await issueService.listIssues({
        project_id: projectId,
        status: 'todo',
        limit: 100,
      })
      return response.items || []
    },
    enabled: !!projectId,
  })

  // Filter out issues that are already in a sprint
  const issues = allIssues.filter(issue => !issue.sprint_id)

  // Fetch available sprints
  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ['sprints', projectId],
    queryFn: () => projectService.listSprints(projectId!),
    enabled: !!projectId,
  })

  // Delete issue mutation
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      return await issueService.deleteIssue(issueId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-issues', projectId] })
      toast.success('Issue deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete issue')
    },
  })

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, data }: { issueId: string; data: Partial<IssueDTO> }) => {
      return await issueService.updateIssue(issueId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-issues', projectId] })
      // Toast messages are handled in specific handlers
    },
    onError: () => {
      toast.error('Failed to update issue')
    },
  })

  const handleDeleteIssue = (issueId: string) => {
    if (confirm('Are you sure you want to delete this issue?')) {
      deleteIssueMutation.mutate(issueId)
    }
  }

  const handleOpenMoveToSprintDialog = (issue: IssueDTO) => {
    setSelectedIssueForMove(issue)
    setSelectedSprintId('')
    setMoveToSprintDialogOpen(true)
  }

  const handleMoveToSprint = () => {
    if (!selectedIssueForMove || !selectedSprintId) {
      toast.error('Please select a sprint')
      return
    }

    const selectedSprint = sprints.find(s => s.id === selectedSprintId)
    
    updateIssueMutation.mutate(
      { 
        issueId: selectedIssueForMove.id, 
        data: { sprint_id: selectedSprintId } 
      },
      {
        onSuccess: () => {
          toast.success(`Moved to ${selectedSprint?.name || 'sprint'}`)
          setMoveToSprintDialogOpen(false)
          setSelectedIssueForMove(null)
          setSelectedSprintId('')
        }
      }
    )
  }

  const handleOpenIssueDetail = (issue: IssueDTO) => {
    setSelectedIssueId(issue.id)
  }

  // Filter issues
  const filteredIssues = issues.filter((issue: IssueDTO) => {
    const matchesSearch = searchQuery === '' ||
      issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.issue_key?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter
    const matchesType = typeFilter === 'all' || issue.type === typeFilter

    return matchesSearch && matchesPriority && matchesType
  })

  // Group issues by type
  const epicIssues = filteredIssues.filter((i: IssueDTO) => i.type === 'epic')
  const storyIssues = filteredIssues.filter((i: IssueDTO) => i.type === 'story')
  const taskIssues = filteredIssues.filter((i: IssueDTO) => i.type === 'task')
  const bugIssues = filteredIssues.filter((i: IssueDTO) => i.type === 'bug')

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['backlog-issues', projectId] })
  }

  const IssueRow = ({ issue }: { issue: IssueDTO }) => {
    const TypeIcon = typeConfig[issue.type as keyof typeof typeConfig]?.icon || Circle
    const PriorityIcon = priorityConfig[issue.priority as keyof typeof priorityConfig]?.icon || Circle

    return (
      <TableRow 
        className="hover:bg-slate-50 cursor-pointer group"
        onClick={() => handleOpenIssueDetail(issue)}
      >
        <TableCell className="w-8" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <TypeIcon className={cn('h-4 w-4', typeConfig[issue.type as keyof typeof typeConfig]?.color)} />
            <span className="font-mono text-xs text-slate-500">{issue.issue_key}</span>
          </div>
        </TableCell>
        <TableCell className="max-w-md">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">{issue.title}</p>
            {issue.description && (
              <p className="text-xs text-slate-500 line-clamp-1">{issue.description}</p>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('capitalize', typeConfig[issue.type as keyof typeof typeConfig]?.bg)}>
            {issue.type}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <PriorityIcon className={cn('h-3.5 w-3.5', priorityConfig[issue.priority as keyof typeof priorityConfig]?.color)} />
            <span className="text-sm capitalize">{issue.priority}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-slate-600">{issue.assignee_name || 'Unassigned'}</span>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleOpenIssueDetail(issue)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenMoveToSprintDialog(issue)}>
                Move to sprint
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                const newPriority = prompt('Enter new priority (highest, high, med, low, lowest):', issue.priority)
                if (newPriority && ['highest', 'high', 'med', 'low', 'lowest'].includes(newPriority)) {
                  updateIssueMutation.mutate(
                    { 
                      issueId: issue.id, 
                      data: { priority: newPriority } 
                    },
                    {
                      onSuccess: () => {
                        toast.success(`Priority updated to ${newPriority}`)
                      }
                    }
                  )
                }
              }}>
                Change priority
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onSelect={() => handleDeleteIssue(issue.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <ProjectTabLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Backlog</h1>
            <p className="text-sm text-slate-600 mt-1">
              Plan and prioritize your work items • {filteredIssues.length} issues
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/agents/epic-decomposer">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Decompose
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Issue
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Epics</p>
                  <p className="text-2xl font-bold mt-1">{epicIssues.length}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Stories</p>
                  <p className="text-2xl font-bold mt-1">{storyIssues.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Tasks</p>
                  <p className="text-2xl font-bold mt-1">{taskIssues.length}</p>
                </div>
                <Circle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Bugs</p>
                  <p className="text-2xl font-bold mt-1">{bugIssues.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search issues by title or key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="highest">Highest</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Backlog Table */}
        <Card>
          <CardHeader>
            <CardTitle>Backlog Items</CardTitle>
            <CardDescription>Drag to reorder, click to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-sm text-slate-500">Loading backlog...</div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-900">No issues in backlog</p>
                <p className="text-sm text-slate-600 mt-1">Create your first issue to get started</p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Issue
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-32">Key</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="w-28">Type</TableHead>
                      <TableHead className="w-32">Priority</TableHead>
                      <TableHead className="w-40">Assignee</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue: IssueDTO) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateIssueDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projects={projectQuery.data ? [projectQuery.data] : []}
          defaultProjectId={projectId}
          onCreated={handleCreated}
        />

        {/* Move to Sprint Dialog */}
        <Dialog open={moveToSprintDialogOpen} onOpenChange={setMoveToSprintDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Move to Sprint</DialogTitle>
              <DialogDescription>
                Select a sprint for "{selectedIssueForMove?.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sprint">Sprint</Label>
                <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                  <SelectTrigger id="sprint">
                    <SelectValue placeholder="Select a sprint..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sprints.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-slate-500">
                        No sprints available. Create a sprint first.
                      </div>
                    ) : (
                      sprints
                        .filter(sprint => sprint.state !== 'closed')
                        .map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            <div className="flex items-center gap-2">
                              <span>{sprint.name}</span>
                              {sprint.state === 'active' && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                {sprints.filter(s => s.state !== 'closed').length === 0 && (
                  <p className="text-sm text-slate-500">
                    No active or future sprints available. Please create a sprint from the Board page.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveToSprintDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMoveToSprint} 
                disabled={!selectedSprintId || updateIssueMutation.isPending}
              >
                {updateIssueMutation.isPending ? 'Moving...' : 'Move to Sprint'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Detail Sheet */}
        <IssueDetailSheet
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['backlog-issues', projectId] })
          }}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />
      </div>
    </ProjectTabLayout>
  )
}
