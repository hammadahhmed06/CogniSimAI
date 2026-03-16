import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { issueService, type IssueDTO } from '@/lib/api/issueService'
import type { ProjectDTO } from '@/lib/api/projectService'
import { AssigneePicker } from '@/components/issues/AssigneePicker'
import { toast } from 'sonner'

export type CreateIssueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: ProjectDTO[]
  defaultProjectId?: string
  defaultType?: string
  onCreated?: (issue: IssueDTO) => void
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  defaultType,
  onCreated,
}: CreateIssueDialogProps) {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [type, setType] = React.useState(defaultType || 'task')
  const [priority, setPriority] = React.useState('med')
  const [status, setStatus] = React.useState('todo')
  const [projectId, setProjectId] = React.useState(defaultProjectId || 'none')
  const [assignee, setAssignee] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')

  // Keep project in sync when opening from a project-context page.
  React.useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || 'none')
    setType(defaultType || 'task')
  }, [open, defaultProjectId, defaultType])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required')
      return issueService.createIssue({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        status,
        project_id: projectId !== 'none' ? projectId : undefined,
        assignee_name: assignee.trim() ? assignee.trim() : undefined,
        due_date: dueDate || undefined,
      })
    },
    onSuccess: (created) => {
      toast.success('Issue created successfully')
      onCreated?.(created)
      onOpenChange(false)
      // Reset form
      setTitle('')
      setDescription('')
      setType(defaultType || 'task')
      setPriority('med')
      setStatus('todo')
      setAssignee('')
      setDueDate('')
      setProjectId(defaultProjectId || 'none')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create issue')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Issue</DialogTitle>
          <DialogDescription>Create a new issue and optionally assign it to a project</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm">Title *</Label>
            <Input
              placeholder="Enter issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label className="text-sm">Description</Label>
            <Textarea
              rows={4}
              placeholder="Enter issue description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowest">Lowest</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="highest">Highest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Assignee</Label>
              <AssigneePicker value={assignee} onChange={setAssignee} placeholder="Unassigned" />
            </div>
            <div>
              <Label className="text-sm">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !title.trim()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Issue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
