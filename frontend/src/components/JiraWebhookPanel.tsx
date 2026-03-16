import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jiraService } from '@/lib/api/jiraService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Webhook, Trash2, Plus, Activity, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const JiraWebhookPanel = ({ integrationId }: { integrationId: string }) => {
  const [selectedProject, setSelectedProject] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['jira-projects', integrationId],
    queryFn: () => jiraService.listProjects(integrationId),
  })

  const { data: webhooks, isLoading: webhooksLoading, error: webhooksError } = useQuery({
    queryKey: ['jira-webhooks', integrationId],
    queryFn: () => jiraService.listWebhooks(integrationId),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const registerWebhook = useMutation({
    mutationFn: (projectKey: string) =>
      jiraService.registerWebhook(integrationId, {
        project_key: projectKey,
        events: ['jira:issue_created', 'jira:issue_updated', 'jira:issue_deleted'],
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jira-webhooks', integrationId] })
      toast.success('Webhook registered successfully!')
      console.log('Webhook registered:', data)
      setDialogOpen(false)
      setSelectedProject('')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to register webhook')
      console.error('Webhook registration error:', error)
    },
  })

  const deleteWebhook = useMutation({
    mutationFn: (webhookId: string) => jiraService.deleteWebhook(integrationId, webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-webhooks', integrationId] })
      toast.success('Webhook deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete webhook')
      console.error('Webhook deletion error:', error)
    },
  })

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-600" />
            <span>Real-Time Sync (Webhooks)</span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Jira Webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Webhooks enable real-time synchronization. Jira will notify us immediately when issues are created, updated, or deleted.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Project</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsLoading ? (
                        <div className="p-2 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : (
                        projects?.projects.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.name} ({p.key})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    The webhook will monitor all issues in this project
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setSelectedProject('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => registerWebhook.mutate(selectedProject)}
                  disabled={!selectedProject || registerWebhook.isPending}
                >
                  {registerWebhook.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Webhook className="mr-2 h-4 w-4" />
                      Register Webhook
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {webhooksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : webhooksError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load webhooks. Please try again.
            </AlertDescription>
          </Alert>
        ) : webhooks?.webhooks && webhooks.webhooks.length > 0 ? (
          <div className="space-y-2">
            {webhooks.webhooks.map((webhook) => (
              <div 
                key={webhook.id} 
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{webhook.webhook_name}</p>
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'} className="text-xs">
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Events: {webhook.events.join(', ')}
                  </p>
                  {webhook.jql_filter && (
                    <p className="text-xs text-slate-400">
                      Filter: {webhook.jql_filter}
                    </p>
                  )}
                  {webhook.last_received_at && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Activity className="h-3 w-3" />
                      Last event: {new Date(webhook.last_received_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteWebhook.mutate(webhook.id)}
                  disabled={deleteWebhook.isPending}
                  className="ml-2"
                >
                  {deleteWebhook.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Webhook className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No webhooks configured</p>
            <p className="text-xs text-slate-400 mb-3">
              Add a webhook to enable real-time synchronization
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Register First Webhook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
