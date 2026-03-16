"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  RefreshCw,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Shield,
  Bell,
  Hash,
  MessageSquare,
  Send,
  Users,
  Terminal,
  Loader2,
  Volume2,
  VolumeX,
  AlertTriangle,
} from "lucide-react"
import { DashboardLayout } from "@/components/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { integrationService } from "@/lib/api/integrationService"
import { slackService } from "@/lib/api/slackService"
import type { SlackChannel } from "@/lib/api/slackService"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SlackSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspace()
  const [testMessage, setTestMessage] = React.useState("")
  const [testChannelId, setTestChannelId] = React.useState("")

  // Fetch Slack status
  const { data: slackStatus, isLoading } = useQuery({
    queryKey: ['slack-status', activeWorkspaceId],
    queryFn: () => integrationService.getSlackStatus(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    refetchInterval: 10000,
  })

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['slack-channels', activeWorkspaceId],
    queryFn: () => slackService.getChannels(activeWorkspaceId!),
    enabled: !!activeWorkspaceId && slackStatus?.is_connected === true,
  })

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => slackService.testConnection(activeWorkspaceId!),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Connection is healthy!")
      } else {
        toast.error(data.message || "Connection test failed")
      }
    },
    onError: () => toast.error("Failed to test connection"),
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof slackService.updateSettings>[1]) =>
      slackService.updateSettings(activeWorkspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-status', activeWorkspaceId] })
      toast.success("Settings updated successfully")
    },
    onError: () => toast.error("Failed to update settings"),
  })

  // Send test notification mutation
  const sendTestMutation = useMutation({
    mutationFn: () => {
      // Use a placeholder team ID — the backend will resolve from workspace context
      const teamId = activeWorkspaceId!
      return slackService.sendNotification(teamId, {
        channel_id: testChannelId || undefined,
        message: testMessage || "🚀 Test notification from CogniSim AI! Your Slack integration is working.",
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Test notification sent!")
        setTestMessage("")
      } else {
        toast.error(data.error || "Failed to send notification")
      }
    },
    onError: () => toast.error("Failed to send test notification"),
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => integrationService.disconnectSlack(activeWorkspaceId!),
    onSuccess: () => {
      toast.success("Slack disconnected successfully")
      queryClient.invalidateQueries({ queryKey: ['slack-status', activeWorkspaceId] })
      navigate('/dashboard/integrations')
    },
    onError: () => toast.error("Failed to disconnect Slack"),
  })

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect Slack? This will stop all notifications and bot features.")) {
      disconnectMutation.mutate()
    }
  }

  const handleToggleSetting = (setting: string, value: boolean) => {
    updateSettingsMutation.mutate({ [setting]: value })
  }

  const handleDefaultChannelChange = (channelId: string) => {
    const channel = channels.find((c: SlackChannel) => c.id === channelId)
    updateSettingsMutation.mutate({
      default_channel_id: channelId,
      default_channel_name: channel?.name || undefined,
    })
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!slackStatus?.is_connected) {
    navigate('/dashboard/integrations')
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/integrations')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Slack Settings</h1>
                  <p className="text-sm text-slate-600">
                    Configure your Slack integration for {slackStatus.slack_workspace_name || 'your workspace'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="hover:bg-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </motion.div>

        {/* Connection Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-emerald-900">Connected to Slack</CardTitle>
                    <CardDescription className="text-emerald-700">
                      {slackStatus.slack_workspace_name || "Slack Workspace"}
                      {slackStatus.default_channel_name && ` • #${slackStatus.default_channel_name}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {slackStatus.last_sync_at && (
                    <Badge variant="outline" className="gap-2 border-emerald-600 text-emerald-700">
                      <Clock className="h-3 w-3" />
                      Last sync: {new Date(slackStatus.last_sync_at).toLocaleTimeString()}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="gap-2">
                <Settings2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="channels" className="gap-2">
                <Hash className="h-4 w-4" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Shield className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-purple-500" />
                    Default Channel
                  </CardTitle>
                  <CardDescription>
                    Choose the default Slack channel for notifications and bot messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={slackStatus.default_channel_name ? channels.find((c: SlackChannel) => c.name === slackStatus.default_channel_name)?.id || "" : ""}
                    onValueChange={handleDefaultChannelChange}
                    disabled={channelsLoading}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder={channelsLoading ? "Loading channels..." : "Select a default channel"} />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel: SlackChannel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-slate-400" />
                            {channel.name}
                            {channel.is_private && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1">Private</Badge>
                            )}
                            {channel.num_members != null && (
                              <span className="text-xs text-slate-400 ml-1">
                                {channel.num_members} members
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-purple-500" />
                    Features
                  </CardTitle>
                  <CardDescription>
                    Enable or disable Slack integration features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Notifications</Label>
                      <p className="text-sm text-slate-600">
                        Send automated notifications to Slack channels for project events
                      </p>
                    </div>
                    <Switch
                      checked={slackStatus.notifications_enabled}
                      onCheckedChange={(checked) => handleToggleSetting('notifications_enabled', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Slash Commands</Label>
                      <p className="text-sm text-slate-600">
                        Allow users to interact with CogniSim via /cognisim commands in Slack
                      </p>
                    </div>
                    <Switch
                      checked={slackStatus.slash_commands_enabled}
                      onCheckedChange={(checked) => handleToggleSetting('slash_commands_enabled', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-purple-500" />
                    Notification Events
                  </CardTitle>
                  <CardDescription>
                    Configure which events trigger Slack notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'prd_completed', label: 'PRD Completed', desc: 'When a PRD generation finishes' },
                    { key: 'prd_review', label: 'PRD Review Requested', desc: 'When a PRD review is requested' },
                    { key: 'story_assigned', label: 'Story Assigned', desc: 'When a user story is assigned to a team member' },
                    { key: 'sprint_started', label: 'Sprint Started', desc: 'When a sprint begins' },
                    { key: 'sprint_completed', label: 'Sprint Completed', desc: 'When a sprint ends' },
                    { key: 'epic_created', label: 'Epic Created', desc: 'When a new epic is created' },
                    { key: 'integration_error', label: 'Integration Errors', desc: 'When an integration encounters an error' },
                  ].map((event) => (
                    <div key={event.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">{event.label}</Label>
                        <p className="text-xs text-slate-500">{event.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-purple-500" />
                    Send Test Notification
                  </CardTitle>
                  <CardDescription>
                    Send a test message to verify your Slack integration is working
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-channel">Channel</Label>
                    <Select
                      value={testChannelId}
                      onValueChange={setTestChannelId}
                      disabled={channelsLoading}
                    >
                      <SelectTrigger id="test-channel" className="w-full max-w-md">
                        <SelectValue placeholder={channelsLoading ? "Loading..." : "Select channel (or use default)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel: SlackChannel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            <div className="flex items-center gap-2">
                              <Hash className="h-3 w-3 text-slate-400" />
                              {channel.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-message">Message</Label>
                    <Textarea
                      id="test-message"
                      placeholder="Enter a test message (leave empty for default)"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="max-w-md"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => sendTestMutation.mutate()}
                    disabled={sendTestMutation.isPending}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    {sendTestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sendTestMutation.isPending ? 'Sending...' : 'Send Test Notification'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Channels Tab */}
            <TabsContent value="channels" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-purple-500" />
                        Workspace Channels
                      </CardTitle>
                      <CardDescription>
                        All channels accessible by the CogniSim bot in your Slack workspace
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['slack-channels', activeWorkspaceId] })}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {channelsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Hash className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No channels found. Make sure the bot is added to channels.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {channels.map((channel: SlackChannel) => (
                        <div key={channel.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              channel.is_private ? "bg-amber-100" : "bg-purple-100"
                            )}>
                              {channel.is_private ? (
                                <Shield className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Hash className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">#{channel.name}</p>
                              <p className="text-xs text-slate-500">
                                {channel.is_private ? 'Private' : 'Public'}
                                {channel.num_members != null && ` • ${channel.num_members} members`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {channel.is_archived && (
                              <Badge variant="outline" className="text-xs text-slate-400">Archived</Badge>
                            )}
                            {slackStatus.default_channel_name === channel.name && (
                              <Badge className="bg-purple-500 text-xs">Default</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    Security & Authentication
                  </CardTitle>
                  <CardDescription>
                    OAuth connection details and security information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">OAuth Connection</p>
                      <p className="text-sm text-slate-600">Securely connected via Slack OAuth 2.0</p>
                    </div>
                    <Badge className="bg-emerald-500">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">Workspace</p>
                      <p className="text-sm text-slate-600 font-mono">
                        {slackStatus.slack_workspace_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Integration Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Workspace ID</p>
                      <p className="text-sm font-mono text-slate-900">{slackStatus.workspace_id || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Status</p>
                      <Badge className="bg-emerald-500">Connected</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Installed By</p>
                      <p className="text-sm text-slate-900">{slackStatus.installed_by_email || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Last Sync</p>
                      <p className="text-sm text-slate-900">
                        {slackStatus.last_sync_at
                          ? new Date(slackStatus.last_sync_at).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {slackStatus.scopes?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-600 mb-2">Granted Scopes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slackStatus.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs font-mono">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    Disconnecting will stop all Slack notifications and remove the bot from your workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Disconnect Slack Integration
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
