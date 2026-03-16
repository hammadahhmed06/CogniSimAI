import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Download, LayoutDashboard, RefreshCw, Search, Users, Activity as ActivityIcon, Filter } from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useProject } from '@/contexts/ProjectHooks'
import { projectService } from '@/lib/api/projectService'
import { membersService } from '@/lib/api/membersService'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type ActivityRecord = Awaited<ReturnType<typeof projectService.listProjectActivity>>[number]

const datePresets = [
  { label: '24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: 'All time', value: 'all', ms: undefined },
] as const

type DatePresetValue = (typeof datePresets)[number]['value']

export default function ProjectActivityPage() {
  const { projectId: routeProjectId } = useParams()
  const { projectId: resolvedProjectId, project } = useProject()
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<DatePresetValue>('7d')
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const [actorFilter, setActorFilter] = useState<string | null>(null)

  const activityQuery = useQuery({
    queryKey: ['project-activity', resolvedProjectId],
    enabled: Boolean(resolvedProjectId),
    queryFn: () => projectService.listProjectActivity(resolvedProjectId!, 200),
    staleTime: 30_000,
  })

  const membersQuery = useQuery({
    queryKey: ['project-members'],
    queryFn: () => membersService.list({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const actorDirectory = useMemo(() => {
    const map = new Map<string, string>()
    membersQuery.data?.items.forEach((member) => {
      if (member.user_id) {
        map.set(member.user_id, member.full_name ?? member.user_id)
      }
    })
    return map
  }, [membersQuery.data])

  const availableActions = useMemo(() => {
    if (!activityQuery.data) return [] as string[]
    const set = new Set<string>()
    for (const record of activityQuery.data) {
      if (record.action) set.add(record.action)
    }
    return Array.from(set).sort()
  }, [activityQuery.data])

  const availableActors = useMemo(() => {
    if (!activityQuery.data) return [] as string[]
    const set = new Set<string>()
    for (const record of activityQuery.data) {
      if (record.actor_user_id) set.add(record.actor_user_id)
    }
    return Array.from(set)
  }, [activityQuery.data])

  const cutoff = useMemo(() => {
    const preset = datePresets.find((preset) => preset.value === datePreset)
    if (!preset || !preset.ms) return undefined
    return Date.now() - preset.ms
  }, [datePreset])

  const filteredActivity = useMemo(() => {
    if (!activityQuery.data) return [] as ActivityRecord[]
    return activityQuery.data.filter((item) => {
      const ts = item.created_at ? new Date(item.created_at).getTime() : 0
      if (cutoff && ts < cutoff) return false
      if (actionFilter && item.action !== actionFilter) return false
      if (actorFilter && item.actor_user_id !== actorFilter) return false
      if (searchTerm.trim()) {
        const haystack = [`${item.action ?? ''}`, `${item.actor_user_id ?? ''}`, JSON.stringify(item.meta ?? {})].join(' ').toLowerCase()
        if (!haystack.includes(searchTerm.trim().toLowerCase())) return false
      }
      return true
    })
  }, [activityQuery.data, cutoff, actionFilter, actorFilter, searchTerm])

  const automationEvents = useMemo(
    () => filteredActivity.filter((item) => (item.action ?? '').toLowerCase().includes('agent')).length,
    [filteredActivity]
  )

  const humanEvents = filteredActivity.length - automationEvents

  const exportCsv = () => {
    if (!filteredActivity.length) return
    const header = ['id', 'timestamp', 'action', 'actor', 'meta']
    const rows = filteredActivity.map((item) => {
      const timestamp = item.created_at ?? ''
      const meta = item.meta ? JSON.stringify(item.meta).replace(/"/g, '""') : ''
      return [item.id ?? '', timestamp, item.action ?? '', item.actor_user_id ?? '', meta]
    })
    const csv = [header.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${project?.key ?? 'project'}-activity.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-full mx-auto font-space space-y-6">
        <PageHeader
          title="Activity"
          description="Audit every change across issues, automations, and integrations."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Projects', href: '/dashboard/projects' },
            { label: project?.name || project?.key || routeProjectId || '...' },
            { label: 'Activity' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              {routeProjectId && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/dashboard/projects/${routeProjectId}`}>
                    Hub
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => activityQuery.refetch()}
                disabled={activityQuery.isFetching}
              >
                <RefreshCw className={cn('h-4 w-4', activityQuery.isFetching && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" className="gap-1" onClick={exportCsv} disabled={!filteredActivity.length}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          }
        />

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-slate-500" /> Filters
            </CardTitle>
            <CardDescription>Tune the audit feed for investigations or weekly reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-sm">
                    <ActivityIcon className="h-4 w-4" />
                    {datePresets.find((p) => p.value === datePreset)?.label ?? 'Date range'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Date range</DropdownMenuLabel>
                  {datePresets.map((preset) => (
                    <DropdownMenuItem
                      key={preset.value}
                      onSelect={() => setDatePreset(preset.value)}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {actorFilter ? actorDirectory.get(actorFilter) ?? actorFilter : 'Actors'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Actors</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setActorFilter(null)}>All actors</DropdownMenuItem>
                  {availableActors.map((actorId) => (
                    <DropdownMenuItem key={actorId} onSelect={() => setActorFilter(actorId)}>
                      {actorDirectory.get(actorId) ?? actorId}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-sm">
                    <Badge variant="secondary">{actionFilter ?? 'Actions'}</Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setActionFilter(null)}>All actions</DropdownMenuItem>
                  {availableActions.map((action) => (
                    <DropdownMenuItem key={action} onSelect={() => setActionFilter(action)}>
                      {action}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search activity"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Events in view</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-slate-900">
                  {filteredActivity.length}
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Human updates</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-slate-900">
                  {humanEvents}
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">AI/Agent automations</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-slate-900">
                  {automationEvents}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
            <CardDescription>
              Chronological feed of issue edits, comments, automation runs, and sync operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filteredActivity.length === 0 ? (
              <Alert className="border-dashed">
                <AlertTitle>No activity</AlertTitle>
                <AlertDescription>
                  We couldn’t find events that match the current filters. Try expanding your search window.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {filteredActivity.map((item) => {
                  const actorLabel = actorDirectory.get(item.actor_user_id ?? '') ?? item.actor_user_id ?? 'Unknown actor'
                  const timestampLabel = item.created_at
                    ? `${formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}`
                    : 'Unknown time'
                  return (
                    <div key={item.id} className="relative pl-6">
                      <div className="absolute left-1 top-1.5 h-3 w-3 rounded-full bg-blue-500" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{item.action ?? 'Unknown action'}</span>
                          <Badge variant="outline" className="text-xs">
                            {actorLabel}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500">{timestampLabel}</div>
                        {item.meta && (
                          <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto">
                            {JSON.stringify(item.meta, null, 2)}
                          </pre>
                        )}
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
