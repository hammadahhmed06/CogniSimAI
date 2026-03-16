import { useEffect, useState } from 'react'
import { useTeam } from '@/hooks/useTeam'
import { teamService, type Team, type TeamDetail } from '@/lib/api/teamService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useNavigate } from 'react-router-dom'
import { Users, Mail, Plus, Settings, ChevronRight, Crown, Shield, UserCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/lib/notify'
import { motion } from 'framer-motion'

export default function TeamsPage() {
  const { teams, refreshTeams, switchTeam, currentTeam } = useTeam()
  const { activeWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    refreshTeams()
  }, [refreshTeams])

  // Use provided counts directly when teams refresh
  useEffect(() => {
    const entries: Record<string, number> = {}
    for (const t of teams as (TeamDetail | Team)[]) {
      if ((t as TeamDetail).members_count != null) entries[t.id] = (t as TeamDetail).members_count as number
    }
    setCounts(entries)
  }, [teams])

  const createTeam = async () => {
    if (!activeWorkspaceId) return
    if (!name.trim()) return
    setIsCreating(true)
    try {
      // First cleanup any orphan teams (in case previous creation failed)
      try {
        await teamService.cleanupOrphanTeams()
      } catch {
        // Ignore cleanup errors
      }
      
      const t = await teamService.createTeam(name.trim())
      notify.success('Team created', { description: t.name })
      await refreshTeams()
      switchTeam(t.id)
      navigate('/dashboard/team')
      setName('')
      setOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create team'
      notify.error(msg)
      // Try to refresh teams in case partial creation happened
      await refreshTeams()
    } finally {
      setIsCreating(false)
    }
  }

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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Teams</h1>
            <p className="text-slate-500 mt-1">Manage your workspace teams and collaborate with members</p>
          </div>
          
          {!activeWorkspaceId ? (
            <div className="text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border">
              Select or create a workspace first
            </div>
          ) : open ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm"
            >
              <Input 
                placeholder="Team name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-48 sm:w-60 border-slate-200" 
                autoFocus
              />
              <Button 
                onClick={createTeam} 
                disabled={isCreating || !name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Creating…' : 'Create'}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setOpen(false); setName('') }}>
                ✕
              </Button>
            </motion.div>
          ) : (
            <Button 
              onClick={() => setOpen(true)} 
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Team
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{teams.length}</p>
                  <p className="text-xs text-slate-500">Total Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {teams.filter((t: TeamDetail) => t.my_role === 'owner' || t.my_role === 'admin').length}
                  </p>
                  <p className="text-xs text-slate-500">Admin Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {Object.values(counts).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-xs text-slate-500">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {currentTeam ? 1 : 0}
                  </p>
                  <p className="text-xs text-slate-500">Active Team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No teams yet</h3>
              <p className="text-slate-500 text-center max-w-sm mb-4">
                Create your first team to start collaborating with your colleagues.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t: TeamDetail, index: number) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`group hover:shadow-md transition-all duration-200 cursor-pointer ${
                    currentTeam?.id === t.id 
                      ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50/30' 
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => { switchTeam(t.id); navigate('/dashboard/team') }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold ${
                          currentTeam?.id === t.id ? 'bg-blue-600' : 'bg-slate-700'
                        }`}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {t.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs px-2 py-0 h-5 gap-1 ${getRoleBadgeVariant(t.my_role)}`}>
                              {getRoleIcon(t.my_role)}
                              {t.my_role || 'member'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {currentTeam?.id === t.id && (
                        <Badge className="bg-blue-600 text-white text-xs">Active</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Users className="w-4 h-4" />
                        <span>{counts[t.id] ?? 0} members</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-400 hover:text-slate-600"
                              onClick={(e) => { e.stopPropagation(); navigate('/dashboard/team/members') }}
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Members</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-400 hover:text-slate-600"
                              onClick={(e) => { e.stopPropagation(); navigate('/dashboard/team/invite') }}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Invite Members</TooltipContent>
                        </Tooltip>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
