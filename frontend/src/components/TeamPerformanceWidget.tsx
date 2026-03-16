import { useQuery } from '@tanstack/react-query'
import { teamService } from '@/lib/api/teamService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Clock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface TeamPerformanceWidgetProps {
  teamId: string
  compact?: boolean
}

export default function TeamPerformanceWidget({ teamId, compact = false }: TeamPerformanceWidgetProps) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['team-metrics-summary', teamId],
    queryFn: () => teamService.getMetricsSummary(teamId),
    enabled: !!teamId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  // Helper to safely convert and format numbers (backend may send Decimal as string)
  const formatNumber = (value: number | string | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return '—'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '—'
    return num.toFixed(decimals)
  }

  const TrendIcon = ({ trend }: { trend: string | null | undefined }) => {
    if (trend === 'increasing') return <TrendingUp className="h-3 w-3 text-green-600" />
    if (trend === 'decreasing') return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load performance metrics</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Velocity</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{formatNumber(summary?.current_velocity)}</span>
              <TrendIcon trend={summary?.velocity_trend} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cycle Time</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{formatNumber(summary?.avg_cycle_time_hours)}h</span>
              <TrendIcon trend={summary?.cycle_time_trend} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Sprint Completion</span>
            </div>
            <span className="font-semibold">{formatNumber(summary?.last_sprint_completion_rate, 0)}%</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
        <CardDescription>Current sprint and velocity metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Sprint */}
        {summary?.current_sprint_name && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Sprint</span>
              <span className="text-sm text-muted-foreground">{summary.current_sprint_name}</span>
            </div>
            <Progress value={typeof summary.current_sprint_progress === 'string' ? parseFloat(summary.current_sprint_progress) : (summary.current_sprint_progress || 0)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(summary.current_sprint_progress, 0)}% complete</span>
              <span>{summary.total_active_issues} active issues</span>
            </div>
          </div>
        )}

        {/* Velocity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Velocity</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{formatNumber(summary?.current_velocity)}</span>
              <TrendIcon trend={summary?.velocity_trend} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            30-day average: {formatNumber(summary?.average_velocity_30d)} points
          </p>
        </div>

        {/* Cycle Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg Cycle Time</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{formatNumber(summary?.avg_cycle_time_hours)}</span>
              <span className="text-sm text-muted-foreground">hours</span>
              <TrendIcon trend={summary?.cycle_time_trend} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Time from start to completion
          </p>
        </div>

        {/* Sprint Completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sprint Completion</span>
            </div>
            <span className="text-2xl font-bold">{formatNumber(summary?.last_sprint_completion_rate, 0)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Average: {formatNumber(summary?.avg_sprint_completion_rate, 0)}% (last 5 sprints)
          </p>
        </div>

        {/* Quick Stats */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">In Progress</span>
            <span className="font-semibold">{summary?.total_in_progress || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Issues/Member</span>
            <span className="font-semibold">{formatNumber(summary?.avg_workload_per_member)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bug Fix Rate</span>
            <span className="font-semibold">{formatNumber(summary?.bug_fix_rate, 0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
