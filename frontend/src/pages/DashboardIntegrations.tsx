"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Plug,
  Check,
  ExternalLink,
  RefreshCw,
  Settings2,
  ChevronRight,
  Shield,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  BookOpen,
  GitBranch,
  AlertTriangle,
  Lock,
  Database,
  UploadCloud,
  Search,
  ChevronDown,
  LayoutGrid,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/DashboardLayout"
import { JiraWebhookPanel } from "@/components/JiraWebhookPanel"
import { integrationService } from "@/lib/api/integrationService"
import { githubService, type GitHubRepo, type GitHubConflict, type GitHubProjectLink, type GitHubProjectField, type GitHubProjectSyncJob } from "@/lib/api/githubService"
import { issueService } from "@/lib/api/issueService"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// Integration type definition
interface Integration {
  id: string
  name: string
  description: string
  icon: string
  color: string
  gradient: string
  status: 'connected' | 'disconnected' | 'pending'
  lastSync?: string
  features: string[]
  category: 'project-management' | 'communication' | 'version-control'
}

// Integration data
const integrations: Integration[] = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Enterprise-grade bi-directional sync with Atlassian Jira for seamless project management.',
    icon: '/integrations/jira.svg',
    color: '#0052CC',
    gradient: 'from-blue-500 to-blue-600',
    status: 'disconnected',
    features: [
      'OAuth 2.0 secure authentication',
      'Real-time bi-directional sync (<30s)',
      'Full CRUD on issues, epics, sprints',
      'AI-powered epic decomposition',
      'Advanced JQL search support',
      'Custom field mapping'
    ],
    category: 'project-management'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Keep your team in sync with intelligent notifications and project updates in Slack.',
    icon: '/integrations/slack.svg',
    color: '#4A154B',
    gradient: 'from-purple-600 to-fuchsia-600',
    status: 'disconnected',
    features: [
      'Workspace integration via OAuth',
      'Granular notification preferences',
      'Channel mapping for projects',
      'Bot commands & interactions',
      'Real-time status updates',
      'Thread-based issue discussions'
    ],
    category: 'communication'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Sync issues, track repositories, and resolve conflicts with your GitHub App installation.',
    icon: '/integrations/github.svg',
    color: '#24292F',
    gradient: 'from-slate-700 to-slate-900',
    status: 'disconnected',
    features: [
      'GitHub App installation (private repos)',
      'Bi-directional issue sync',
      'Repository discovery & management',
      'Webhook-driven real-time updates',
      'Conflict detection & resolution',
      'GitHub Projects v2 linking'
    ],
    category: 'version-control'
  }
]

// ============================================================
// GitHub Panel — shown when GitHub is connected
// ============================================================

function GitHubPanel({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false)
  const [selectedConflict, setSelectedConflict] = React.useState<GitHubConflict | null>(null)
  const [pushOpen, setPushOpen] = React.useState(false)
  const [selectedIssueIds, setSelectedIssueIds] = React.useState<Set<string>>(new Set())
  const [selectedRepoId, setSelectedRepoId] = React.useState<number | null>(null)
  const [issueSearch, setIssueSearch] = React.useState('')

  const { data: repos = [], isLoading: reposLoading, refetch: refetchRepos } = useQuery({
    queryKey: ['github-repos', workspaceId],
    queryFn: () => githubService.listRepos(workspaceId),
    enabled: !!workspaceId,
  })

  const { data: conflicts = [], refetch: refetchConflicts } = useQuery({
    queryKey: ['github-conflicts', workspaceId],
    queryFn: () => githubService.listConflicts(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  })

  const refreshRepos = useMutation({
    mutationFn: () => githubService.refreshRepos(workspaceId),
    onSuccess: (data) => {
      toast.success(`Refreshed ${data.count} repositories`)
      queryClient.invalidateQueries({ queryKey: ['github-repos', workspaceId] })
    },
    onError: () => toast.error('Failed to refresh repositories'),
  })

  const resolveConflict = useMutation({
    mutationFn: ({ conflictId, resolution }: { conflictId: string; resolution: 'local' | 'github' }) =>
      githubService.resolveConflict(workspaceId, conflictId, resolution),
    onSuccess: (_, vars) => {
      toast.success(`Conflict resolved — kept ${vars.resolution === 'local' ? 'local' : 'GitHub'} version`)
      queryClient.invalidateQueries({ queryKey: ['github-conflicts', workspaceId] })
      setConflictDialogOpen(false)
      setSelectedConflict(null)
    },
    onError: () => toast.error('Failed to resolve conflict'),
  })

  // Issues for push
  const { data: issuesData } = useQuery({
    queryKey: ['workspace-issues-for-push', workspaceId],
    queryFn: () => issueService.listIssues({ workspace_id: workspaceId, limit: 100 }),
    enabled: pushOpen,
  })
  const allIssues = issuesData?.items ?? []
  const filteredIssues = issueSearch
    ? allIssues.filter(i =>
        i.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
        i.issue_key.toLowerCase().includes(issueSearch.toLowerCase())
      )
    : allIssues

  const pushIssues = useMutation({
    mutationFn: () =>
      githubService.pushIssues(workspaceId, Array.from(selectedIssueIds), selectedRepoId ?? undefined),
    onSuccess: (results) => {
      const created = results.filter(r => r.action === 'created').length
      const updated = results.filter(r => r.action === 'updated').length
      const errors = results.filter(r => r.error).length
      toast.success(`Push complete: ${created} created, ${updated} updated${errors ? `, ${errors} errors` : ''}`)
      setSelectedIssueIds(new Set())
      setPushOpen(false)
    },
    onError: () => toast.error('Failed to push issues to GitHub'),
  })

  const toggleIssue = (id: string) => {
    setSelectedIssueIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIssueIds.size === filteredIssues.length) {
      setSelectedIssueIds(new Set())
    } else {
      setSelectedIssueIds(new Set(filteredIssues.map(i => i.id)))
    }
  }

  const pendingConflicts = conflicts.filter(c => c.status === 'pending')

  return (
    <Card className="mt-8 border-slate-200">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <GitBranch className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">GitHub Repositories</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Repositories accessible via your GitHub App installation
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingConflicts.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingConflicts.length} conflict{pendingConflicts.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refreshRepos.mutate()}
              disabled={refreshRepos.isPending}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshRepos.isPending && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Conflict Alert */}
        {pendingConflicts.length > 0 && (
          <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>{pendingConflicts.length}</strong> sync conflict{pendingConflicts.length > 1 ? 's' : ''} require your attention.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={() => {
                setSelectedConflict(pendingConflicts[0])
                setConflictDialogOpen(true)
              }}
            >
              Review
            </Button>
          </div>
        )}

        {/* Repository List */}
        {reposLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading repositories…</span>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No repositories found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click <strong>Refresh</strong> to sync from GitHub.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {repos.map((repo) => (
              <div key={repo.github_repo_id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={repo.html_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate"
                  >
                    {repo.full_name}
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {repo.private && (
                    <Badge variant="secondary" className="text-xs gap-1 py-0">
                      <Lock className="h-2.5 w-2.5" />
                      Private
                    </Badge>
                  )}
                  {repo.archived && (
                    <Badge variant="outline" className="text-xs py-0 text-slate-400">
                      Archived
                    </Badge>
                  )}
                  {repo.default_branch && (
                    <span className="text-xs text-slate-400">{repo.default_branch}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Push Issues Section */}
      <div className="border-t border-slate-100">
        <button
          className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => setPushOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-slate-500" />
            Push Issues to GitHub
          </div>
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", pushOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {pushOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4 space-y-3">
                {/* Repo selector — only shown when multiple repos */}
                {repos.length > 1 && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Target repository</label>
                    <select
                      className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={selectedRepoId ?? ''}
                      onChange={e => setSelectedRepoId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Auto-select (first repo)</option>
                      {repos.map(r => (
                        <option key={r.github_repo_id} value={r.github_repo_id}>{r.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search issues…"
                    value={issueSearch}
                    onChange={e => setIssueSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Select all / count */}
                {filteredIssues.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.size === filteredIssues.length && filteredIssues.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                      Select all ({filteredIssues.length})
                    </label>
                    <span>{selectedIssueIds.size} selected</span>
                  </div>
                )}

                {/* Issue list */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {filteredIssues.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No issues found</p>
                  ) : (
                    filteredIssues.map(issue => (
                      <label
                        key={issue.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIssueIds.has(issue.id)}
                          onChange={() => toggleIssue(issue.id)}
                          className="rounded flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono text-slate-400 mr-2">{issue.issue_key}</span>
                          <span className="text-sm text-slate-800 truncate">{issue.title}</span>
                        </div>
                        {issue.status && (
                          <Badge variant="outline" className="text-xs py-0 flex-shrink-0">{issue.status}</Badge>
                        )}
                      </label>
                    ))
                  )}
                </div>

                <Button
                  className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                  disabled={selectedIssueIds.size === 0 || pushIssues.isPending}
                  onClick={() => pushIssues.mutate()}
                >
                  {pushIssues.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Pushing…</>
                  ) : (
                    <><UploadCloud className="h-4 w-4" /> Push {selectedIssueIds.size > 0 ? selectedIssueIds.size : ''} Issue{selectedIssueIds.size !== 1 ? 's' : ''} to GitHub</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Resolve Sync Conflict
            </DialogTitle>
            <DialogDescription>
              Both the local issue and the GitHub issue were modified since the last sync.
              Choose which version to keep.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="grid grid-cols-2 gap-4 my-4">
              {/* Local Version */}
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Local Version</p>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {String(selectedConflict.local_version?.title || '—')}
                </p>
                <p className="text-xs text-slate-600 line-clamp-3">
                  {String(selectedConflict.local_version?.description || 'No description')}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Status: <span className="font-medium">{String(selectedConflict.local_version?.status || '—')}</span>
                </p>
                {selectedConflict.local_updated_at && (
                  <p className="text-xs text-slate-400">
                    Modified: {new Date(selectedConflict.local_updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* GitHub Version */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">GitHub Version</p>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {String(selectedConflict.github_version?.title || '—')}
                </p>
                <p className="text-xs text-slate-600 line-clamp-3">
                  {String(selectedConflict.github_version?.body || 'No description')}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  State: <span className="font-medium">{String(selectedConflict.github_version?.state || '—')}</span>
                </p>
                {selectedConflict.github_updated_at && (
                  <p className="text-xs text-slate-400">
                    Modified: {new Date(selectedConflict.github_updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 text-center mb-2">
            Conflicts remaining: {pendingConflicts.length}
          </p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConflictDialogOpen(false)
                setSelectedConflict(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              disabled={resolveConflict.isPending}
              onClick={() => selectedConflict && resolveConflict.mutate({ conflictId: selectedConflict.id, resolution: 'local' })}
            >
              Keep Local
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white"
              disabled={resolveConflict.isPending}
              onClick={() => selectedConflict && resolveConflict.mutate({ conflictId: selectedConflict.id, resolution: 'github' })}
            >
              {resolveConflict.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Applying…</>
              ) : (
                'Use GitHub Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// GitHub Projects v2 Panel
// ============================================================

function GitHubProjectsPanel({ workspaceId, accountLogin, accountType }: { workspaceId: string; accountLogin: string; accountType: string }) {
  const queryClient = useQueryClient()
  const [pushOpen, setPushOpen] = React.useState(false)
  const [selectedLinkId, setSelectedLinkId] = React.useState<string | null>(null)
  const [selectedIssueIds, setSelectedIssueIds] = React.useState<Set<string>>(new Set())
  const [fieldMappingLinkId, setFieldMappingLinkId] = React.useState<string | null>(null)

  // Discover projects
  const ownerType = (accountType?.toLowerCase() === 'organization' ? 'org' : 'user') as 'org' | 'user'
  const { data: discoveredProjects, isLoading: discoverLoading } = useQuery({
    queryKey: ['github-projects-v2-discover', workspaceId, accountLogin],
    queryFn: () => githubService.discoverProjects(workspaceId, accountLogin, ownerType),
    enabled: !!workspaceId && !!accountLogin,
  })

  // Linked projects (from DB)
  const { data: linkedProjectsRes } = useQuery({
    queryKey: ['github-projects-v2-links', workspaceId],
    queryFn: async () => {
      // We fetch linked projects from the link endpoint.
      // There's no dedicated list endpoint; for now we re-use discover + match.
      return discoveredProjects
    },
    enabled: !!discoveredProjects,
  })

  // Fields for selected project
  const { data: fieldsRes, isLoading: fieldsLoading } = useQuery({
    queryKey: ['github-project-fields', workspaceId, fieldMappingLinkId],
    queryFn: () => githubService.getProjectFields(workspaceId, fieldMappingLinkId!),
    enabled: !!fieldMappingLinkId,
  })

  // Sync status for selected project
  const { data: syncStatusRes } = useQuery({
    queryKey: ['github-project-sync-status', workspaceId, selectedLinkId],
    queryFn: () => githubService.getProjectSyncStatus(workspaceId, selectedLinkId!),
    enabled: !!selectedLinkId,
    refetchInterval: 10000,
  })
  const syncJob = syncStatusRes?.sync_job

  // Link project mutation
  const linkProject = useMutation({
    mutationFn: (project: { id: string; number: number; title: string; url: string }) =>
      githubService.linkProject(workspaceId, {
        owner_login: accountLogin,
        owner_type: ownerType,
        project_number: project.number,
        project_node_id: project.id,
        title: project.title,
        url: project.url,
      }),
    onSuccess: () => {
      toast.success('Project linked successfully')
      queryClient.invalidateQueries({ queryKey: ['github-projects-v2-discover', workspaceId] })
    },
    onError: () => toast.error('Failed to link project'),
  })

  // Sync mutation
  const syncProject = useMutation({
    mutationFn: (linkId: string) => githubService.syncProject(workspaceId, linkId),
    onSuccess: (data) => {
      toast.success(`Sync complete: ${data.updated} updated, ${data.pushed} pushed, ${data.conflicts} conflicts`)
      queryClient.invalidateQueries({ queryKey: ['github-project-sync-status', workspaceId] })
    },
    onError: () => toast.error('Sync failed'),
  })

  // Push items mutation
  const pushItems = useMutation({
    mutationFn: () => {
      if (!selectedLinkId) throw new Error('No project selected')
      return githubService.pushItemsToProject(workspaceId, selectedLinkId, Array.from(selectedIssueIds))
    },
    onSuccess: (data) => {
      const created = data.results.filter(r => r.action === 'created').length
      const updated = data.results.filter(r => r.action === 'updated').length
      const errors = data.results.filter(r => r.error).length
      toast.success(`Push complete: ${created} created, ${updated} updated${errors ? `, ${errors} errors` : ''}`)
      setSelectedIssueIds(new Set())
      setPushOpen(false)
    },
    onError: () => toast.error('Failed to push items'),
  })

  // Issues for push
  const { data: issuesData } = useQuery({
    queryKey: ['workspace-issues-for-project-push', workspaceId],
    queryFn: () => issueService.listIssues({ workspace_id: workspaceId, limit: 100 }),
    enabled: pushOpen,
  })
  const allIssues = issuesData?.items ?? []

  const projects = discoveredProjects?.projects ?? []

  const syncStatusBadge = (job: GitHubProjectSyncJob | null | undefined) => {
    if (!job) return <Badge variant="outline" className="text-xs">No sync</Badge>
    if (job.status === 'in_progress') return <Badge className="text-xs bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 animate-spin mr-1" />Syncing</Badge>
    if (job.status === 'success') return <Badge className="text-xs bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>
    if (job.status === 'partial') return <Badge className="text-xs bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>
    return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
  }

  return (
    <Card className="mt-4 border-slate-200">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <LayoutGrid className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">GitHub Projects v2</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Bidirectional field sync with GitHub Projects boards
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {discoverLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Discovering projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <LayoutGrid className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No GitHub Projects v2 found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Create a project in GitHub and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  selectedLinkId === project.id
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutGrid className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <a
                      href={project.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block"
                    >
                      {project.title}
                    </a>
                    <span className="text-xs text-slate-400">#{project.number}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {project.closed && (
                    <Badge variant="outline" className="text-xs py-0 text-slate-400">Closed</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => linkProject.mutate(project)}
                    disabled={linkProject.isPending}
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedLinkId(project.id)
                      setPushOpen(true)
                    }}
                  >
                    <UploadCloud className="h-3 w-3 mr-1" />
                    Push Items
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setFieldMappingLinkId(project.id)}
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Fields
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => {
                      setSelectedLinkId(project.id)
                      syncProject.mutate(project.id)
                    }}
                    disabled={syncProject.isPending}
                  >
                    <RefreshCw className={cn("h-3 w-3", syncProject.isPending && "animate-spin")} />
                    Sync
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sync status */}
        {selectedLinkId && syncJob && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Latest Sync</span>
              {syncStatusBadge(syncJob)}
            </div>
            {syncJob.completed_at && (
              <p className="text-xs text-slate-400 mt-1">
                Completed: {new Date(syncJob.completed_at).toLocaleString()}
              </p>
            )}
            {syncJob.items_processed > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {syncJob.items_created} created, {syncJob.items_updated} updated, {syncJob.items_failed} failed
              </p>
            )}
            {syncJob.error_message && (
              <p className="text-xs text-red-500 mt-1">{syncJob.error_message}</p>
            )}
          </div>
        )}

        {/* Field definitions viewer */}
        {fieldMappingLinkId && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Project Fields</span>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setFieldMappingLinkId(null)}>
                Close
              </Button>
            </div>
            {fieldsLoading ? (
              <div className="flex items-center gap-2 py-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading fields…</span>
              </div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(fieldsRes?.fields ?? []).map((field) => (
                  <div key={field.id} className="flex items-center justify-between py-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{field.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{field.dataType}</Badge>
                    </div>
                    {field.options && (
                      <span className="text-slate-400">{field.options.length} option{field.options.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Push items to project */}
        <AnimatePresence>
          {pushOpen && selectedLinkId && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-4"
            >
              <div className="p-3 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Push Issues as Project Items</span>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setPushOpen(false)}>
                    Close
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {allIssues.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No issues found</p>
                  ) : (
                    allIssues.map(issue => (
                      <label
                        key={issue.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIssueIds.has(issue.id)}
                          onChange={() => {
                            setSelectedIssueIds(prev => {
                              const next = new Set(prev)
                              if (next.has(issue.id)) next.delete(issue.id)
                              else next.add(issue.id)
                              return next
                            })
                          }}
                          className="rounded flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono text-slate-400 mr-2">{issue.issue_key}</span>
                          <span className="text-sm text-slate-800 truncate">{issue.title}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <Button
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={selectedIssueIds.size === 0 || pushItems.isPending}
                  onClick={() => pushItems.mutate()}
                >
                  {pushItems.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Pushing…</>
                  ) : (
                    <><UploadCloud className="h-4 w-4" /> Push {selectedIssueIds.size} Item{selectedIssueIds.size !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Integration Card Component
// ============================================================

const IntegrationCard = React.memo(({
  integration,
  onConnect,
  onDisconnect,
  onConfigure
}: {
  integration: Integration
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
  onConfigure: (id: string) => void
}) => {
  const [showFeatures, setShowFeatures] = React.useState(false)

  const statusConfig = {
    connected: {
      label: 'Connected',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200'
    },
    disconnected: {
      label: 'Not Connected',
      icon: XCircle,
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      border: 'border-slate-200'
    },
    pending: {
      label: 'Connecting...',
      icon: Loader2,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    }
  }

  const status = statusConfig[integration.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 border-slate-200",
        "hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300",
        integration.status === 'connected' && "ring-1 ring-emerald-500/20"
      )}>
        {/* Gradient accent bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          integration.gradient
        )} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Integration Logo */}
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br shadow-md",
                integration.gradient
              )}>
                {integration.id === 'jira' ? (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
                  </svg>
                ) : integration.id === 'slack' ? (
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                ) : integration.id === 'github' ? (
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                ) : (
                  <span className="text-white font-bold text-xl">
                    {integration.name.charAt(0)}
                  </span>
                )}
              </div>

              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {integration.name}
                </CardTitle>
                <div className={cn(
                  "inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  status.bg, status.border, status.color, "border"
                )}>
                  <StatusIcon className={cn(
                    "h-3 w-3",
                    integration.status === 'pending' && "animate-spin"
                  )} />
                  {status.label}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {integration.status === 'connected' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-600"
                      onClick={() => onConfigure(integration.id)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Configure</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <CardDescription className="text-slate-600 text-sm leading-relaxed">
            {integration.description}
          </CardDescription>

          {/* Last Sync Info */}
          {integration.status === 'connected' && integration.lastSync && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="h-3 w-3" />
              <span>Last synced: {integration.lastSync}</span>
            </div>
          )}

          {/* Features Toggle */}
          <div>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
            >
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                showFeatures && "rotate-90"
              )} />
              View features
            </button>

            <AnimatePresence>
              {showFeatures && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-3 space-y-2 pl-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {integration.status === 'connected' ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => onConfigure(integration.id)}
                >
                  <Settings2 className="h-4 w-4" />
                  Configure
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disconnect {integration.name}?</DialogTitle>
                      <DialogDescription>
                        This will remove the connection to {integration.name}. You can reconnect at any time.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={() => onDisconnect(integration.id)}
                      >
                        Disconnect
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Button
                className={cn(
                  "flex-1 gap-2 text-white shadow-md hover:shadow-lg transition-all",
                  "bg-gradient-to-r", integration.gradient
                )}
                onClick={() => onConnect(integration.id)}
                disabled={integration.status === 'pending'}
              >
                {integration.status === 'pending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

IntegrationCard.displayName = 'IntegrationCard'

// ============================================================
// Main Dashboard Integrations Page
// ============================================================

export default function DashboardIntegrations() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [integrationsState, setIntegrationsState] = React.useState(integrations)
  const [filter, setFilter] = React.useState<'all' | 'connected' | 'disconnected'>('all')
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspace()

  // ── Jira ────────────────────────────────────────────────────
  const { data: jiraStatus, isLoading: jiraLoading } = useQuery({
    queryKey: ['jira-oauth-status'],
    queryFn: () => integrationService.getJiraOAuthStatus(),
    refetchInterval: 5000,
  })

  React.useEffect(() => {
    if (jiraStatus) {
      setIntegrationsState(prev =>
        prev.map(i => {
          if (i.id === 'jira') {
            return {
              ...i,
              status: jiraStatus.is_connected ? 'connected' : 'disconnected',
              lastSync: jiraStatus.last_tested_at
                ? new Date(jiraStatus.last_tested_at).toLocaleString()
                : undefined
            }
          }
          return i
        })
      )
    }
  }, [jiraStatus])

  const disconnectJira = useMutation({
    mutationFn: () => integrationService.disconnectJira(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-oauth-status'] })
      toast.success('Jira disconnected successfully')
    },
    onError: () => toast.error('Failed to disconnect Jira'),
  })

  // ── GitHub ───────────────────────────────────────────────────
  const { data: githubStatus } = useQuery({
    queryKey: ['github-status', activeWorkspaceId],
    queryFn: () => githubService.getStatus(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    refetchInterval: 8000,
  })

  React.useEffect(() => {
    if (githubStatus) {
      setIntegrationsState(prev =>
        prev.map(i => {
          if (i.id === 'github') {
            return {
              ...i,
              status: githubStatus.is_connected ? 'connected' : 'disconnected',
              lastSync: githubStatus.created_at
                ? new Date(githubStatus.created_at).toLocaleString()
                : undefined,
            }
          }
          return i
        })
      )
    }
  }, [githubStatus])

  // Handle ?github_installed=1 redirect from GitHub App setup callback
  React.useEffect(() => {
    if (searchParams.get('github_installed') === '1') {
      toast.success('GitHub connected! Refreshing status…')
      queryClient.invalidateQueries({ queryKey: ['github-status', activeWorkspaceId] })
      // Clean up the query param without a full reload
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
      // Auto-refresh repos
      if (activeWorkspaceId) {
        githubService.refreshRepos(activeWorkspaceId).catch(() => null)
      }
    }
  }, [searchParams, activeWorkspaceId, queryClient])

  const disconnectGitHub = useMutation({
    mutationFn: () => githubService.disconnect(activeWorkspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-status', activeWorkspaceId] })
      queryClient.invalidateQueries({ queryKey: ['github-repos', activeWorkspaceId] })
      toast.success('GitHub disconnected')
    },
    onError: () => toast.error('Failed to disconnect GitHub'),
  })

  // ── Slack ────────────────────────────────────────────────────
  const { data: slackStatus } = useQuery({
    queryKey: ['slack-status', activeWorkspaceId],
    queryFn: () => integrationService.getSlackStatus(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    refetchInterval: 8000,
  })

  React.useEffect(() => {
    if (slackStatus) {
      setIntegrationsState(prev =>
        prev.map(i => {
          if (i.id === 'slack') {
            return {
              ...i,
              status: slackStatus.is_connected ? 'connected' : 'disconnected',
              lastSync: slackStatus.last_sync_at
                ? new Date(slackStatus.last_sync_at).toLocaleString()
                : undefined,
            }
          }
          return i
        })
      )
    }
  }, [slackStatus])

  // Handle ?slack_success=true or ?slack_error=... redirect from Slack OAuth callback
  React.useEffect(() => {
    if (searchParams.get('slack_success') === 'true') {
      toast.success('Slack connected successfully!')
      queryClient.invalidateQueries({ queryKey: ['slack-status', activeWorkspaceId] })
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    } else if (searchParams.get('slack_error')) {
      const detail = searchParams.get('detail')
      const errMsg = detail ? decodeURIComponent(detail) : searchParams.get('slack_error')
      toast.error(`Slack connection failed: ${errMsg}`, { duration: 8000 })
      console.error('[Slack OAuth Error]', searchParams.get('slack_error'), detail)
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams, activeWorkspaceId, queryClient])

  const disconnectSlack = useMutation({
    mutationFn: () => integrationService.disconnectSlack(activeWorkspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-status', activeWorkspaceId] })
      toast.success('Slack disconnected successfully')
    },
    onError: () => toast.error('Failed to disconnect Slack'),
  })

  // ── Connect / Disconnect handlers ───────────────────────────
  const handleConnect = React.useCallback(async (id: string) => {
    if (id === 'jira') {
      try {
        const response = await integrationService.initJiraOAuth()
        window.location.href = response.authorization_url
      } catch {
        toast.error('Failed to connect to Jira')
      }
    } else if (id === 'github') {
      if (!activeWorkspaceId) {
        toast.error('No active workspace selected')
        return
      }
      setIntegrationsState(prev =>
        prev.map(i => i.id === 'github' ? { ...i, status: 'pending' as const } : i)
      )
      try {
        const { install_url } = await githubService.getInstallUrl(activeWorkspaceId)
        window.location.href = install_url
      } catch (err: unknown) {
        setIntegrationsState(prev =>
          prev.map(i => i.id === 'github' ? { ...i, status: 'disconnected' as const } : i)
        )
        const msg = err instanceof Error ? err.message : 'Failed to connect to GitHub'
        toast.error(msg)
      }
    } else if (id === 'slack') {
      if (!activeWorkspaceId) {
        toast.error('No active workspace selected')
        return
      }
      setIntegrationsState(prev =>
        prev.map(i => i.id === 'slack' ? { ...i, status: 'pending' as const } : i)
      )
      try {
        const response = await integrationService.initSlackOAuth(activeWorkspaceId)
        window.location.href = response.authorization_url
      } catch (err: unknown) {
        setIntegrationsState(prev =>
          prev.map(i => i.id === 'slack' ? { ...i, status: 'disconnected' as const } : i)
        )
        const msg = err instanceof Error ? err.message : 'Failed to connect to Slack'
        toast.error(msg)
      }
    } else {
      toast.info(`${id} integration coming soon`)
    }
  }, [activeWorkspaceId])

  const handleDisconnect = React.useCallback((id: string) => {
    if (id === 'jira') {
      disconnectJira.mutate()
    } else if (id === 'github') {
      disconnectGitHub.mutate()
    } else if (id === 'slack') {
      disconnectSlack.mutate()
    }
  }, [disconnectJira, disconnectGitHub, disconnectSlack])

  const handleConfigure = React.useCallback((id: string) => {
    if (id === 'jira') {
      navigate('/dashboard/integrations/jira/settings')
    } else if (id === 'slack') {
      navigate('/dashboard/integrations/slack/settings')
    } else {
      toast.info('Settings page coming soon for ' + id)
    }
  }, [navigate])

  const filteredIntegrations = React.useMemo(() => {
    if (filter === 'all') return integrationsState
    return integrationsState.filter(i => i.status === filter)
  }, [integrationsState, filter])

  const stats = React.useMemo(() => ({
    total: integrationsState.length,
    connected: integrationsState.filter(i => i.status === 'connected').length,
    available: integrationsState.filter(i => i.status === 'disconnected').length
  }), [integrationsState])

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                    <Plug className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
                </div>
                <p className="text-slate-600 max-w-2xl">
                  Connect your favorite tools to streamline your workflow. All integrations use secure OAuth 2.0 authentication.
                </p>
              </div>

              {/* Stats Pills */}
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Connected</span>
                  <p className="text-lg font-semibold text-emerald-600">{stats.connected}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Available</span>
                  <p className="text-lg font-semibold text-slate-700">{stats.available}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="p-2 rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">Enterprise-Grade Security</h3>
                <p className="text-sm text-slate-600">
                  All credentials are encrypted at rest using AES-256-GCM. Tokens auto-refresh and we never store passwords.
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Real-time sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>&lt;30s latency</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex gap-2 mb-6"
          >
            {[
              { key: 'all', label: 'All Integrations' },
              { key: 'connected', label: 'Connected' },
              { key: 'disconnected', label: 'Available' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  filter === tab.key
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Integration Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onConfigure={handleConfigure}
              />
            ))}
          </div>

          {/* Jira Webhook Panel — shown when Jira is connected */}
          {jiraStatus?.is_connected && jiraStatus.integration_id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <JiraWebhookPanel integrationId={jiraStatus.integration_id} />
            </motion.div>
          )}

          {/* Slack Panel — shown when Slack is connected */}
          {slackStatus?.is_connected && activeWorkspaceId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="mt-8 border-purple-200">
                <CardHeader className="pb-4 border-b border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#4A154B">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Slack Workspace</CardTitle>
                        <CardDescription className="text-sm text-slate-500">
                          {slackStatus.slack_workspace_name || 'Connected workspace'}
                          {slackStatus.default_channel_name && ` • #${slackStatus.default_channel_name}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate('/dashboard/integrations/slack/settings')}
                      >
                        <Settings2 className="h-4 w-4" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Notifications</p>
                      <p className="text-sm font-medium text-slate-900">
                        {slackStatus.notifications_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Bot Commands</p>
                      <p className="text-sm font-medium text-slate-900">
                        {slackStatus.slash_commands_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Scopes</p>
                      <p className="text-sm font-medium text-slate-900">
                        {slackStatus.scopes?.length || 0} granted
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Last Sync</p>
                      <p className="text-sm font-medium text-slate-900">
                        {slackStatus.last_sync_at ? new Date(slackStatus.last_sync_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* GitHub Panel — shown when GitHub is connected */}
          {githubStatus?.is_connected && activeWorkspaceId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GitHubPanel workspaceId={activeWorkspaceId} />
              {githubStatus.account_login && (
                <GitHubProjectsPanel
                  workspaceId={activeWorkspaceId}
                  accountLogin={githubStatus.account_login}
                  accountType={githubStatus.account_type ?? 'user'}
                />
              )}
            </motion.div>
          )}

          {/* Empty State */}
          {filteredIntegrations.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Plug className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No integrations found
              </h3>
              <p className="text-slate-600 mb-4">
                {filter === 'connected'
                  ? "You haven't connected any integrations yet."
                  : "All integrations are currently connected."}
              </p>
              <Button
                variant="outline"
                onClick={() => setFilter('all')}
              >
                View All Integrations
              </Button>
            </motion.div>
          )}

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-12 p-6 rounded-xl bg-white border border-slate-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <AlertCircle className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Need help with integrations?</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Check out our documentation for step-by-step guides on setting up each integration.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate('/docs')}
                  >
                    <BookOpen className="h-4 w-4" />
                    Documentation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate('/support')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
    </DashboardLayout>
  )
}
