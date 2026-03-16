import { useEffect, useMemo, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, UserPlus, Mail } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { teamService } from '@/lib/api/teamService'
import { apiBase, apiFetch } from '@/lib/api/client'
import { membersService } from '@/lib/api/membersService'
import { notify } from '@/lib/notify'

type Member = {
  user_id: string
  full_name?: string
  title?: string
  skills: string[]
  availability_status?: string
}

type TeamLike = { id: string; name: string; my_role?: 'viewer' | 'editor' | 'admin' | 'owner' }

function hasMyRole(t: unknown): t is TeamLike {
  return !!t && typeof t === 'object' && 'id' in t
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(24)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState('all')
  const { currentTeam, teams } = useTeam()
  const [teamUserIds, setTeamUserIds] = useState<Set<string>>(new Set())
  const [inviteEmail, setInviteEmail] = useState('')
  const teamId = currentTeam?.id
  const [filterTeamId, setFilterTeamId] = useState<string>('all')
  const myRole = hasMyRole(currentTeam) ? currentTeam.my_role : undefined
  const canManage = myRole === 'admin' || myRole === 'owner'

  useEffect(() => {
    const load = async () => {
      const skillParam = skill && skill !== 'all' ? skill : undefined
      const teamParam = filterTeamId !== 'all' ? filterTeamId : undefined
      const page = await membersService.list({ q, skill: skillParam, team_id: teamParam, limit, offset, sort: 'name' })
      setMembers(page.items)
      setTotal(page.total)
      setLimit(page.limit)
      setOffset(page.offset)
      setSelected(new Set())
    }
    load()
  }, [q, skill, filterTeamId, limit, offset])

  // Load current team member user IDs to mark which users are already in team
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!teamId) { setTeamUserIds(new Set()); return }
      try {
        const list = await teamService.listMembers(teamId)
        setTeamUserIds(new Set(list.map(m => m.user_id)))
      } catch {
        setTeamUserIds(new Set())
      }
    }
    loadTeamMembers()
  }, [teamId])

  const addToTeam = useCallback(async (userId: string) => {
    if (!teamId) { notify.info('Select a team first'); return }
    try {
      await teamService.addMember(teamId, { user_id: userId })
      notify.success('Added to team')
      // Update local set
      setTeamUserIds(prev => new Set(prev).add(userId))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add to team'
      notify.error(msg)
    }
  }, [teamId])

  const toggleSelect = useCallback((userId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId); else next.add(userId)
      return next
    })
  }, [])

  const batchAdd = useCallback(async () => {
    if (!teamId) { notify.info('Select a team first'); return }
    if (selected.size === 0) return
    try {
      const users = Array.from(selected).filter(id => !teamUserIds.has(id))
      if (users.length === 0) { notify.info('No new users to add'); return }
      const res = await teamService.addMembersBatch(teamId, users)
      notify.success(`Added ${res.added} member(s)`) 
      setTeamUserIds(prev => {
        const next = new Set(prev)
        users.forEach(u => next.add(u))
        return next
      })
      setSelected(new Set())
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Batch add failed'
      notify.error(msg)
    }
  }, [teamId, selected, teamUserIds])

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Members</h1>
        <div className="flex gap-2 items-center">
          {/* Filter by team (local, independent of current team) */}
          <Select value={filterTeamId} onValueChange={setFilterTeamId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Search by name or title" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {/* Optionally populate from API later */}
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
            </SelectContent>
          </Select>
          {canManage && (
            <div className="flex items-center gap-2">
              <Input className="w-56" placeholder="Invite by email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <Button size="sm" onClick={async () => {
                if (!teamId || !inviteEmail.trim()) return
                try {
                  await teamService.inviteMember(teamId, inviteEmail.trim())
                  notify.success('Invite sent')
                  setInviteEmail('')
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Invite failed'
                  notify.error(msg)
                }
              }}>Invite</Button>
            </div>
          )}
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">{total} users</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
          <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Next</Button>
          {canManage && (
            <Button size="sm" onClick={batchAdd} disabled={selected.size === 0}>Add selected</Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map(m => (
          <Card key={m.user_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{m.full_name || 'Unnamed User'}</CardTitle>
                {teamUserIds.has(m.user_id) && (
                  <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">Already in team</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">{m.title}</div>
              <div className="mt-2 text-sm"><span className="font-medium">Skills:</span> {m.skills?.join(', ') || '—'}</div>
              <div className="mt-1 text-sm"><span className="font-medium">Availability:</span> {m.availability_status || 'unknown'}</div>
              <div className="mt-3 flex items-center gap-2">
                {canManage && (
                  <input type="checkbox" className="h-4 w-4" checked={selected.has(m.user_id)} onChange={() => toggleSelect(m.user_id)} />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="px-2"
                      onClick={() => addToTeam(m.user_id)}
                      disabled={!teamId || !canManage || teamUserIds.has(m.user_id)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!canManage ? 'Insufficient permissions' : teamUserIds.has(m.user_id) ? 'Already in team' : 'Add to current team'}
                  </TooltipContent>
                </Tooltip>
                {canManage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="px-2" onClick={() => (window.location.href = '/dashboard/team/invite')}>
                        <Mail className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Invite to team</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
