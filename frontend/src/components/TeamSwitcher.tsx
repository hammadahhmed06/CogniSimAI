// Team Switcher Component
import { ChevronDown, Plus, RefreshCcw } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useTeam } from '@/hooks/useTeam'
import { notify } from '@/lib/notify'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export function TeamSwitcher() {
  const { currentTeam, teams, switchTeam, loading, refreshTeams } = useTeam()
  const { activeWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const [rotating, setRotating] = useState(false)

  if (loading) {
    return <div className="w-32 h-8 bg-gray-200 animate-pulse rounded" />
  }

  const handleRefresh = async () => {
    setRotating(true)
    try { await refreshTeams() } finally { setTimeout(()=> setRotating(false), 600) }
  }

  // No workspace selected: disable control
  if (!activeWorkspaceId) {
    return (
      <Button variant="outline" size="sm" disabled className="h-9 text-sm px-3 gap-2 border-slate-300">
        Select Team
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>
    )
  }

  // No teams yet: show quick create CTA
  if (!loading && teams.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/teams')} className="h-9 text-sm px-3 gap-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50">
        <Plus className="h-3.5 w-3.5" /> Create Team
      </Button>
    )
  }

  const handleSwitch = (id: string) => {
    switchTeam(id)
    const name = teams.find(t => t.id === id)?.name || 'Team'
    notify.success(`Switched to ${name}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-sm px-3 gap-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100 font-medium text-slate-900">
          <span className="truncate text-slate-900">{currentTeam?.name || 'Select Team'}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleSwitch(team.id)}
            className={currentTeam?.id === team.id ? 'bg-accent' : ''}
          >
            {team.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard/teams')} className="text-sm flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Manage / Create
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefresh} className="text-sm flex items-center gap-2">
          <RefreshCcw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} /> Refresh list
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}