import * as React from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  GitMerge,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { DashboardLayout } from "@/components/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { integrationService } from "@/lib/api/integrationService"
import { jiraService } from "@/lib/api/jiraService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type Conflict = {
  id: string
  issue_id: string
  issue_key: string
  conflict_type: string
  conflicting_fields: string[]
  local_version: {
    title: string
    status: string
    priority?: string
  }
  jira_version: {
    title: string
    status: string
    priority?: string
  }
  local_updated_at: string
  jira_updated_at: string
  detected_at: string
  status: string
}

export default function JiraConflicts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedConflict, setSelectedConflict] = React.useState<Conflict | null>(null)
  const [resolution, setResolution] = React.useState<"use_local" | "use_jira" | "merge">("use_local")
  const [expandedConflict, setExpandedConflict] = React.useState<string | null>(null)

  // Fetch Jira status
  const { data: jiraStatus } = useQuery({
    queryKey: ['jira-oauth-status'],
    queryFn: () => integrationService.getJiraOAuthStatus(),
  })

  // Fetch conflicts
  const { data: conflictsData, isLoading: conflictsLoading, refetch } = useQuery({
    queryKey: ['jira-conflicts', jiraStatus?.integration_id],
    queryFn: async () => {
      if (!jiraStatus?.integration_id) return { conflicts: [], count: 0 }
      
      const response = await fetch(
        `/api/jira/conflicts/${jiraStatus.integration_id}/list?status=pending`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch conflicts')
      return response.json()
    },
    enabled: !!jiraStatus?.integration_id,
    refetchInterval: 30000, // Refresh every 30s
  })

  // Detect conflicts mutation
  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!jiraStatus?.integration_id) throw new Error('No integration')
      
      const response = await fetch(
        `/api/jira/conflicts/${jiraStatus.integration_id}/detect`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to detect conflicts')
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Detected ${data.count} conflicts`)
      queryClient.invalidateQueries({ queryKey: ['jira-conflicts'] })
      refetch()
    },
    onError: () => {
      toast.error("Failed to detect conflicts")
    }
  })

  // Resolve conflict mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ conflictId, method }: { conflictId: string, method: string }) => {
      if (!jiraStatus?.integration_id) throw new Error('No integration')
      
      const response = await fetch(
        `/api/jira/conflicts/${jiraStatus.integration_id}/resolve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conflict_id: conflictId,
            resolution: method,
          }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to resolve conflict')
      return response.json()
    },
    onSuccess: () => {
      toast.success("Conflict resolved successfully")
      setSelectedConflict(null)
      queryClient.invalidateQueries({ queryKey: ['jira-conflicts'] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      refetch()
    },
    onError: () => {
      toast.error("Failed to resolve conflict")
    }
  })

  const conflicts = conflictsData?.conflicts || []
  const conflictsCount = conflictsData?.count || 0

  if (!jiraStatus?.is_connected) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card>
            <CardHeader>
              <CardTitle>Jira Not Connected</CardTitle>
              <CardDescription>
                Please connect your Jira account first
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard/integrations')}>
                Go to Integrations
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/integrations/jira/settings')}
              className="hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sync Conflicts</h1>
              <p className="text-sm text-slate-600">Resolve conflicts between local and Jira data</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
            >
              {detectMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Detect Conflicts
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <Card className={conflictsCount > 0 ? "border-orange-200 bg-orange-50/50" : "border-emerald-200 bg-emerald-50/50"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {conflictsCount > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                )}
                <div>
                  <CardTitle className={conflictsCount > 0 ? "text-orange-900" : "text-emerald-900"}>
                    {conflictsCount > 0 ? `${conflictsCount} Pending Conflicts` : 'No Conflicts'}
                  </CardTitle>
                  <CardDescription className={conflictsCount > 0 ? "text-orange-700" : "text-emerald-700"}>
                    {conflictsCount > 0 ? 'Review and resolve conflicts below' : 'All data is in sync'}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Conflicts List */}
        {conflictsLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Loading conflicts...</p>
            </CardContent>
          </Card>
        ) : conflicts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear!</h3>
              <p className="text-slate-600">No conflicts detected. Your data is in sync.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <Card key={conflict.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{conflict.issue_key}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {conflict.conflicting_fields.join(', ')}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">
                          Conflicting fields: {conflict.conflicting_fields.join(', ')}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Local: {new Date(conflict.local_updated_at).toLocaleString()}</span>
                          <span>Jira: {new Date(conflict.jira_updated_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExpandedConflict(expandedConflict === conflict.id ? null : conflict.id)
                        }}
                      >
                        {expandedConflict === conflict.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedConflict(conflict)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedConflict === conflict.id && (
                  <CardContent className="pt-0 border-t">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-900">Local Version</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-slate-600">Title:</span> {conflict.local_version.title}</div>
                          <div><span className="text-slate-600">Status:</span> {conflict.local_version.status}</div>
                          {conflict.local_version.priority && (
                            <div><span className="text-slate-600">Priority:</span> {conflict.local_version.priority}</div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-900">Jira Version</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-slate-600">Title:</span> {conflict.jira_version.title}</div>
                          <div><span className="text-slate-600">Status:</span> {conflict.jira_version.status}</div>
                          {conflict.jira_version.priority && (
                            <div><span className="text-slate-600">Priority:</span> {conflict.jira_version.priority}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Resolution Dialog */}
        <Dialog open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Resolve Conflict: {selectedConflict?.issue_key}</DialogTitle>
              <DialogDescription>
                Choose which version to keep or merge the changes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as "use_local" | "use_jira" | "merge")}>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50">
                  <RadioGroupItem value="use_local" id="local" />
                  <Label htmlFor="local" className="flex-1 cursor-pointer">
                    <div className="font-semibold mb-1">Use Local Version</div>
                    <div className="text-sm text-slate-600">
                      Keep the local changes and update Jira
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50">
                  <RadioGroupItem value="use_jira" id="jira" />
                  <Label htmlFor="jira" className="flex-1 cursor-pointer">
                    <div className="font-semibold mb-1">Use Jira Version</div>
                    <div className="text-sm text-slate-600">
                      Discard local changes and use Jira data
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50">
                  <RadioGroupItem value="merge" id="merge" disabled />
                  <Label htmlFor="merge" className="flex-1 cursor-pointer opacity-50">
                    <div className="font-semibold mb-1 flex items-center gap-2">
                      <GitMerge className="h-4 w-4" />
                      Merge Changes (Coming Soon)
                    </div>
                    <div className="text-sm text-slate-600">
                      Manually merge both versions
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedConflict(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedConflict) {
                    resolveMutation.mutate({
                      conflictId: selectedConflict.id,
                      method: resolution,
                    })
                  }
                }}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                Resolve Conflict
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
