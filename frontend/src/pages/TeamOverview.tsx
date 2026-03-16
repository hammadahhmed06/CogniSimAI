import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Users, 
  Gauge, 
  Settings2, 
  ShieldCheck, 
  PlusCircle, 
  BarChart3, 
  Crown, 
  Shield, 
  UserCheck, 
  Mail, 
  ChevronRight,
  Zap,
  Target,
  MessageSquare,
  FileText,
  FolderKanban,
  ArrowRight,
  Loader2,
  Check
} from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { useEffect, useState } from 'react'
import { teamService, type TeamQuotaResponse, type TeamDetail } from '@/lib/api/teamService'
import TeamPerformanceWidget from '@/components/TeamPerformanceWidget'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function TeamOverview() {
  const { currentTeam, teams, switchTeam, refreshTeams } = useTeam()
  const navigate = useNavigate()
  const [quota, setQuota] = useState<TeamQuotaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    refreshTeams()
  }, [refreshTeams])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const q = await teamService.getQuota()
        setQuota(q)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [currentTeam?.id])

  // Extract member counts from teams
  useEffect(() => {
    const entries: Record<string, number> = {}
    for (const t of teams as (TeamDetail)[]) {
      if (t.members_count != null) entries[t.id] = t.members_count as number
    }
    setCounts(entries)
  }, [teams])

  const dailyPct = quota ? Math.min(100, Math.round((quota.daily_runs_used / Math.max(1, quota.daily_runs_limit)) * 100)) : 0
  const tokenPct = quota && quota.tokens_30d_used != null && quota.tokens_30d_limit != null
    ? Math.min(100, Math.round((quota.tokens_30d_used / Math.max(1, quota.tokens_30d_limit)) * 100))
    : 0

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5 text-amber-500" />
      case 'admin': return <Shield className="w-3.5 h-3.5 text-purple-500" />
      default: return <UserCheck className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'editor': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const quickActions = [
    { icon: Users, label: 'Members', description: 'Manage team members', path: '/dashboard/team/members', color: 'text-blue-600 bg-blue-100' },
    { icon: Mail, label: 'Invite', description: 'Invite new members', path: '/dashboard/team/invite', color: 'text-purple-600 bg-purple-100' },
    { icon: Target, label: 'Goals', description: 'Track team goals', path: '/dashboard/team/goals', color: 'text-green-600 bg-green-100' },
    { icon: MessageSquare, label: 'Chat', description: 'Team discussions', path: '/dashboard/team/chat', color: 'text-amber-600 bg-amber-100' },
    { icon: FileText, label: 'Resources', description: 'Shared documents', path: '/dashboard/team/resources', color: 'text-rose-600 bg-rose-100' },
    { icon: Settings2, label: 'Settings', description: 'Team configuration', path: '/dashboard/team/settings', color: 'text-slate-600 bg-slate-100' },
  ]

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {currentTeam && (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {currentTeam.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {currentTeam?.name || 'Team Overview'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {currentTeam && (
                  <Badge variant="outline" className={`text-xs px-2 py-0 h-5 gap-1 ${getRoleBadgeVariant((currentTeam as TeamDetail).my_role)}`}>
                    {getRoleIcon((currentTeam as TeamDetail).my_role)}
                    {(currentTeam as TeamDetail).my_role || 'member'}
                  </Badge>
                )}
                <span className="text-slate-500 text-sm">
                  {counts[currentTeam?.id || ''] || 0} members
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/teams')}
              className="gap-2"
            >
              <FolderKanban className="w-4 h-4" />
              All Teams
            </Button>
            {currentTeam?.id && (
              <Button 
                onClick={() => navigate('/dashboard/team/analytics')}
                className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            )}
          </div>
        </div>

        {/* Team Switcher */}
        {teams.length > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    Your Teams
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Switch between teams or manage all teams
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard/teams')}
                  className="gap-1 text-slate-500 hover:text-slate-700"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {(teams as TeamDetail[]).slice(0, 6).map((team, index) => {
                  const isActive = currentTeam?.id === team.id
                  return (
                    <motion.button
                      key={team.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => { switchTeam(team.id) }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all min-w-[180px] ${
                        isActive 
                          ? 'border-blue-500 bg-blue-50 shadow-sm' 
                          : 'border-transparent bg-slate-50 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                        isActive ? 'bg-blue-600' : 'bg-slate-600'
                      }`}>
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className={`font-medium text-sm truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                          {team.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {counts[team.id] || 0} members
                        </p>
                      </div>
                      {isActive && (
                        <div className="p-1 bg-blue-600 rounded-full">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
                {teams.length > 6 && (
                  <button
                    onClick={() => navigate('/dashboard/teams')}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100 min-w-[120px] text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">+{teams.length - 6} more</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{counts[currentTeam?.id || ''] || 0}</p>
                  <p className="text-xs text-slate-500">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{quota?.daily_runs_used ?? 0}</p>
                  <p className="text-xs text-slate-500">Runs Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FolderKanban className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{teams.length}</p>
                  <p className="text-xs text-slate-500">Total Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {(teams as TeamDetail[]).filter(t => t.my_role === 'owner' || t.my_role === 'admin').length}
                  </p>
                  <p className="text-xs text-slate-500">Admin Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common team management shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(action.path)}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-slate-700">{action.label}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{action.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Usage Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="w-4 h-4 text-slate-500" />
                Usage & Limits
              </CardTitle>
              <CardDescription>Daily runs and 30-day token usage</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading usage data…
                </div>
              ) : quota ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Daily Runs</span>
                      <span className="text-slate-500">{quota.daily_runs_used} / {quota.daily_runs_limit}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-3 rounded-full ${dailyPct > 80 ? 'bg-red-500' : dailyPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${dailyPct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{100 - dailyPct}% remaining today</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Token Usage (30 days)</span>
                      <span className="text-slate-500">{(quota.tokens_30d_used ?? 0).toLocaleString()} / {(quota.tokens_30d_limit ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-3 rounded-full ${tokenPct > 80 ? 'bg-red-500' : tokenPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${tokenPct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{100 - tokenPct}% remaining this period</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No quota data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Performance Widget */}
          {currentTeam?.id && (
            <TeamPerformanceWidget teamId={currentTeam.id} />
          )}
        </div>

        {/* No Team Selected State */}
        {!currentTeam && (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No team selected</h3>
              <p className="text-slate-500 text-center max-w-sm mb-4">
                Select an existing team or create a new one to get started.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard/teams')}>
                  View All Teams
                </Button>
                <Button onClick={() => navigate('/dashboard/teams')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <PlusCircle className="w-4 h-4" />
                  Create Team
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
