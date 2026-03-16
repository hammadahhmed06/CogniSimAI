import { ISSUE_STATUSES, type IssueStatus } from '@/constants/issueStatus'
import type { IssueDTO } from '@/lib/api/issuesService'
import type { ProjectDTO } from '@/lib/api/projectService'

export type EnterpriseBoardIssue = IssueDTO & {
  project: ProjectDTO
}

export interface BoardFilters {
  projectIds: string[]
  statuses: IssueStatus[]
  priorities: string[]
  types: string[]
  search?: string
}

export interface BoardMetrics {
  total: number
  statusCounts: Record<IssueStatus, number>
  highPriority: number
  donePercentage: number
  projectCounts: Record<string, number>
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? ''

export const normalizeStatus = (status?: string | null): IssueStatus => {
  const normalized = normalize(status).replace(/\s+/g, '_')
  if ((ISSUE_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as IssueStatus
  }
  if (normalized === 'in-progress') return 'in_progress'
  if (normalized === 'todo' || normalized === 'to_do' || normalized === 'to-do') return 'todo'
  if (normalized === 'done' || normalized === 'completed') return 'done'
  return 'todo'
}

export const groupIssues = (issues: EnterpriseBoardIssue[]) => {
  return issues.reduce<Record<IssueStatus, EnterpriseBoardIssue[]>>((acc, issue) => {
    const status = normalizeStatus(issue.status)
    acc[status].push({ ...issue, status })
    return acc
  }, {
    todo: [],
    in_progress: [],
    done: [],
  })
}

const matchSearch = (issue: EnterpriseBoardIssue, term?: string) => {
  if (!term) return true
  const haystack = `${issue.title ?? ''} ${issue.issue_key ?? ''}`.toLowerCase()
  return haystack.includes(term.toLowerCase())
}

export const filterIssues = (issues: EnterpriseBoardIssue[], filters: BoardFilters) => {
  return issues.filter((issue) => {
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(issue.project_id)) {
      return false
    }
    const normalizedStatus = normalizeStatus(issue.status)
    if (filters.statuses.length > 0 && !filters.statuses.includes(normalizedStatus)) {
      return false
    }
    const priority = normalize(issue.priority)
    if (filters.priorities.length > 0 && (priority === '' || !filters.priorities.includes(priority))) {
      return false
    }
    const type = normalize(issue.type)
    if (filters.types.length > 0 && (type === '' || !filters.types.includes(type))) {
      return false
    }
    if (!matchSearch(issue, filters.search)) {
      return false
    }
    return true
  })
}

export const computeMetrics = (issues: EnterpriseBoardIssue[]): BoardMetrics => {
  const statusCounts: Record<IssueStatus, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
  }
  let highPriority = 0
  const projectCounts: Record<string, number> = {}

  for (const issue of issues) {
    const status = normalizeStatus(issue.status)
    statusCounts[status] += 1
    const priority = normalize(issue.priority)
    if (priority.includes('high') || priority === 'p0' || priority === 'p1') {
      highPriority += 1
    }
    projectCounts[issue.project_id] = (projectCounts[issue.project_id] ?? 0) + 1
  }

  const total = issues.length
  const donePercentage = total === 0 ? 0 : Math.round((statusCounts.done / total) * 100)

  return {
    total,
    statusCounts,
    highPriority,
    donePercentage,
    projectCounts,
  }
}

export const uniquePriorities = (issues: EnterpriseBoardIssue[]) => {
  const set = new Set<string>()
  for (const issue of issues) {
    const value = normalize(issue.priority)
    if (value) set.add(value)
  }
  return Array.from(set).sort()
}

export const uniqueTypes = (issues: EnterpriseBoardIssue[]) => {
  const set = new Set<string>()
  for (const issue of issues) {
    const value = normalize(issue.type)
    if (value) set.add(value)
  }
  return Array.from(set).sort()
}
