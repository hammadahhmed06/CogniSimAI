import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, MoreVertical, Loader2, Trash2, Archive, CheckCircle, Check, ArchiveIcon, RefreshCw, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { projectService, type Project } from '@/lib/api/projectService'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'


export default function Projects() {
  const navigate = useNavigate()
  const { activeWorkspaceId } = useWorkspace()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'jira'>('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [syncingProjects, setSyncingProjects] = useState<Set<string>>(new Set())
  
  // Create Project Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKey, setNewProjectKey] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectType, setNewProjectType] = useState<'scrum' | 'kanban'>('scrum')
  const [creating, setCreating] = useState(false)

  const loadProjects = async () => {
    try {
      setLoading(true)
      const projectsData = await projectService.listProjects()
      
      // Just show all projects for now (workspace filtering would need backend support)
      setProjects(projectsData)
    } catch (error) {
      console.error('Failed to load projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  // Fetch projects from backend
  useEffect(() => {
    loadProjects()
  }, [activeWorkspaceId])

  // Filter projects based on search, type, and source
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.jira_project_key?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Default to 'active' if status is not set
    const projectStatus = project.status || 'active'
    const matchesType = typeFilter === 'all' || projectStatus === typeFilter
    
    // Source filter
    const isJiraProject = !!project.integration_id
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'jira' && isJiraProject) ||
      (sourceFilter === 'local' && !isJiraProject)
    
    return matchesSearch && matchesType && matchesSource
  })

  const jiraProjectsCount = projects.filter(p => !!p.integration_id).length
  const localProjectsCount = projects.filter(p => !p.integration_id).length

  // Handle create project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    if (!newProjectKey.trim()) {
      toast.error('Please enter a project key')
      return
    }

    try {
      setCreating(true)
      await projectService.createProject({
        name: newProjectName.trim(),
        key: newProjectKey.trim().toUpperCase(),
        type: newProjectType,
      })

      toast.success('Project created successfully')
      setCreateDialogOpen(false)
      
      // Reset form
      setNewProjectName('')
      setNewProjectKey('')
      setNewProjectDescription('')

      // Reload projects
      await loadProjects()
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  // Handle archive project (permanent - no undo)
  const handleArchiveProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to archive this project? This cannot be undone.')) {
      return
    }

    try {
      await projectService.archiveProject(projectId)
      toast.success('Project archived')
      await loadProjects()
    } catch (error) {
      console.error('Failed to archive project:', error)
      toast.error('Failed to archive project')
    }
  }

  // Handle complete project
  const handleCompleteProject = async (projectId: string) => {
    try {
      await projectService.completeProject(projectId)
      toast.success('Project marked as complete')
      await loadProjects()
    } catch (error) {
      console.error('Failed to complete project:', error)
      toast.error('Failed to complete project')
    }
  }

  // Handle delete project
    const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      // Soft delete by updating project status
      await projectService.deleteProject(projectId)
      toast.success('Project deleted')
      await loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('Failed to delete project')
    }
  }

  // Handle sync single project from Jira
  const handleSyncProject = async (projectId: string, integrationId: string) => {
    setSyncingProjects(prev => new Set(prev).add(projectId))
    
    try {
      // TODO: Call sync API endpoint
      toast.info('Sync functionality coming soon')
      // await jiraService.syncProject(integrationId, projectId)
      // await loadProjects()
      // toast.success('Project synced successfully')
    } catch (error) {
      console.error('Failed to sync project:', error)
      toast.error('Failed to sync project')
    } finally {
      setSyncingProjects(prev => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  // Handle bulk sync selected projects
  const handleBulkSync = async () => {
    const jiraProjects = Array.from(selectedProjects)
      .map(id => projects.find(p => p.id === id))
      .filter(p => p?.integration_id)
    
    if (jiraProjects.length === 0) {
      toast.error('No Jira projects selected')
      return
    }

    toast.info(`Syncing ${jiraProjects.length} projects...`)
    
    // TODO: Implement bulk sync
    // for (const project of jiraProjects) {
    //   await handleSyncProject(project.id, project.integration_id!)
    // }
    
    setSelectedProjects(new Set())
  }

  // Toggle project selection
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Select all filtered projects
  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set())
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)))
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setCreateDialogOpen(true)}
              disabled={!activeWorkspaceId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources ({projects.length})</SelectItem>
                <SelectItem value="local">Local ({localProjectsCount})</SelectItem>
                <SelectItem value="jira">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                    </svg>
                    Jira ({jiraProjectsCount})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {selectedProjects.size > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkSync}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Selected ({selectedProjects.size})
              </Button>
            )}
          </div>
        </div>

        {/* Projects Table */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Create your first project to get started'}
              </p>
            </div>
          ) : (
            <div className="bg-white m-6 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const projectStatus = project.status || 'active'
                    const isCompleted = projectStatus === 'completed'
                    const isArchived = projectStatus === 'archived'
                    const isJiraProject = !!project.integration_id
                    const isSyncing = syncingProjects.has(project.id)
                    
                    return (
                      <TableRow 
                        key={project.id} 
                        className={`hover:bg-gray-50 ${
                          isCompleted ? 'bg-blue-50/30' : ''
                        } ${
                          isArchived ? 'opacity-60' : ''
                        }`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded flex items-center justify-center text-white font-semibold text-sm ${
                              isCompleted ? 'bg-blue-600' : isArchived ? 'bg-gray-400' : 'bg-blue-500'
                            }`}>
                              {project.key?.substring(0, 2) || project.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isCompleted && (
                                <Check className="h-4 w-4 text-blue-600" />
                              )}
                              <span 
                                className={`font-medium hover:underline cursor-pointer ${
                                  isCompleted ? 'text-blue-600' : 'text-blue-600'
                                }`}
                                onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                              >
                                {project.name}
                              </span>
                              {isJiraProject && (
                                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                                  </svg>
                                  Jira
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-gray-600">
                              {project.key || '—'}
                            </span>
                            {project.jira_project_key && (
                              <span className="text-xs text-gray-500">
                                {project.jira_project_key}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 capitalize">
                            {project.type || 'scrum'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isJiraProject ? (
                            <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                              </svg>
                              Jira
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-gray-600 border-gray-300 bg-gray-50">
                              Local
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {projectStatus === 'active' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                              Active
                            </Badge>
                          )}
                          {projectStatus === 'completed' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                              <Check className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {projectStatus === 'archived' && (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">
                              <ArchiveIcon className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                              HA
                            </div>
                            <span className="text-sm text-gray-700">You</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isJiraProject && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleSyncProject(project.id, project.integration_id!)}
                                    disabled={syncingProjects.has(project.id)}
                                  >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${syncingProjects.has(project.id) ? 'animate-spin' : ''}`} />
                                    {syncingProjects.has(project.id) ? 'Syncing...' : 'Sync Now'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const jiraUrl = `https://${project.jira_project_key?.split('-')[0]}.atlassian.net/browse/${project.jira_project_key}`;
                                      window.open(jiraUrl, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in Jira
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleCompleteProject(project.id)}
                                disabled={isCompleted || isArchived}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleArchiveProject(project.id)}
                                disabled={isArchived}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Move to trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredProjects.length > 0 && (
          <div className="border-t bg-white px-6 py-3 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                &lt;
              </Button>
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                &gt;
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to organize your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., My Scrum Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Project Key <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., SCRUM"
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                A short identifier for your project (2-10 characters)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Project Type <span className="text-red-500">*</span>
              </label>
              <RadioGroup value={newProjectType} onValueChange={(value: 'scrum' | 'kanban') => setNewProjectType(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="scrum" id="scrum" />
                  <Label htmlFor="scrum" className="flex-1 cursor-pointer">
                    <div className="font-medium">Scrum</div>
                    <div className="text-xs text-gray-500">Sprint-based agile framework with fixed iterations</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 mt-2">
                  <RadioGroupItem value="kanban" id="kanban" />
                  <Label htmlFor="kanban" className="flex-1 cursor-pointer">
                    <div className="font-medium">Kanban</div>
                    <div className="text-xs text-gray-500">Continuous flow with WIP limits and visual boards</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description (Optional)
              </label>
              <Input
                placeholder="Describe your project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creating || !newProjectName.trim() || !newProjectKey.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}