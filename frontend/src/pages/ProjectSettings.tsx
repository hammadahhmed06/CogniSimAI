import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import { useProject } from '@/contexts/ProjectHooks'
import { projectService, type CreateProjectInput } from '@/lib/api/projectService'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Save,
  Trash2,
  Archive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
  Inbox,
  ArchiveRestore,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ProjectSettings() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { project, loading: projectLoading } = useProject()

  const [activeTab, setActiveTab] = useState('general')
  const [showArchived, setShowArchived] = useState(false)

  // Form state for general settings
  const [editedName, setEditedName] = useState(project?.name || '')
  const [editedKey, setEditedKey] = useState(project?.key || '')
  const [editedDescription, setEditedDescription] = useState(project?.description || '')
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  const handleFieldChange = (field: 'name' | 'key' | 'description', value: string) => {
    if (field === 'name') setEditedName(value)
    if (field === 'key') setEditedKey(value)
    if (field === 'description') setEditedDescription(value)

    const changed =
      value !== (field === 'name' ? project?.name : field === 'key' ? project?.key : project?.description)
    setHasChanges(changed)
  }

  // Archived projects query
  const archivedProjectsQuery = useQuery({
    queryKey: ['projects', 'archived'],
    queryFn: () => projectService.listProjects({ status: 'archived' }),
    enabled: showArchived,
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CreateProjectInput & { description?: string }>) => {
      if (!projectId) throw new Error('No project ID')
      return projectService.updateProject(projectId, data)
    },
    onSuccess: () => {
      toast.success('Project updated successfully')
      setHasChanges(false)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update project'
      toast.error(message)
    },
  })

  // Archive project mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')
      return projectService.archiveProject(projectId)
    },
    onSuccess: () => {
      toast.success('Project archived successfully')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/dashboard/projects')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to archive project'
      toast.error(message)
    },
  })

  // Unarchive project mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return projectService.updateProject(id, { status: 'active' })
    },
    onSuccess: () => {
      toast.success('Project restored successfully')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      archivedProjectsQuery.refetch()
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to restore project'
      toast.error(message)
    },
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')
      return projectService.deleteProject(projectId)
    },
    onSuccess: () => {
      toast.success('Project deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/dashboard/projects')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete project'
      toast.error(message)
    },
  })

  const handleSaveGeneral = () => {
    if (!editedName.trim()) {
      toast.error('Project name is required')
      return
    }

    updateMutation.mutate({
      name: editedName.trim(),
      key: editedKey.trim(),
      description: editedDescription.trim(),
    })
  }

  const handleArchive = () => {
    archiveMutation.mutate()
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const handleUnarchive = (id: string) => {
    unarchiveMutation.mutate(id)
  }

  if (projectLoading) {
    return (
      <ProjectTabLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </ProjectTabLayout>
    )
  }

  if (!project) {
    return (
      <ProjectTabLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Not Found</CardTitle>
              <CardDescription>The requested project could not be loaded</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ProjectTabLayout>
    )
  }

  return (
    <ProjectTabLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-600" />
            Project Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your project configuration and preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="archived">
              Archived
              {showArchived && archivedProjectsQuery.data && archivedProjectsQuery.data.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {archivedProjectsQuery.data.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Information</CardTitle>
                <CardDescription>Update your project name, key, and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    value={editedName}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-key">
                    Project Key
                    <span className="text-xs text-slate-500 ml-2">(Used in issue keys)</span>
                  </Label>
                  <Input
                    id="project-key"
                    value={editedKey}
                    onChange={(e) => handleFieldChange('key', e.target.value.toUpperCase())}
                    placeholder="PROJ"
                    maxLength={10}
                    className="uppercase"
                  />
                  <p className="text-xs text-slate-500">
                    3-10 characters, uppercase letters and numbers only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={editedDescription}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Describe your project..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-slate-600">
                    <strong>Project Type:</strong>{' '}
                    <Badge variant="outline" className="ml-1">
                      {project.type === 'scrum' ? 'Scrum' : 'Kanban'}
                    </Badge>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedName(project.name || '')
                    setEditedKey(project.key || '')
                    setEditedDescription(project.description || '')
                    setHasChanges(false)
                  }}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveGeneral}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Statistics</CardTitle>
                <CardDescription>Overview of your project activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">Created</p>
                    <p className="text-sm font-medium text-slate-900">
                      {'created_at' in project && project.created_at
                        ? new Date(project.created_at as string).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">Last Updated</p>
                    <p className="text-sm font-medium text-slate-900">
                      {'updated_at' in project && project.updated_at
                        ? new Date(project.updated_at as string).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                    <Badge
                      variant={project.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {project.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">Project ID</p>
                    <p className="text-xs font-mono text-slate-700">{project.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archived Projects Tab */}
          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Archive className="h-5 w-5 text-slate-600" />
                      Archived Projects
                    </CardTitle>
                    <CardDescription>
                      View and restore archived projects from your workspace
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowArchived(true)
                      archivedProjectsQuery.refetch()
                    }}
                    disabled={archivedProjectsQuery.isFetching}
                  >
                    {archivedProjectsQuery.isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Load Archived'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!showArchived ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mb-2">
                      View Archived Projects
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Click "Load Archived" to view projects that have been archived
                    </p>
                  </div>
                ) : archivedProjectsQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : archivedProjectsQuery.data && archivedProjectsQuery.data.length > 0 ? (
                  <div className="space-y-3">
                    {archivedProjectsQuery.data.map((archivedProject) => (
                      <div
                        key={archivedProject.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                              {archivedProject.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {archivedProject.key}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {archivedProject.type}
                            </Badge>
                          </div>
                          {archivedProject.description && (
                            <p className="text-xs text-slate-600 line-clamp-1">
                              {archivedProject.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            Archived{' '}
                            {archivedProject.archived_at
                              ? new Date(archivedProject.archived_at).toLocaleDateString()
                              : 'recently'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4 gap-2"
                          onClick={() => handleUnarchive(archivedProject.id)}
                          disabled={unarchiveMutation.isPending}
                        >
                          {unarchiveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mb-2">
                      No Archived Projects
                    </h3>
                    <p className="text-sm text-slate-600">
                      You don't have any archived projects in your workspace
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect your project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Archive Project */}
                <div className="flex items-start justify-between p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">
                      Archive this project
                    </h4>
                    <p className="text-xs text-slate-600">
                      Archive this project to hide it from your active projects. You can restore it
                      later from the Archived tab.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-4 border-orange-300">
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive this project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will archive <strong>{project.name}</strong> and hide it from your
                          active projects. You can restore it later from the Archived Projects
                          section.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleArchive}
                          className="bg-orange-600 hover:bg-orange-700"
                          disabled={archiveMutation.isPending}
                        >
                          {archiveMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Archiving...
                            </>
                          ) : (
                            'Archive Project'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Delete Project */}
                <div className="flex items-start justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-600 mb-1">
                      Delete this project
                    </h4>
                    <p className="text-xs text-slate-600">
                      Permanently delete this project and all of its data. This action cannot be
                      undone.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="ml-4">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this project permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{project.name}</strong> and all of its
                          data including issues, sprints, and reports. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Permanently'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Before you proceed</p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>Archived projects can be restored at any time</li>
                      <li>All project data (issues, sprints, reports) will be preserved</li>
                      <li>Team members will lose access until the project is restored</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProjectTabLayout>
  )
}
