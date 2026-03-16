import { ISSUE_STATUSES, type IssueStatus } from '@/constants/issueStatus'
import type { IssueDTO } from '@/lib/api/issuesService'
import { normalizeStatus } from './enterpriseBoard'

export type ProjectSprintIssue = Pick<IssueDTO, 'id' | 'title' | 'issue_key' | 'status' | 'priority' | 'type' | 'sprint_id'>

export type SprintBoardItem = {
  id: string
  name: string
  column: IssueStatus
  issue: ProjectSprintIssue
}

export interface SprintBoardMetrics {
  total: number
  statusCounts: Record<IssueStatus, number>
  donePercentage: number
  highPriority: number
}

export const mapIssuesToBoardItems = (issues: ProjectSprintIssue[]): SprintBoardItem[] =>
  issues.map((issue) => ({
    id: issue.id,
    name: issue.title?.trim() || issue.issue_key || issue.id,
    column: normalizeStatus(issue.status),
    issue,
  }))

export const calculateSprintMetrics = (issues: ProjectSprintIssue[]): SprintBoardMetrics => {
  const statusCounts: Record<IssueStatus, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
  }

  let highPriority = 0

  issues.forEach((issue) => {
    const normalized = normalizeStatus(issue.status)
    statusCounts[normalized] += 1
    if (issue.priority && /^(p0|p1|high)$/i.test(issue.priority)) {
      highPriority += 1
    }
  })

  const total = issues.length
  const donePercentage = total === 0 ? 0 : Math.round((statusCounts.done / total) * 100)

  return {
    total,
    statusCounts,
    donePercentage,
    highPriority,
  }
}
