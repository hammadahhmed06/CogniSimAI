import { useQuery } from '@tanstack/react-query'
import { workspaceService, WorkspaceActivityEvent } from '@/lib/api/workspaceService'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Clock, Plus, Settings2, Trash2, LogOut, ArrowLeftRight } from 'lucide-react'

interface ActivityFeedProps {
  limit?: number
  className?: string
}

function formatTime(ts?: string) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff/60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins/60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs/24)
  return `${days}d ago`
}

const actionLabels: Record<string,string> = {
  create: 'Workspace created',
  update: 'Updated settings',
  delete: 'Deleted workspace',
  leave: 'Member left',
  transfer_owner: 'Ownership transferred'
}

const actionIcon: Record<string, JSX.Element> = {
  create: <Plus className="w-3.5 h-3.5" />,
  update: <Settings2 className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  leave: <LogOut className="w-3.5 h-3.5" />,
  transfer_owner: <ArrowLeftRight className="w-3.5 h-3.5" />,
}

const actionColor: Record<string,string> = {
  create: 'bg-emerald-100 text-emerald-600',
  update: 'bg-blue-100 text-blue-600',
  delete: 'bg-red-100 text-red-600',
  leave: 'bg-amber-100 text-amber-600',
  transfer_owner: 'bg-purple-100 text-purple-600'
}

export function ActivityFeed({ limit = 25, className }: ActivityFeedProps) {
  const { activeWorkspaceId } = useWorkspace()
  const { data, isLoading, isError, refetch } = useQuery<WorkspaceActivityEvent[]>({
    queryKey: ['workspace-activity', activeWorkspaceId],
    queryFn: () => activeWorkspaceId ? workspaceService.listActivity(activeWorkspaceId) : Promise.resolve([]),
    enabled: !!activeWorkspaceId,
    refetchInterval: 60000,
  })

  if (!activeWorkspaceId) return null
  if (isLoading) return <div className={className}>Loading activity…</div>
  if (isError) return <div className={className}>Failed to load activity. <button className="underline" onClick={() => refetch()}>Retry</button></div>

  const items = (data || []).slice(0, limit)
  if (!items.length) return <div className={className}>No recent activity.</div>

  return (
    <ul className={`divide-y rounded-md border bg-white ${className || ''}`}>
      {items.map(ev => {
        const icon = actionIcon[ev.action] || <Clock className="w-3.5 h-3.5" />
        const color = actionColor[ev.action] || 'bg-slate-100 text-slate-600'
        return (
          <li key={ev.id} className="p-3 text-sm flex items-start gap-3">
            <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md ${color}`}>{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800">{actionLabels[ev.action] || ev.action}</div>
              {ev.meta && <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs bg-slate-50 border rounded p-2 text-slate-600">{JSON.stringify(ev.meta, null, 2)}</pre>}
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap">{formatTime(ev.created_at)}</div>
          </li>
        )
      })}
    </ul>
  )
}
