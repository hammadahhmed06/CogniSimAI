import { describe, expect, it } from 'vitest'

import {
  computeMetrics,
  filterIssues,
  groupIssues,
  normalizeStatus,
  type EnterpriseBoardIssue,
} from './enterpriseBoard'

type ProjectStub = EnterpriseBoardIssue['project']

const projectA: ProjectStub = {
  id: 'proj-a',
  name: 'Project A',
  key: 'A',
  type: 'scrum',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
}

const projectB: ProjectStub = {
  id: 'proj-b',
  name: 'Project B',
  key: 'B',
  type: 'kanban',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
}

const randomId = () => Math.random().toString(36).slice(2)

const issue = (overrides: Partial<EnterpriseBoardIssue>): EnterpriseBoardIssue => ({
  id: overrides.id ?? randomId(),
  issue_key: overrides.issue_key ?? 'PROJ-1',
  project_id: overrides.project_id ?? projectA.id,
  project: overrides.project ?? projectA,
  title: overrides.title ?? 'Sample issue',
  status: overrides.status ?? 'todo',
  priority: overrides.priority ?? 'medium',
  type: overrides.type ?? 'story',
  sprint_id: overrides.sprint_id ?? null,
  backlog_rank: overrides.backlog_rank ?? null,
  board_rank: overrides.board_rank ?? null,
})

describe('normalizeStatus', () => {
  it('maps friendly labels to canonical workflow states', () => {
    expect(normalizeStatus('To Do')).toBe('todo')
    expect(normalizeStatus('IN PROGRESS')).toBe('in_progress')
    expect(normalizeStatus('Completed')).toBe('done')
    expect(normalizeStatus(undefined)).toBe('todo')
  })
})

describe('groupIssues', () => {
  it('groups issues by normalized status', () => {
    const grouped = groupIssues([
      issue({ id: '1', status: 'TODO' }),
      issue({ id: '2', status: 'In Progress' }),
      issue({ id: '3', status: 'done' }),
      issue({ id: '4', status: 'unknown' }),
    ])

    expect(grouped.todo.map((i) => i.id)).toEqual(['1', '4'])
    expect(grouped.in_progress.map((i) => i.id)).toEqual(['2'])
    expect(grouped.done.map((i) => i.id)).toEqual(['3'])
  })
})

describe('filterIssues', () => {
  const issues = [
    issue({ id: 'a', project: projectA, project_id: projectA.id, status: 'todo', priority: 'high', type: 'bug' }),
    issue({ id: 'b', project: projectA, project_id: projectA.id, status: 'in_progress', priority: 'medium', type: 'story', title: 'Implement auth' }),
    issue({ id: 'c', project: projectB, project_id: projectB.id, status: 'done', priority: 'p0', type: 'incident', title: 'Critical fix' }),
  ]

  it('filters by project ids and statuses', () => {
    const filtered = filterIssues(issues, {
      projectIds: [projectA.id],
      statuses: ['todo'],
      priorities: [],
      types: [],
      search: '',
    })

    expect(filtered.map((i) => i.id)).toEqual(['a'])
  })

  it('filters by priority, type, and search term', () => {
    const filtered = filterIssues(issues, {
      projectIds: [],
      statuses: [],
      priorities: ['p0'],
      types: ['incident'],
      search: 'critical',
    })

    expect(filtered.map((i) => i.id)).toEqual(['c'])
  })
})

describe('computeMetrics', () => {
  it('summarises counts and percentages', () => {
    const metrics = computeMetrics([
      issue({ id: '1', status: 'todo', priority: 'high' }),
      issue({ id: '2', status: 'in_progress', priority: 'p1' }),
      issue({ id: '3', status: 'done', priority: 'medium' }),
    ])

    expect(metrics.total).toBe(3)
    expect(metrics.statusCounts.todo).toBe(1)
    expect(metrics.statusCounts.in_progress).toBe(1)
    expect(metrics.statusCounts.done).toBe(1)
    expect(metrics.highPriority).toBe(2)
    expect(metrics.donePercentage).toBe(33)
  })
})
