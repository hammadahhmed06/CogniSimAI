import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Link2, FileText, Code, Video, Image, Folder, ExternalLink, Trash2, Pin, Eye } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { teamService, TeamResource } from '@/lib/api/teamService'

export default function TeamResources() {
  const { currentTeam } = useTeam()
  const teamId = currentTeam?.id
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [selectedType, setSelectedType] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form state for Add Resource dialog
  const [formResourceType, setFormResourceType] = useState('link')
  const [formCategoryId, setFormCategoryId] = useState<string | undefined>(undefined)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['team-resources', teamId, selectedCategory, selectedType],
    queryFn: () => teamService.listResources(teamId!, {
      category_id: selectedCategory === 'all' ? undefined : selectedCategory,
      resource_type: selectedType === 'all' ? undefined : (selectedType as 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image' | undefined),
    }),
    enabled: !!teamId,
  })

  const { data: categories } = useQuery({
    queryKey: ['resource-categories', teamId],
    queryFn: () => teamService.listCategories(teamId!),
    enabled: !!teamId,
  })

  const createResource = useMutation({
    mutationFn: (data: {
      title: string
      description?: string
      resource_type: 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image'
      url?: string
      content?: string
      category_id?: string
      tags?: string[]
    }) => teamService.createResource(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-resources', teamId] })
      setIsCreateOpen(false)
      // Reset form state
      setFormResourceType('link')
      setFormCategoryId(undefined)
    },
  })

  const updateResource = useMutation({
    mutationFn: ({ resourceId, data }: { resourceId: string; data: { is_pinned?: boolean; is_archived?: boolean } }) =>
      teamService.updateResource(teamId!, resourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-resources', teamId] })
    },
  })

  const deleteResource = useMutation({
    mutationFn: (resourceId: string) => teamService.deleteResource(teamId!, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-resources', teamId] })
    },
  })

  const createCategory = useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string }) =>
      teamService.createCategory(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-categories', teamId] })
      setIsCategoryOpen(false)
    },
  })

  const handleCreateResource = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const tags = (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || []
    
    createResource.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      resource_type: formResourceType as 'link' | 'document' | 'file' | 'code_snippet' | 'video' | 'image',
      url: formData.get('url') as string || undefined,
      content: formData.get('content') as string || undefined,
      category_id: formCategoryId,
      tags,
    })
  }

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createCategory.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      icon: formData.get('icon') as string || undefined,
    })
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link2 className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      case 'code_snippet': return <Code className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const filteredResources = resources?.filter(resource =>
    searchQuery === '' ||
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Resources</h1>
            <p className="text-gray-600 mt-2">Shared documents, links, and knowledge base</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Folder className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>Organize resources into categories</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Category Name *</Label>
                      <Input id="cat-name" name="name" required placeholder="e.g., Documentation" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Textarea id="cat-description" name="description" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-icon">Icon</Label>
                      <Input id="cat-icon" name="icon" placeholder="folder" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createCategory.isPending}>
                      {createCategory.isPending ? 'Creating...' : 'Create Category'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleCreateResource}>
                  <DialogHeader>
                    <DialogTitle>Add Resource</DialogTitle>
                    <DialogDescription>Share a link, document, or code snippet with your team</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input id="title" name="title" required placeholder="e.g., API Documentation" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resource_type">Type *</Label>
                      <Select value={formResourceType} onValueChange={setFormResourceType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="code_snippet">Code Snippet</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url">URL</Label>
                      <Input id="url" name="url" type="url" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="What is this resource about?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content (for code snippets)</Label>
                      <Textarea id="content" name="content" className="font-mono text-sm" rows={6} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category_id">Category</Label>
                        <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input id="tags" name="tags" placeholder="api, docs, reference" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createResource.isPending}>
                      {createResource.isPending ? 'Adding...' : 'Add Resource'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="link">Links</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="code_snippet">Code Snippets</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-gray-400 animate-pulse" />
            <p className="text-gray-500 mt-2">Loading resources...</p>
          </div>
        ) : filteredResources && filteredResources.length > 0 ? (
          <div className="grid gap-4">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className={resource.is_pinned ? 'border-blue-300 bg-blue-50/30' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getResourceIcon(resource.resource_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{resource.title}</CardTitle>
                          {resource.is_pinned && <Pin className="h-4 w-4 text-blue-600" />}
                        </div>
                        {resource.description && (
                          <CardDescription className="mt-1">{resource.description}</CardDescription>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="outline">{resource.resource_type}</Badge>
                          {resource.tags.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                          <span className="text-xs text-muted-foreground ml-auto">
                            <Eye className="h-3 w-3 inline mr-1" />
                            {resource.view_count} views
                          </span>
                          <span className="text-xs text-muted-foreground">
                            By {resource.created_by_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {resource.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.open(resource.url, '_blank')
                            teamService.trackResourceView(teamId!, resource.id)
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateResource.mutate({
                            resourceId: resource.id,
                            data: { is_pinned: !resource.is_pinned },
                          })
                        }
                      >
                        <Pin className={`h-4 w-4 ${resource.is_pinned ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${resource.title}"?`)) {
                            deleteResource.mutate(resource.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {resource.content && (
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{resource.content}</code>
                    </pre>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="text-lg font-semibold mt-4">No resources yet</h3>
              <p className="text-muted-foreground mt-2">Add your first resource to get started.</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
