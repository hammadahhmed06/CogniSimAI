import * as React from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Webhook, 
  RefreshCw, 
  Settings2, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Upload,
  Zap,
  Shield,
  Database,
  Link2,
  Activity,
  AlertTriangle
} from "lucide-react"
import { DashboardLayout } from "@/components/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JiraWebhookPanel } from "@/components/JiraWebhookPanel"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { integrationService } from "@/lib/api/integrationService"
import { jiraService } from "@/lib/api/jiraService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function JiraSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Jira status
  const { data: jiraStatus, isLoading } = useQuery({
    queryKey: ['jira-oauth-status'],
    queryFn: () => integrationService.getJiraOAuthStatus(),
    refetchInterval: 10000,
  })

  // Fetch sync preferences
  const { data: syncPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['jira-sync-preferences', jiraStatus?.integration_id],
    queryFn: () => jiraService.getSyncPreferences(jiraStatus!.integration_id!),
    enabled: !!jiraStatus?.integration_id,
  })

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: Record<string, boolean | number | string[]>) =>
      jiraService.updateSyncPreferences(jiraStatus!.integration_id!, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-sync-preferences'] })
      toast.success("Settings updated successfully")
    },
    onError: () => {
      toast.error("Failed to update settings")
    }
  })

  // Import projects mutation
  const importProjectsMutation = useMutation({
    mutationFn: () => jiraService.importProjects(jiraStatus!.integration_id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success(data.message)
    },
    onError: () => {
      toast.error("Failed to import projects")
    }
  })

  // Import issues mutation
  const importIssuesMutation = useMutation({
    mutationFn: () => jiraService.importIssues(jiraStatus!.integration_id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      toast.success(data.message)
    },
    onError: () => {
      toast.error("Failed to import issues")
    }
  })

  // Export issues mutation
  const exportIssuesMutation = useMutation({
    mutationFn: () => jiraService.exportIssues(jiraStatus!.integration_id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      toast.success(data.message)
    },
    onError: () => {
      toast.error("Failed to export issues")
    }
  })

  // Force resync mutation
  const forceResyncMutation = useMutation({
    mutationFn: () => jiraService.forceResync(jiraStatus!.integration_id!),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: () => {
      toast.error("Failed to force resync")
    }
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => integrationService.disconnectJira(),
    onSuccess: () => {
      toast.success("Jira disconnected successfully")
      queryClient.invalidateQueries({ queryKey: ['jira-oauth-status'] })
      navigate('/dashboard/integrations')
    },
    onError: () => {
      toast.error("Failed to disconnect Jira")
    }
  })

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect Jira? This will stop all syncing.")) {
      disconnectMutation.mutate()
    }
  }

  const handleToggleSetting = (setting: string, value: boolean) => {
    updatePrefsMutation.mutate({ [setting]: value })
  }

  if (isLoading || prefsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!jiraStatus?.is_connected) {
    navigate('/dashboard/integrations')
    return null
  }

  const preferences = syncPrefs?.preferences

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Jira Settings</h1>
                  <p className="text-sm text-slate-600">Configure your Jira integration</p>
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
        </div>

        {/* Connection Status Card */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-emerald-900">Connected to Jira</CardTitle>
                  <CardDescription className="text-emerald-700">
                    {jiraStatus.site_url || "Jira Cloud"}
                  </CardDescription>
                </div>
              </div>
              {jiraStatus.last_tested_at && (
                <Badge variant="outline" className="gap-2 border-emerald-600 text-emerald-700">
                  <Clock className="h-3 w-3" />
                  Last checked: {new Date(jiraStatus.last_tested_at).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Settings
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Sync Settings Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  Synchronization
                </CardTitle>
                <CardDescription>
                  Configure how data syncs between Jira and CogniSim AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Auto-sync Issues</Label>
                    <p className="text-sm text-slate-600">
                      Automatically sync Jira issues to your workspace
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.auto_sync_enabled ?? true}
                    onCheckedChange={(checked) => handleToggleSetting('auto_sync_enabled', checked)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Real-time Updates</Label>
                    <p className="text-sm text-slate-600">
                      Push changes to Jira in real-time via webhooks
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.real_time_updates_enabled ?? true}
                    onCheckedChange={(checked) => handleToggleSetting('real_time_updates_enabled', checked)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Bi-directional Sync</Label>
                    <p className="text-sm text-slate-600">
                      Allow changes from both Jira and CogniSim AI
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.bidirectional_sync_enabled ?? true}
                    onCheckedChange={(checked) => handleToggleSetting('bidirectional_sync_enabled', checked)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Sync Comments</Label>
                    <p className="text-sm text-slate-600">
                      Include comments in issue synchronization
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.sync_comments_enabled ?? false}
                    onCheckedChange={(checked) => handleToggleSetting('sync_comments_enabled', checked)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Sync Actions
                </CardTitle>
                <CardDescription>
                  Manual sync operations for projects and issues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => navigate('/dashboard/jira-conflicts')}
                >
                  <AlertTriangle className="h-4 w-4" />
                  View Sync Conflicts
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => importProjectsMutation.mutate()}
                  disabled={importProjectsMutation.isPending}
                >
                  {importProjectsMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {importProjectsMutation.isPending ? 'Importing...' : 'Import Projects from Jira'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => importIssuesMutation.mutate()}
                  disabled={importIssuesMutation.isPending}
                >
                  {importIssuesMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {importIssuesMutation.isPending ? 'Importing...' : 'Import Issues from Jira'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => {
                    if (window.confirm('This will export local issues to Jira. Continue?')) {
                      exportIssuesMutation.mutate()
                    }
                  }}
                  disabled={exportIssuesMutation.isPending}
                >
                  {exportIssuesMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {exportIssuesMutation.isPending ? 'Exporting...' : 'Export Issues to Jira'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => {
                    if (window.confirm('This will re-sync all Jira data. This may take some time. Continue?')) {
                      forceResyncMutation.mutate()
                    }
                  }}
                  disabled={forceResyncMutation.isPending}
                >
                  {forceResyncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {forceResyncMutation.isPending ? 'Syncing...' : 'Force Full Resync'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <JiraWebhookPanel integrationId={jiraStatus.integration_id!} />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Security & Authentication
                </CardTitle>
                <CardDescription>
                  Manage OAuth tokens and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">OAuth Connection</p>
                    <p className="text-sm text-slate-600">Securely connected via OAuth 2.0</p>
                  </div>
                  <Badge className="bg-emerald-500">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">Cloud ID</p>
                    <p className="text-sm text-slate-600 font-mono">{jiraStatus.cloud_id}</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2 hover:bg-slate-50 hover:text-slate-900">
                  <Link2 className="h-4 w-4" />
                  Refresh OAuth Token
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Integration Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Integration ID</p>
                    <p className="text-sm font-mono text-slate-900">{jiraStatus.integration_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Status</p>
                    <Badge className="bg-emerald-500">{jiraStatus.connection_status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Site URL</p>
                    <a 
                      href={jiraStatus.site_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {jiraStatus.site_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
