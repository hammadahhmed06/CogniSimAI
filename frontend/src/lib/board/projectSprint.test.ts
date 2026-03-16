import { describe, expect, it } from 'vitest'

import { calculateSprintMetrics, mapIssuesToBoardItems, type ProjectSprintIssue } from './projectSprint'

describe('mapIssuesToBoardItems', () => {
  it('maps issues into kanban-ready payloads with normalized statuses', () => {
    const issues: ProjectSprintIssue[] = [
      { id: '1', title: 'First task', issue_key: 'PRJ-1', status: 'To Do', sprint_id: null },
      { id: '2', title: 'Second task', issue_key: 'PRJ-2', status: 'IN PROGRESS', sprint_id: 's1' },
      { id: '3', title: 'Third task', issue_key: 'PRJ-3', status: 'Completed', sprint_id: 's1' },
    ]

    const items = mapIssuesToBoardItems(issues)

    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ id: '1', name: 'First task', column: 'todo' })
    expect(items[1]).toMatchObject({ id: '2', name: 'Second task', column: 'in_progress' })
    expect(items[2]).toMatchObject({ id: '3', name: 'Third task', column: 'done' })
  })
})

describe('calculateSprintMetrics', () => {
  it('summarises totals, status counts, and done percentage', () => {
    const issues: ProjectSprintIssue[] = [
      { id: '1', title: 'First task', issue_key: 'PRJ-1', status: 'To Do', priority: 'high', sprint_id: null },
      { id: '2', title: 'Second task', issue_key: 'PRJ-2', status: 'IN PROGRESS', priority: 'medium', sprint_id: 's1' },
      { id: '3', title: 'Third task', issue_key: 'PRJ-3', status: 'Completed', priority: 'P0', sprint_id: 's1' },
    ]

    const metrics = calculateSprintMetrics(issues)

    expect(metrics.total).toBe(3)
    expect(metrics.statusCounts).toEqual({ todo: 1, in_progress: 1, done: 1 })
    expect(metrics.highPriority).toBe(2)
    expect(metrics.donePercentage).toBe(33)
  })

  it('handles empty collections', () => {
    const metrics = calculateSprintMetrics([])

    expect(metrics.total).toBe(0)
    expect(metrics.statusCounts).toEqual({ todo: 0, in_progress: 0, done: 0 })
    expect(metrics.highPriority).toBe(0)
    expect(metrics.donePercentage).toBe(0)
  })
})
