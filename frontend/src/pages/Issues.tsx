import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Search, Plus, SlidersHorizontal, Loader2, MessageSquare, RefreshCw, ExternalLink } from 'lucide-react'
import { issueService, type IssueDTO } from '@/lib/api/issueService'
import { projectService, type ProjectDTO } from '@/lib/api/projectService'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { IssueDetailSheet } from '@/components/IssueDetailSheet'
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDistanceToNow } from 'date-fns'

export default function Issues() {
  const { activeWorkspaceId } = useWorkspace()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'jira'>('all')
  const [issues, setIssues] = useState<IssueDTO[]>([])
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())
  const [syncingIssues, setSyncingIssues] = useState<Set<string>>(new Set())
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  
  // Create Issue Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch issues from backend - filtered by workspace
  useEffect(() => {
    const loadIssues = async () => {
      if (!activeWorkspaceId) {
        setIssues([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await issueService.listIssues({ 
          workspace_id: activeWorkspaceId,
          limit: 100 
        })
        setIssues(response.items || [])
      } catch (error) {
        console.error('Failed to load issues:', error)
        toast.error('Failed to load issues')
      } finally {
        setLoading(false)
      }
    }

    loadIssues()
  }, [activeWorkspaceId])

  // Fetch projects for the project column and create dialog - filtered by workspace
  useEffect(() => {
    const loadProjects = async () => {
      if (!activeWorkspaceId) {
        setProjects([])
        return
      }

      try {
        const projectList = await projectService.listProjects({ status: 'active' })
        setProjects(projectList || [])
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }

    loadProjects()
  }, [activeWorkspaceId])

  // Project lookup map and project IDs set
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectDTO>()
    projects.forEach(p => map.set(p.id, p))
    return map
  }, [projects])

  const projectIdsInWorkspace = useMemo(() => {
    return new Set(projects.map(p => p.id))
  }, [projects])

  const getTypeIcon = (type: string) => {
    const colors = {
      story: 'bg-green-100 text-green-700',
      task: 'bg-blue-100 text-blue-700',
      bug: 'bg-red-100 text-red-700',
      epic: 'bg-purple-100 text-purple-700',
    }
    return colors[type?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || ''
    if (lowerStatus.includes('done') || lowerStatus === 'completed') return 'bg-green-100 text-green-700'
    if (lowerStatus.includes('progress') || lowerStatus === 'in_progress') return 'bg-blue-100 text-blue-700'
    if (lowerStatus.includes('review')) return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority: string) => {
    const lowerPriority = priority?.toLowerCase() || ''
    if (lowerPriority === 'high' || lowerPriority === 'critical') return 'text-red-600'
    if (lowerPriority === 'medium') return 'text-orange-600'
    if (lowerPriority === 'low') return 'text-blue-600'
    return 'text-gray-600'
  }

  const formatStatus = (status: string) => {
    if (!status) return 'To Do'
    // Convert snake_case to Title Case
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const filteredIssues = issues.filter(issue => {
    // First, ensure the issue belongs to the current workspace or its projects
    const belongsToWorkspace = issue.workspace_id === activeWorkspaceId || 
                               (issue.project_id && projectIdsInWorkspace.has(issue.project_id))
    
    if (!belongsToWorkspace) return false

    // Then apply user filters
    const matchesSearch = issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         issue.issue_key?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter
    const matchesType = typeFilter === 'all' || issue.type === typeFilter
    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter
    const matchesProject = projectFilter === 'all' || issue.project_id === projectFilter
    
    // Source filter
    const isJiraIssue = !!issue.integration_id || !!issue.jira_issue_id
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'jira' && isJiraIssue) ||
      (sourceFilter === 'local' && !isJiraIssue)
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesProject && matchesSource
  })

  const jiraIssuesCount = issues.filter(i => !!i.integration_id || !!i.jira_issue_id).length
  const localIssuesCount = issues.filter(i => !i.integration_id && !i.jira_issue_id).length

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return '—'
    }
  }

  // Get comment count (placeholder - would need actual comment data from backend)
  const getCommentCount = (issue: IssueDTO) => {
    return issue.comment_count ?? 0
  }

  // Handle checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIssues(new Set(filteredIssues.map(i => i.id)))
    } else {
      setSelectedIssues(new Set())
    }
  }

  const handleSelectIssue = (issueId: string, checked: boolean) => {
    const newSelected = new Set(selectedIssues)
    if (checked) {
      newSelected.add(issueId)
    } else {
      newSelected.delete(issueId)
    }
    setSelectedIssues(newSelected)
  }

  const allSelected = filteredIssues.length > 0 && selectedIssues.size === filteredIssues.length

  // Handle sync individual issue
  const handleSyncIssue = async (issueId: string) => {
    setSyncingIssues(prev => new Set(prev).add(issueId))
    try {
      // TODO: Implement actual sync API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      // toast.success('Issue synced successfully')
    } catch (error) {
      console.error('Failed to sync issue:', error)
      toast.error('Failed to sync issue')
    } finally {
      setSyncingIssues(prev => {
        const next = new Set(prev)
        next.delete(issueId)
        return next
      })
    }
  }

  // Handle bulk sync selected issues
  const handleBulkSync = async () => {
    const jiraIssues = Array.from(selectedIssues)
      .map(id => issues.find(i => i.id === id))
      .filter(i => i?.integration_id || i?.jira_issue_id)
    
    if (jiraIssues.length === 0) {
      toast.error('No Jira issues selected')
      return
    }

    toast.info(`Syncing ${jiraIssues.length} issue(s)...`)
    
    for (const issue of jiraIssues) {
      if (issue) {
        await handleSyncIssue(issue.id)
      }
    }
    
    toast.success(`Synced ${jiraIssues.length} issue(s) successfully`)
  }

  const refreshIssues = async () => {
    if (!activeWorkspaceId) return
    const response = await issueService.listIssues({
      workspace_id: activeWorkspaceId,
      limit: 100,
    })
    setIssues(response.items || [])
  }

  // Handle issue update from detail sheet
  const handleIssueUpdated = async () => {
    if (!activeWorkspaceId) return
    
    try {
      const response = await issueService.listIssues({ 
        workspace_id: activeWorkspaceId,
        limit: 100 
      })
      setIssues(response.items || [])
    } catch (error) {
      console.error('Failed to reload issues:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
              {activeWorkspaceId && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing issues from current workspace and its projects
                </p>
              )}
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setCreateDialogOpen(true)}
              disabled={!activeWorkspaceId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="border-b bg-white px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-300"
              />
            </div>

            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'local' | 'jira')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources ({issues.length})</SelectItem>
                <SelectItem value="local">Local ({localIssuesCount})</SelectItem>
                <SelectItem value="jira">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                    </svg>
                    Jira ({jiraIssuesCount})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] border-gray-300">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] border-gray-300">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[160px] border-gray-300">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedIssues.size > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkSync}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Selected ({selectedIssues.size})
              </Button>
            )}
          </div>
        </div>

        {/* Table - Scrollable Container */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {!activeWorkspaceId ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No workspace selected</p>
                <p className="text-sm text-gray-400">Please select a workspace to view issues</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow className="bg-white border-b hover:bg-white">
                    <TableHead className="w-12 sticky left-0 bg-white z-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[80px]">Type</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[100px]">Key</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[250px]">Summary</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[150px]">Project</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[90px]">Priority</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[150px]">Assignee</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[80px] text-center">
                      <MessageSquare className="h-4 w-4 inline" />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[110px]">Created</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[110px]">Updated</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-[110px]">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12 text-gray-500">
                        {issues.length === 0 ? 'No issues yet. Create one to get started!' : 'No issues match your filters'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIssues.map((issue) => (
                      <TableRow 
                        key={issue.id} 
                        className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedIssueId(issue.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()} className="sticky left-0 bg-white">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedIssues.has(issue.id)}
                            onChange={(e) => handleSelectIssue(issue.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getTypeIcon(issue.type || 'task')} border-0 font-normal`}>
                            {issue.type || 'Task'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-600 hover:text-blue-800">
                              {issue.jira_issue_key || issue.issue_key}
                            </span>
                            {(issue.integration_id || issue.jira_issue_id) && (
                              <>
                                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                                  </svg>
                                  Jira
                                </Badge>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const jiraKey = issue.jira_issue_key || issue.issue_key
                                    const jiraUrl = `https://atlassian.net/browse/${jiraKey}`
                                    window.open(jiraUrl, '_blank')
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <ExternalLink className="h-3 w-3 text-gray-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-900 line-clamp-2">{issue.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {issue.project_id ? (
                              projectMap.get(issue.project_id)?.name || 'Unknown Project'
                            ) : (
                              <span className="text-gray-400 italic">No Project</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(issue.status)} border-0 font-normal`}>
                            {formatStatus(issue.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${getPriorityColor(issue.priority || 'medium')}`}>
                            {issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : 'Medium'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {issue.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                {issue.assignee_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm text-gray-700">{issue.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-500">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="text-xs">{getCommentCount(issue)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {formatDate(issue.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {formatDate(issue.updated_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {formatDate(issue.due_date)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Showing {filteredIssues.length} of {issues.length} issues</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </div>
      </div>

      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projects={projects}
        onCreated={() => {
          refreshIssues()
        }}
      />

      {/* Issue Detail Sheet */}
      <IssueDetailSheet
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={handleIssueUpdated}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
      />
    </DashboardLayout>
  )
}
