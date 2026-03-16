import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  BellIcon, MailIcon, SmartphoneIcon, CheckIcon, Trash2Icon,
  CheckCheckIcon, InboxIcon, Loader2Icon, FileTextIcon,
  GitBranchIcon, AlertTriangleIcon, UsersIcon, LinkIcon,
  MessageSquareIcon, ZapIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { UserService } from '@/lib/services/userService'
import { apiBase, apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────
interface NotificationItem {
  id: string
  workspace_id?: string
  user_id?: string
  team_id?: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  is_read: boolean
  read_at?: string
  created_at: string
}

interface NotificationsListResponse {
  notifications: NotificationItem[]
  total: number
  unread_count: number
}

// ── Helpers ─────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  prd_completed: <FileTextIcon className="w-4 h-4 text-white" />,
  prd_review_requested: <FileTextIcon className="w-4 h-4 text-white" />,
  story_assigned: <GitBranchIcon className="w-4 h-4 text-white" />,
  story_status_changed: <GitBranchIcon className="w-4 h-4 text-white" />,
  sprint_started: <ZapIcon className="w-4 h-4 text-white" />,
  sprint_completed: <CheckIcon className="w-4 h-4 text-white" />,
  epic_created: <GitBranchIcon className="w-4 h-4 text-white" />,
  comment_added: <MessageSquareIcon className="w-4 h-4 text-white" />,
  team_member_joined: <UsersIcon className="w-4 h-4 text-white" />,
  integration_connected: <LinkIcon className="w-4 h-4 text-white" />,
  integration_error: <AlertTriangleIcon className="w-4 h-4 text-white" />,
}

const COLOR_MAP: Record<string, string> = {
  prd_completed: 'bg-indigo-600',
  prd_review_requested: 'bg-amber-500',
  story_assigned: 'bg-blue-600',
  story_status_changed: 'bg-sky-500',
  sprint_started: 'bg-emerald-600',
  sprint_completed: 'bg-green-600',
  epic_created: 'bg-purple-600',
  comment_added: 'bg-cyan-600',
  team_member_joined: 'bg-teal-600',
  integration_connected: 'bg-green-500',
  integration_error: 'bg-red-500',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function Notifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ── Preferences state (unchanged) ──
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [weeklyReports, setWeeklyReports] = useState(false)
  const [aiAgentUpdates, setAiAgentUpdates] = useState(true)
  const [projectAlerts, setProjectAlerts] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const s = await UserService.getUserSettings(user.id)
      if (s) {
        setEmailNotifications(s.email_notifications)
        setPushNotifications(s.push_notifications)
      }
    }
    load()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)
    const ok = await UserService.upsertUserSettings(user.id, {
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
    })
    setSaving(false)
    setMessage(ok ? 'Preferences saved' : 'Failed to save preferences')
  }

  // ── Notifications query ──
  const { data: notifData, isLoading } = useQuery<NotificationsListResponse>({
    queryKey: ['notifications', showUnreadOnly],
    queryFn: () =>
      apiFetch<NotificationsListResponse>(
        apiBase(`/api/notifications?limit=50&unread_only=${showUnreadOnly}`)
      ),
    refetchInterval: 15_000,
  })

  const notifications = notifData?.notifications ?? []
  const unreadCount = notifData?.unread_count ?? 0

  // ── Mark single as read ──
  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(apiBase(`/api/notifications/${id}/read`), { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // ── Mark all as read ──
  const markAllRead = useMutation({
    mutationFn: () =>
      apiFetch(apiBase('/api/notifications/read-all'), { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  // ── Delete notification ──
  const deleteNotif = useMutation({
    mutationFn: (id: string) =>
      apiFetch(apiBase(`/api/notifications/${id}`), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification deleted')
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <BellIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
                <p className="text-blue-700">Manage your notification preferences and alerts</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to be notified about important updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-3 rounded border text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{message}</div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MailIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-slate-600">Receive notifications via email</p>
                </div>
              </div>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SmartphoneIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="push-notifications" className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-slate-600">Receive push notifications in your browser</p>
                </div>
              </div>
              <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="weekly-reports" className="text-base font-medium">Weekly Reports</Label>
                  <p className="text-sm text-slate-600">Get weekly summary of your AI agent activities</p>
                </div>
              </div>
              <Switch id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div>
                  <Label htmlFor="ai-agent-updates" className="text-base font-medium">AI Agent Updates</Label>
                  <p className="text-sm text-slate-600">Notifications when AI agents complete tasks</p>
                </div>
              </div>
              <Switch id="ai-agent-updates" checked={aiAgentUpdates} onCheckedChange={setAiAgentUpdates} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <Label htmlFor="project-alerts" className="text-base font-medium">Project Alerts</Label>
                  <p className="text-sm text-slate-600">Important updates about your projects</p>
                </div>
              </div>
              <Switch id="project-alerts" checked={projectAlerts} onCheckedChange={setProjectAlerts} />
            </div>
            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications — real data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Your latest notifications and updates</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={showUnreadOnly ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
              >
                {showUnreadOnly ? 'Show All' : 'Unread Only'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheckIcon className="w-4 h-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <InboxIcon className="w-12 h-12 mb-3 text-slate-300" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const icon = ICON_MAP[n.type] ?? <BellIcon className="w-4 h-4 text-white" />
                  const color = COLOR_MAP[n.type] ?? 'bg-slate-500'
                  const bgClass = n.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                  return (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors ${bgClass}`}
                    >
                      <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center mt-0.5 shrink-0`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-slate-800 truncate ${!n.is_read ? 'font-semibold' : ''}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => markRead.mutate(n.id)}
                            title="Mark as read"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => deleteNotif.mutate(n.id)}
                          title="Delete"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
