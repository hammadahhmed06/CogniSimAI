import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Activity,
  BarChart3,
  Download,
  AlertCircle,
  Info,
} from 'lucide-react'
import { projectService } from '@/lib/api/projectService'
import { metricsService } from '@/lib/api/metricsService'
import { issuesService } from '@/lib/api/issuesService'
import { historicalService, ProjectMetricSnapshot } from '@/lib/api/historicalService'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  getIssueDistributions,
  calculateVelocityBySprint,
  groupCycleTimesByMonth,
  calculateSprintBurndown,
  generateCumulativeFlowSnapshot,
  calculateCompletionRate,
  filterIssuesByDateRange,
  generateCSVContent,
  downloadCSV,
} from '@/lib/chartDataTransformers'

export default function ProjectReports() {
  const { projectId } = useParams()
  const [timeRange, setTimeRange] = useState('30')
  const [activeTab, setActiveTab] = useState('burndown')

  // Fetch all required data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectService.getProjectStats(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['project-metrics', projectId],
    queryFn: () => metricsService.getProjectSummary(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000,
  })

  const { data: allIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['project-issues-all', projectId],
    queryFn: () => issuesService.listByProject(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000,
  })

  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => projectService.listSprints(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000,
  })


  // Fetch historical snapshots for advanced analytics
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['project-historical-snapshots', projectId],
    queryFn: () => historicalService.getProjectSnapshots(projectId!),
    enabled: !!projectId,
    refetchInterval: 60000, // 1 min
  })

  // Filter issues by time range
  const filteredIssues = useMemo(() => {
    if (!allIssues) return []
    const days = parseInt(timeRange)
    return filterIssuesByDateRange(allIssues, days)
  }, [allIssues, timeRange])

  // Calculate all chart data (now with historical snapshots)
  const distributions = useMemo(() => {
    if (!filteredIssues.length) return null
    return getIssueDistributions(filteredIssues)
  }, [filteredIssues])

  const issueTypeDistribution = distributions?.type ?? []
  const priorityDistribution = distributions?.priority ?? []

  // Use historical snapshots for velocity/cycle time if available
  const velocityData = useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      return snapshots.map(s => ({
        date: s.date,
        velocity: s.velocity,
        completed: s.closed_issues,
        open: s.open_issues,
        storyPointsClosed: s.story_points_closed,
        storyPointsOpen: s.story_points_open,
      }))
    }
    if (!sprints || !allIssues) return []
    return calculateVelocityBySprint(sprints, allIssues)
  }, [snapshots, sprints, allIssues])

  const cycleTimeData = useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      return snapshots.map(s => ({
        date: s.date,
        avgDays: s.avg_cycle_time,
      }))
    }
    if (!filteredIssues.length) return []
    return groupCycleTimesByMonth(filteredIssues)
  }, [snapshots, filteredIssues])

  // Burndown and cumulative flow remain as before (can be enhanced with snapshots later)
  const burndownData = useMemo(() => {
    if (!sprints || !allIssues) return []
    const activeSprint = sprints.find(s => s.state === 'active')
    if (!activeSprint) return []
    const sprintIssues = allIssues.filter(i => i.sprint_id === activeSprint.id)
    return calculateSprintBurndown(activeSprint, sprintIssues)
  }, [sprints, allIssues])

  const cumulativeFlowData = useMemo(() => {
    if (!stats) return []
    return generateCumulativeFlowSnapshot(stats)
  }, [stats])

  // Calculate metrics
  const completionRate = stats ? calculateCompletionRate(stats) : 0
  const velocity = metrics?.velocity_last_3 || 0
  const avgCycleTime = metrics?.avg_cycle_time_days || 0
  const wipCount = metrics?.wip_count || 0

  // Check if loading
  const isLoading = statsLoading || metricsLoading || issuesLoading || sprintsLoading || snapshotsLoading

  // Export functionality
  const handleExport = () => {
    const exportData: Record<string, any> = {}
    
    if (activeTab === 'velocity' && velocityData.length > 0) {
      const content = generateCSVContent(velocityData, 'velocity-data.csv')
      downloadCSV(content, `velocity-report-${projectId}-${Date.now()}.csv`)
    } else if (activeTab === 'cycle-time' && cycleTimeData.length > 0) {
      const content = generateCSVContent(cycleTimeData, 'cycle-time-data.csv')
      downloadCSV(content, `cycle-time-report-${projectId}-${Date.now()}.csv`)
    } else if (activeTab === 'distribution' && distributions) {
      const combined = [
        ...distributions.type.map(d => ({ category: 'Type', ...d })),
        ...distributions.priority.map(d => ({ category: 'Priority', ...d })),
      ]
      const content = generateCSVContent(combined, 'distribution-data.csv')
      downloadCSV(content, `distribution-report-${projectId}-${Date.now()}.csv`)
    } else if (activeTab === 'burndown' && burndownData.length > 0) {
      const content = generateCSVContent(burndownData, 'burndown-data.csv')
      downloadCSV(content, `burndown-report-${projectId}-${Date.now()}.csv`)
    } else {
      // Export all metrics as JSON
      const allData = {
        metrics: { velocity, avgCycleTime, wipCount, completionRate },
        stats: stats,
        velocityTrend: velocityData,
        cycleTimeTrend: cycleTimeData,
        distributions: distributions,
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `project-report-${projectId}-${Date.now()}.json`
      link.click()
    }
  }

  return (
    <ProjectTabLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports & Analytics</h1>
            <p className="text-sm text-slate-600 mt-1">
              Track team performance and project progress
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Velocity</p>
                  <p className="text-3xl font-bold">{velocity}</p>
                  {velocity > 0 ? (
                    <p className="text-xs text-slate-500">Issues completed recently</p>
                  ) : (
                    <p className="text-xs text-slate-400">No recent completions</p>
                  )}
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Avg Cycle Time</p>
                  <p className="text-3xl font-bold">
                    {avgCycleTime ? avgCycleTime.toFixed(1) : '—'}
                    {avgCycleTime ? <span className="text-lg text-slate-500 ml-1">d</span> : ''}
                  </p>
                  {avgCycleTime ? (
                    <p className="text-xs text-slate-500">From start to done</p>
                  ) : (
                    <p className="text-xs text-slate-400">No completed issues</p>
                  )}
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Work in Progress</p>
                  <p className="text-3xl font-bold">{wipCount}</p>
                  <p className="text-xs text-slate-500">Active items</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                  <p className="text-3xl font-bold">{completionRate}<span className="text-lg text-slate-500">%</span></p>
                  {completionRate >= 70 ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Good progress
                    </p>
                  ) : completionRate >= 40 ? (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                      <Minus className="h-3 w-3" />
                      Moderate progress
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{stats?.category_counts.done || 0} of {stats?.total || 0} done</p>
                  )}
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="burndown">Burndown</TabsTrigger>
            <TabsTrigger value="velocity">Velocity</TabsTrigger>
            <TabsTrigger value="cycle-time">Cycle Time</TabsTrigger>
            <TabsTrigger value="cumulative">Cumulative Flow</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          {/* Burndown Chart */}
          <TabsContent value="burndown" className="space-y-4">
            {!sprints?.find(s => s.state === 'active') && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No active sprint found. Start a sprint to see burndown progress.
                </AlertDescription>
              </Alert>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Sprint Burndown</CardTitle>
                <CardDescription>
                  Track work remaining vs ideal burndown over the sprint
                </CardDescription>
                <Badge variant="outline" className="w-fit mt-2">
                  <Info className="h-3 w-3 mr-1" />
                  Shows ideal line + current remaining work
                </Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : burndownData.length > 0 ? (
                  <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="planned" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Ideal Burndown"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Actual Progress"
                        dot={{ fill: '#3b82f6', r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
                    <AlertCircle className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No burndown data available</p>
                    <p className="text-sm text-slate-400 mt-2">Start an active sprint to track burndown progress</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Velocity Chart */}
          <TabsContent value="velocity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Velocity Trend</CardTitle>
                <CardDescription>
                  Compare committed vs completed story points across sprints
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : velocityData.length > 0 ? (
                  <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="sprint" 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="committed" fill="#94a3b8" name="Committed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
                    <BarChart3 className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No velocity data available</p>
                    <p className="text-sm text-slate-400 mt-2">Complete some sprints to see velocity trends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cycle Time Chart */}
          <TabsContent value="cycle-time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cycle Time Trend</CardTitle>
                <CardDescription>
                  Average time from start to completion over time
                </CardDescription>
                <Badge variant="outline" className="w-fit mt-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Approximated from creation to last update
                </Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : cycleTimeData.length > 0 ? (
                  <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cycleTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avgDays" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name="Avg Cycle Time (days)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
                    <Clock className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No cycle time data available</p>
                    <p className="text-sm text-slate-400 mt-2">Complete some issues to calculate cycle time</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cumulative Flow */}
          <TabsContent value="cumulative" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Showing current status snapshot. Historical time-series tracking coming soon!
              </AlertDescription>
            </Alert>
            <Card>
              <CardHeader>
                <CardTitle>Current Status Distribution</CardTitle>
                <CardDescription>
                  Current snapshot of work distribution across statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : cumulativeFlowData.length > 0 && stats ? (
                  <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cumulativeFlowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Issues', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="done" 
                        fill="#10b981" 
                        name="Done"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="inProgress" 
                        fill="#3b82f6" 
                        name="In Progress"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="todo" 
                        fill="#94a3b8" 
                        name="To Do"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
                    <Activity className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No status data available</p>
                    <p className="text-sm text-slate-400 mt-2">Create some issues to see distribution</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Charts */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Issue Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Type Distribution</CardTitle>
                  <CardDescription>Breakdown by work item type</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : distributions && distributions.type.length > 0 ? (
                    <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={issueTypeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {distributions.type.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                      <p className="text-sm">No issues to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : distributions && distributions.priority.length > 0 ? (
                    <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {distributions.priority.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                      <p className="text-sm">No issues to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignee Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignee Distribution</CardTitle>
                  <CardDescription>Breakdown by team member</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : distributions && distributions.assignee.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributions.assignee.slice(0, 10)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {distributions.assignee.slice(0, 10).map((entry, index) => {
                              const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                      <p className="text-sm">No assignee data to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Breakdown by issue status</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : distributions && distributions.status.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributions.status}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis 
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                      <p className="text-sm">No status data to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProjectTabLayout>
  )
}
