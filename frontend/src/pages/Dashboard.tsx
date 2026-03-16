import { useState, useEffect, useMemo, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/DashboardLayout'
import { CommandHeader } from '@/components/dashboard/CommandHeader'
import { AIAgentsHub } from '@/components/dashboard/AIAgentsHub'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'
import { WorkspaceOverview } from '@/components/dashboard/WorkspaceOverview'
import { PersonalFocus } from '@/components/dashboard/PersonalFocus'
import { RecentActivity, RecentActivityItem } from '@/components/dashboard/RecentActivity'
import { DashboardInsights } from '@/components/dashboard/DashboardInsights'
import { projectService } from '@/lib/api/projectService'
import { issueService, IssueDTO } from '@/lib/api/issueService'
import { workspaceService } from '@/lib/api/workspaceService'
import { agentService } from '@/lib/api/agentService'
import { TeamContext } from '@/components/TeamProvider'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const teamContext = useContext(TeamContext)
  const currentTeamId = teamContext?.currentTeam?.id

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch projects
  const projectsQuery = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => projectService.listProjects({ status: 'active' }),
    staleTime: 30000
  })

  // Fetch all projects for stats
  const allProjectsQuery = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => projectService.listProjects(),
    staleTime: 30000
  })

  // Fetch user's issues (assigned to them or created by them)
  const issuesQuery = useQuery({
    queryKey: ['dashboard-issues'],
    queryFn: () => issueService.listIssues({ limit: 20 }),
    staleTime: 30000
  })

  // Fetch default workspace and members for count
  const defaultWorkspaceQuery = useQuery({
    queryKey: ['default-workspace'],
    queryFn: () => workspaceService.getDefaultWorkspace(),
    staleTime: 60000
  })

  const membersQuery = useQuery({
    queryKey: ['workspace-members', defaultWorkspaceQuery.data?.id],
    queryFn: () => workspaceService.listMembers(defaultWorkspaceQuery.data!.id),
    enabled: !!defaultWorkspaceQuery.data?.id,
    staleTime: 60000
  })

  // Fetch agent runs for AI Agents Hub (only when team is available)
  const agentRunsQuery = useQuery({
    queryKey: ['agent-runs', currentTeamId],
    queryFn: () => agentService.listRuns({ limit: 20 }),
    staleTime: 30000,
    enabled: !!currentTeamId,
    retry: false // Don't retry on 400 errors
  })

  // Compute agent stats from runs
  const agentStats = useMemo(() => {
    const runs = agentRunsQuery.data || []
    const totalRuns = runs.length
    const storiesGenerated = runs.reduce((acc, r) => acc + (r.created_issue_count || 0), 0)
    const scoresWithValues = runs.filter(r => r.quality_score != null)
    const avgQualityScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((acc, r) => acc + (r.quality_score || 0), 0) / scoresWithValues.length
      : 0

    return { totalRuns, storiesGenerated, avgQualityScore }
  }, [agentRunsQuery.data])

  // Compute workspace stats
  const workspaceStats = useMemo(() => {
    const projects = allProjectsQuery.data || []
    const activeProjects = projects.filter(p => p.status === 'active')
    const issues = issuesQuery.data?.items || []
    const doneIssues = issues.filter(i => i.status?.toLowerCase() === 'done')
    const completionRate = issues.length > 0 ? Math.round((doneIssues.length / issues.length) * 100) : 0
    const trend: 'up' | 'down' | 'neutral' = completionRate > 50 ? 'up' : 'neutral'

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalMembers: membersQuery.data?.length || 1,
      completionRate,
      trend,
      trendValue: completionRate > 50 ? 12 : undefined
    }
  }, [allProjectsQuery.data, issuesQuery.data, membersQuery.data])

  // Generate recent activity from issues and projects
  const recentActivity = useMemo((): RecentActivityItem[] => {
    const activities: RecentActivityItem[] = []
    const issues = issuesQuery.data?.items || []
    const projects = projectsQuery.data || []

    // Add recent issue updates
    issues.slice(0, 5).forEach(issue => {
      const activityType = issue.status?.toLowerCase() === 'done' 
        ? 'issue_completed' 
        : issue.status?.toLowerCase().includes('progress') 
          ? 'issue_updated' 
          : 'issue_created'

      activities.push({
        id: `issue-${issue.id}`,
        type: activityType,
        title: issue.title,
        description: `${issue.type || 'Issue'} ${activityType === 'issue_completed' ? 'completed' : activityType === 'issue_updated' ? 'in progress' : 'created'}`,
        timestamp: issue.updated_at || issue.created_at || new Date().toISOString(),
        projectName: projects.find(p => p.id === issue.project_id)?.name,
        issueKey: issue.issue_key
      })
    })

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return activities.slice(0, 8)
  }, [issuesQuery.data, projectsQuery.data])

  // Compute issue stats for insights
  const issueStats = useMemo(() => {
    const issues = issuesQuery.data?.items || []
    const totalIssues = issues.length
    const completedIssues = issues.filter(i => i.status?.toLowerCase() === 'done').length
    const inProgressIssues = issues.filter(i => i.status?.toLowerCase().includes('progress')).length
    const todoIssues = issues.filter(i => 
      i.status?.toLowerCase() === 'todo' || 
      i.status?.toLowerCase() === 'to do' ||
      i.status?.toLowerCase() === 'open'
    ).length

    return { totalIssues, completedIssues, inProgressIssues, todoIssues }
  }, [issuesQuery.data])

  // Get user display name
  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  }

  const projectNameById = useMemo(() => {
    const projects = allProjectsQuery.data || []
    const map: Record<string, string> = {}
    for (const p of projects) {
      if (p?.id) map[p.id] = p.name
    }
    return map
  }, [allProjectsQuery.data])

  const issuesAssignedToMe = useMemo(() => {
    const issues = issuesQuery.data?.items || []
    const email = (user?.email || '').trim().toLowerCase()
    const fullName = (user?.user_metadata?.full_name || '').trim().toLowerCase()
    const name = (user?.user_metadata?.name || '').trim().toLowerCase()
    const emailPrefix = email ? email.split('@')[0] : ''

    const candidates = new Set([email, fullName, name, emailPrefix].filter(Boolean))
    if (candidates.size === 0) return []

    return issues.filter((i) => {
      const a = (i.assignee_name || '').trim().toLowerCase()
      return a ? candidates.has(a) : false
    })
  }, [issuesQuery.data, user])

  // Handle issue click - navigate to project backlog
  const handleIssueClick = (issue: IssueDTO) => {
    if (issue.project_id) {
      navigate(`/dashboard/projects/${issue.project_id}/backlog`)
    }
  }

  const isLoading = projectsQuery.isLoading || issuesQuery.isLoading

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your command center...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full px-1">
        {/* Command Header */}
        <CommandHeader 
          userName={getUserDisplayName()} 
          currentTime={currentTime}
        />

        {/* Quick Actions */}
        <QuickActionsGrid />

        {/* Insights Row - Full Width */}
        <DashboardInsights
          totalIssues={issueStats.totalIssues}
          completedIssues={issueStats.completedIssues}
          inProgressIssues={issueStats.inProgressIssues}
          todoIssues={issueStats.todoIssues}
          totalProjects={workspaceStats.totalProjects}
          isLoading={issuesQuery.isLoading}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - AI Agents & Personal Focus */}
          <div className="lg:col-span-7 space-y-6">
            <AIAgentsHub 
              runs={agentRunsQuery.data || []}
              isLoading={agentRunsQuery.isLoading}
              totalRuns={agentStats.totalRuns}
              storiesGenerated={agentStats.storiesGenerated}
              avgQualityScore={agentStats.avgQualityScore}
            />
            <PersonalFocus 
              issues={issuesAssignedToMe} 
              isLoading={issuesQuery.isLoading}
              onIssueClick={handleIssueClick}
              projectNameById={projectNameById}
            />
          </div>

          {/* Right Column - Workspace Overview & Activity */}
          <div className="lg:col-span-5 space-y-6">
            <WorkspaceOverview 
              stats={workspaceStats}
              recentProjects={projectsQuery.data?.slice(0, 3)}
              isLoading={allProjectsQuery.isLoading}
            />
            <RecentActivity 
              activities={recentActivity}
              isLoading={issuesQuery.isLoading}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
