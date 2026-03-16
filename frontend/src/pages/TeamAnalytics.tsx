import { useQuery } from '@tanstack/react-query'
import { teamService } from '@/lib/api/teamService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useTeam } from '@/hooks/useTeam'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Target, 
  Users, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Helper function to safely convert backend Decimal strings to numbers
const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return isNaN(num) ? null : num
}

export default function TeamAnalytics() {
  const { currentTeam } = useTeam()
  const teamId = currentTeam?.id

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['team-metrics-summary', teamId],
    queryFn: () => teamService.getMetricsSummary(teamId!),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: velocity, isLoading: velocityLoading, error: velocityError } = useQuery({
    queryKey: ['team-velocity', teamId],
    queryFn: () => teamService.getVelocity(teamId!, 30),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: cycleTime, isLoading: cycleTimeLoading, error: cycleTimeError } = useQuery({
    queryKey: ['team-cycle-time', teamId],
    queryFn: () => teamService.getCycleTime(teamId!, 30),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: workload, isLoading: workloadLoading, error: workloadError } = useQuery({
    queryKey: ['team-workload', teamId],
    queryFn: () => teamService.getWorkload(teamId!),
    enabled: !!teamId,
    retry: 2,
  })

  const { data: sprintCompletion, isLoading: sprintLoading, error: sprintError } = useQuery({
    queryKey: ['team-sprint-completion', teamId],
    queryFn: () => teamService.getSprintCompletion(teamId!, 5),
    enabled: !!teamId,
    retry: 2,
  })

  const TrendIcon = ({ trend }: { trend: string | null | undefined }) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  if (summaryError) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load team metrics: {(summaryError as Error).message || 'Please try again later.'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  if (summaryLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{summary?.team_name || 'Team'} Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics and insights for your team
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Velocity</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.current_velocity?.toFixed(1) || '—'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendIcon trend={summary?.velocity_trend} />
              <span className="ml-1">
                Avg: {summary?.average_velocity_30d?.toFixed(1) || '—'} (30d)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toNumber(summary?.avg_cycle_time_hours)?.toFixed(1) || '—'}h
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendIcon trend={summary?.cycle_time_trend} />
              <span className="ml-1">Time to complete</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sprint Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toNumber(summary?.last_sprint_completion_rate)?.toFixed(0) || '—'}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {toNumber(summary?.avg_sprint_completion_rate)?.toFixed(0) || '—'}% (last 5)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_active_issues || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.total_in_progress || 0} in progress
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="velocity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="cycle-time">Cycle Time</TabsTrigger>
          <TabsTrigger value="sprint-completion">Sprint Completion</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        {/* Velocity Chart */}
        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Velocity (Last 30 Days)</CardTitle>
              <CardDescription>Story points completed over time</CardDescription>
            </CardHeader>
            <CardContent>
              {velocityLoading ? (
                <Skeleton className="h-80" />
              ) : velocity?.data_points.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={velocity.data_points}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value: number) => [value.toFixed(1), 'Velocity']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="velocity" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Story Points"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No velocity data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cycle Time Chart */}
        <TabsContent value="cycle-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cycle Time Trend (Last 30 Days)</CardTitle>
              <CardDescription>Average hours from start to completion</CardDescription>
            </CardHeader>
            <CardContent>
              {cycleTimeLoading ? (
                <Skeleton className="h-80" />
              ) : cycleTime?.data_points.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cycleTime.data_points.filter(d => d.avg_cycle_time_hours)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value: number) => [value.toFixed(1) + 'h', 'Avg Cycle Time']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avg_cycle_time_hours" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Cycle Time (hours)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No cycle time data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sprint Completion Chart */}
        <TabsContent value="sprint-completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Completion Rate</CardTitle>
              <CardDescription>Committed vs. completed story points</CardDescription>
            </CardHeader>
            <CardContent>
              {sprintLoading ? (
                <Skeleton className="h-80" />
              ) : sprintCompletion?.sprints.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sprintCompletion.sprints.reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sprint_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="committed_points" fill="#94a3b8" name="Committed" />
                    <Bar dataKey="completed_points" fill="#3b82f6" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No sprint data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workload Distribution */}
        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Workload Distribution</CardTitle>
              <CardDescription>Active issues per team member</CardDescription>
            </CardHeader>
            <CardContent>
              {workloadLoading ? (
                <Skeleton className="h-80" />
              ) : workload?.members.length ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workload.members}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="user_name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="assigned_issues" fill="#3b82f6" name="Assigned" />
                      <Bar dataKey="in_progress_issues" fill="#10b981" name="In Progress" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Member Details Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Member</th>
                          <th className="text-right py-2">Assigned</th>
                          <th className="text-right py-2">In Progress</th>
                          <th className="text-right py-2">Story Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workload.members.map((member, idx) => (
                          <tr key={member.user_id} className="border-b">
                            <td className="py-2">{member.user_name}</td>
                            <td className="text-right">{member.assigned_issues}</td>
                            <td className="text-right">{member.in_progress_issues}</td>
                            <td className="text-right">{toNumber(member.story_points)?.toFixed(1) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No workload data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bug Metrics (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bugs Fixed:</span>
              <span className="font-semibold">{summary?.bugs_fixed_30d || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bugs Created:</span>
              <span className="font-semibold">{summary?.bugs_created_30d || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fix Rate:</span>
              <span className="font-semibold text-green-600">
                {toNumber(summary?.bug_fix_rate)?.toFixed(1) || '—'}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Sprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sprint:</span>
              <span className="font-semibold">{summary?.current_sprint_name || 'No active sprint'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <span className="font-semibold">
                {toNumber(summary?.current_sprint_progress)?.toFixed(0) || '—'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Team Size:</span>
              <span className="font-semibold">{summary?.team_member_count || 0} members</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  )
}
