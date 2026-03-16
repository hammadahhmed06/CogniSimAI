// Frontend: Team context provider

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { teamService } from '@/lib/api/teamService'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface Team {
  id: string
  name: string
  members_count?: number
  my_role?: 'viewer' | 'editor' | 'admin' | 'owner'
}

interface TeamContextType {
  currentTeam: Team | null
  teams: Team[]
  switchTeam: (teamId: string) => void
  refreshTeams: () => Promise<void>
  loading: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const TeamContext = createContext<TeamContextType | null>(null)

interface TeamProviderProps {
  children: ReactNode
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace()
  const [autoCreating, setAutoCreating] = useState(false)

  const refreshTeams = useCallback(async () => {
    // Do not attempt to load teams until a workspace is active
    if (!activeWorkspaceId) {
      setTeams([])
      setCurrentTeam(null)
      setLoading(false)
      return
    }
    try {
      let teamsList = await teamService.listTeams()
      
      // Auto-create default team for new users who have no teams
      if (teamsList.length === 0 && !autoCreating) {
        setAutoCreating(true)
        try {
          console.log('No teams found, creating default team...')
          const newTeam = await teamService.createTeam('My Team')
          teamsList = [newTeam]
          console.log('Default team created:', newTeam.id)
        } catch (createErr) {
          console.error('Failed to auto-create default team:', createErr)
        } finally {
          setAutoCreating(false)
        }
      }
      
      setTeams(teamsList)

      // Auto-select saved or first team if none selected (per workspace)
      if (!currentTeam) {
        const saved = localStorage.getItem('currentTeamId')
        const preferred = saved ? teamsList.find(t => t.id === saved) : undefined
        const chosen = preferred || teamsList[0] || null
        if (chosen) {
          setCurrentTeam(chosen)
          try { localStorage.setItem('currentTeamId', chosen.id) } catch {/* ignore */}
        } else {
          setCurrentTeam(null)
        }
      } else if (!teamsList.find(t => t.id === currentTeam.id)) {
        // Previously selected team not in this workspace; clear selection
        setCurrentTeam(teamsList[0] || null)
        try { if (teamsList[0]?.id) localStorage.setItem('currentTeamId', teamsList[0].id) } catch {/* ignore */}
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspaceId, currentTeam, autoCreating])

  const switchTeam = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (team) {
      setCurrentTeam(team)
      localStorage.setItem('currentTeamId', teamId)
    }
  }, [teams])

  useEffect(() => {
    // Wait until workspace context finished initial load
    if (!wsLoading) {
      refreshTeams()
    }
  }, [wsLoading, refreshTeams, activeWorkspaceId])

  return (
    <TeamContext.Provider value={{
      currentTeam,
      teams,
      switchTeam,
      refreshTeams,
      loading
    }}>
      {children}
    </TeamContext.Provider>
  )
}