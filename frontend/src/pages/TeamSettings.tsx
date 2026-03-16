import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { teamService } from '@/lib/api/teamService'

export default function TeamSettings() {
  const { currentTeam } = useTeam()
  const teamId = currentTeam?.id
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')

  const { data: settings, isLoading, error: settingsError } = useQuery({
    queryKey: ['team-settings', teamId],
    queryFn: () => teamService.getSettings(teamId!),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: notifications, error: notificationsError } = useQuery({
    queryKey: ['notification-settings', teamId],
    queryFn: () => teamService.getNotificationSettings(teamId!),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: labels, error: labelsError } = useQuery({
    queryKey: ['team-labels', teamId],
    queryFn: () => teamService.listLabels(teamId!),
    enabled: !!teamId,
    retry: 2,
  })

  const updateSettings = useMutation({
    mutationFn: (data: Partial<{
      timezone: string
      working_hours_start: string
      working_hours_end: string
      sprint_length_days: number
      velocity_tracking_enabled: boolean
    }>) => teamService.updateSettings(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-settings', teamId] })
    },
  })

  const updateNotifications = useMutation({
    mutationFn: (data: Partial<{
      email_daily_digest: boolean
      email_sprint_summary: boolean
      email_mentions: boolean
      email_assignments: boolean
      slack_notifications: boolean
      slack_webhook_url: string
    }>) => teamService.updateNotificationSettings(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', teamId] })
    },
  })

  const createLabel = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) => teamService.createLabel(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-labels', teamId] })
    },
  })

  const deleteLabel = useMutation({
    mutationFn: (labelId: string) => teamService.deleteLabel(teamId!, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-labels', teamId] })
    },
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Settings</h1>
          <p className="text-gray-600 mt-2">Configure team preferences and options</p>
        </div>

        {(settingsError || notificationsError || labelsError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {settingsError && <div>Failed to load team settings: {(settingsError as Error).message}</div>}
              {notificationsError && <div>Failed to load notification settings: {(notificationsError as Error).message}</div>}
              {labelsError && <div>Failed to load labels: {(labelsError as Error).message}</div>}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="assignees">Assignees</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure timezone, working hours, and sprint length</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings?.timezone || 'UTC'}
                    onValueChange={(value) => updateSettings.mutate({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Working Hours Start</Label>
                    <Input
                      type="time"
                      defaultValue={settings?.working_hours_start || '09:00'}
                      onBlur={(e) => updateSettings.mutate({ working_hours_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Working Hours End</Label>
                    <Input
                      type="time"
                      defaultValue={settings?.working_hours_end || '17:00'}
                      onBlur={(e) => updateSettings.mutate({ working_hours_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sprint Length (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue={settings?.sprint_length_days || 14}
                    onBlur={(e) => updateSettings.mutate({ sprint_length_days: parseInt(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Velocity Tracking</Label>
                    <p className="text-sm text-muted-foreground">Enable automatic velocity calculation</p>
                  </div>
                  <Switch
                    checked={settings?.velocity_tracking_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ velocity_tracking_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage email and Slack notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Email Digest</Label>
                    <p className="text-sm text-muted-foreground">Daily summary of team activity</p>
                  </div>
                  <Switch
                    checked={notifications?.email_daily_digest ?? true}
                    onCheckedChange={(checked) => updateNotifications.mutate({ email_daily_digest: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sprint Summary</Label>
                    <p className="text-sm text-muted-foreground">Sprint start and end notifications</p>
                  </div>
                  <Switch
                    checked={notifications?.email_sprint_summary ?? true}
                    onCheckedChange={(checked) => updateNotifications.mutate({ email_sprint_summary: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mentions</Label>
                    <p className="text-sm text-muted-foreground">When mentioned in comments</p>
                  </div>
                  <Switch
                    checked={notifications?.email_mentions ?? true}
                    onCheckedChange={(checked) => updateNotifications.mutate({ email_mentions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assignments</Label>
                    <p className="text-sm text-muted-foreground">When issues assigned to you</p>
                  </div>
                  <Switch
                    checked={notifications?.email_assignments ?? true}
                    onCheckedChange={(checked) => updateNotifications.mutate({ email_assignments: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label>Slack Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send to Slack</p>
                  </div>
                  <Switch
                    checked={notifications?.slack_notifications ?? false}
                    onCheckedChange={(checked) => updateNotifications.mutate({ slack_notifications: checked })}
                  />
                </div>

                {notifications?.slack_notifications && (
                  <div className="space-y-2">
                    <Label>Slack Webhook URL</Label>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      defaultValue={notifications.slack_webhook_url || ''}
                      onBlur={(e) => updateNotifications.mutate({ slack_webhook_url: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignees */}
          <TabsContent value="assignees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Assignees</CardTitle>
                <CardDescription>Automatic issue assignment rules</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This feature is under development. Coming soon!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Labels */}
          <TabsContent value="labels" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Labels</CardTitle>
                  <CardDescription>Create and manage custom labels</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const name = prompt('Label name:')
                    if (name) createLabel.mutate({ name })
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Label
                </Button>
              </CardHeader>
              <CardContent>
                {labels && labels.length > 0 ? (
                  <div className="space-y-2">
                    {labels.map((label) => (
                      <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: label.color }} />
                          <div>
                            <div className="font-medium">{label.name}</div>
                            {label.description && (
                              <div className="text-sm text-muted-foreground">{label.description}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete label "${label.name}"?`)) {
                              deleteLabel.mutate(label.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No labels yet. Create your first label to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-4">
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These actions cannot be undone. Please proceed with caution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h3 className="font-semibold">Archive Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Archive this team. Members will lose access.
                  </p>
                  <Button variant="outline" className="text-orange-600" disabled>
                    Archive Team
                  </Button>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h3 className="font-semibold text-red-600">Delete Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this team and all data.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}