import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { metricsService } from '@/lib/api/metricsService'
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import { PageHeader } from '@/components/PageHeader'
import { projectService } from '@/lib/api/projectService'
import { useProject } from '@/contexts/ProjectHooks'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Circle,
  Target,
  Zap,
  Calendar,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectHubPage(){
  const { projectId } = useParams()
  const { project: proj, loading } = useProject()
  const resolvedProjectId = proj?.id
  
  const statsQuery = useQuery({ 
    queryKey: ['project-stats', resolvedProjectId], 
    queryFn: () => projectService.getProjectStats(resolvedProjectId!), 
    enabled: !!resolvedProjectId 
  })
  
  const metricsQuery = useQuery({ 
    queryKey: ['project-metrics-summary', resolvedProjectId], 
    queryFn: () => metricsService.getProjectSummary(resolvedProjectId!), 
    enabled: !!resolvedProjectId 
  })
  
  const activityQuery = useQuery({ 
    queryKey: ['project-activity', resolvedProjectId], 
    queryFn: () => projectService.listProjectActivity(resolvedProjectId!), 
    enabled: !!resolvedProjectId, 
    refetchInterval: 20_000 
  })
  
  const totalIssues: number = statsQuery.data ? Object.values(statsQuery.data.category_counts || {}).reduce((a: number, b: number) => a + b, 0) : 0
  const todoCount: number = statsQuery.data?.category_counts?.todo || 0
  const inProgressCount: number = statsQuery.data?.category_counts?.in_progress || 0
  const doneCount: number = statsQuery.data?.category_counts?.done || 0
  const completionRate = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0
 
  return (
    <ProjectTabLayout>
      <div className='p-6 max-w-[1600px] mx-auto space-y-6'>
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {proj?.name || 'Project Hub'}
              </h1>
              <Badge variant={proj?.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {proj?.status || 'Active'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              {proj?.type && <span className="capitalize">{proj.type}</span>}
              {proj?.key && <span className="text-slate-400"> • {proj.key}</span>}
              {proj?.description && <span className="text-slate-400"> • {proj.description}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/dashboard/projects/${projectId}/board`}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Go to Board
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`/dashboard/projects/${projectId}/backlog`}>
                Create Issue
              </Link>
            </Button>
          </div>
        </div>

        {loading && <div className='text-sm text-slate-600'>Loading project data...</div>}
        
        {proj && (
          <div className='space-y-6'>
            {/* Key Metrics Grid */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {/* Total Issues */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Total Issues</p>
                      <p className="text-3xl font-bold">{totalIssues}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={completionRate} className="h-2" />
                    <p className="text-xs text-slate-500 mt-2">{completionRate}% complete</p>
                  </div>
                </CardContent>
              </Card>

              {/* Velocity */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Velocity</p>
                      <p className="text-3xl font-bold">{metricsQuery.data?.velocity_last_3 ?? '—'}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Last 3 sprints average</p>
                </CardContent>
              </Card>

              {/* Cycle Time */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Avg Cycle Time</p>
                      <p className="text-3xl font-bold">
                        {metricsQuery.data?.avg_cycle_time_days != null 
                          ? metricsQuery.data.avg_cycle_time_days.toFixed(1) 
                          : '—'}
                        <span className="text-lg text-slate-500 ml-1">days</span>
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Time from start to done</p>
                </CardContent>
              </Card>

              {/* Work in Progress */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Work in Progress</p>
                      <p className="text-3xl font-bold">{metricsQuery.data?.wip_count ?? '—'}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Currently in progress</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className='grid gap-6 lg:grid-cols-3'>
              {/* Issue Status Breakdown */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Issue Status</CardTitle>
                    <CardDescription>Current distribution of work items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {totalIssues > 0 ? (
                      <div className='space-y-4'>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Circle className="h-5 w-5 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-900">To Do</p>
                              <p className="text-xs text-slate-500">Ready to start</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{todoCount}</p>
                            <p className="text-xs text-slate-500">
                              {totalIssues > 0 ? Math.round((todoCount / totalIssues) * 100) : 0}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-blue-200 bg-blue-50">
                          <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-blue-900">In Progress</p>
                              <p className="text-xs text-blue-600">Currently working</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-900">{inProgressCount}</p>
                            <p className="text-xs text-blue-600">
                              {totalIssues > 0 ? Math.round((inProgressCount / totalIssues) * 100) : 0}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900">Done</p>
                              <p className="text-xs text-green-600">Completed</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-900">{doneCount}</p>
                            <p className="text-xs text-green-600">
                              {totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='rounded-lg border-2 border-dashed border-slate-200 p-8 text-center space-y-4'>
                        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <p className='font-semibold text-slate-900'>No issues yet</p>
                          <p className='text-sm text-slate-600 mt-1 max-w-md mx-auto'>
                            Get started by creating your first issue or epic. Use AI to decompose epics into actionable stories.
                          </p>
                        </div>
                        <div className='flex gap-3 justify-center'>
                          <Button asChild>
                            <Link to={`/dashboard/projects/${projectId}/backlog`}>Create Issue</Link>
                          </Button>
                          <Button variant='outline' asChild>
                            <Link to="/dashboard/agents/epic-decomposer">Create Epic</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Quick Actions</CardTitle>
                    <CardDescription>Common project tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                      <Button variant='outline' size='sm' asChild className="h-auto py-3 flex-col gap-2">
                        <Link to={`/dashboard/projects/${projectId}/board`}>
                          <LayoutDashboard className="h-5 w-5" />
                          <span className="text-xs">View Board</span>
                        </Link>
                      </Button>
                      <Button variant='outline' size='sm' asChild className="h-auto py-3 flex-col gap-2">
                        <Link to={`/dashboard/projects/${projectId}/backlog`}>
                          <Target className="h-5 w-5" />
                          <span className="text-xs">Backlog</span>
                        </Link>
                      </Button>
                      <Button variant='outline' size='sm' asChild className="h-auto py-3 flex-col gap-2">
                        <Link to={`/dashboard/projects/${projectId}/reports`}>
                          <TrendingUp className="h-5 w-5" />
                          <span className="text-xs">Reports</span>
                        </Link>
                      </Button>
                      <Button variant='outline' size='sm' asChild className="h-auto py-3 flex-col gap-2">
                        <Link to={`/dashboard/projects/${projectId}/settings`}>
                          <Users className="h-5 w-5" />
                          <span className="text-xs">Settings</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Recent Activity</CardTitle>
                    <CardDescription>Latest project updates</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3 max-h-[500px] overflow-auto'>
                    {activityQuery.isLoading && (
                      <div className='text-sm text-slate-500'>Loading activity...</div>
                    )}
                    {(!activityQuery.isLoading && !activityQuery.data?.length) && (
                      <div className='text-center py-8 text-sm text-slate-500'>
                        No activity yet
                      </div>
                    )}
                    {activityQuery.data?.map((activity, idx) => (
                      <div 
                        key={activity.id} 
                        className={cn(
                          'flex gap-3 p-3 rounded-lg transition-colors hover:bg-slate-50',
                          idx < 3 && 'bg-blue-50/50'
                        )}
                      >
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-slate-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">{activity.action}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Project Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Project Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Project Key</p>
                      <p className="mt-1 font-mono">{proj.key || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Type</p>
                      <p className="mt-1 capitalize">{proj.type || '—'}</p>
                    </div>
                    {proj.description && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                        <p className="mt-1 text-slate-700">{proj.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProjectTabLayout>
  )
}
