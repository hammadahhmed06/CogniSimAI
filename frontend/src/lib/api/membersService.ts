import { apiBase, apiFetch } from './client'

export type Member = {
  user_id: string
  email?: string
  full_name?: string
  title?: string
  skills: string[]
  availability_status?: string
  avatar_url?: string
}

export type MembersPage = {
  items: Member[]
  total: number
  limit: number
  offset: number
}

const p = (path: string) => apiBase(path)

export const membersService = {
  list(params: { q?: string; skill?: string; team_id?: string; limit?: number; offset?: number; sort?: 'name' | 'availability' } = {}) {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.skill) sp.set('skill', params.skill)
    if (params.team_id) sp.set('team_id', params.team_id)
    if (typeof params.limit === 'number') {
      const safeLimit = Math.min(Math.max(params.limit, 1), 100)
      sp.set('limit', String(safeLimit))
    }
    if (typeof params.offset === 'number') sp.set('offset', String(params.offset))
    if (params.sort) sp.set('sort', params.sort)
    return apiFetch<MembersPage>(p(`/api/members?${sp.toString()}`))
  }
}
