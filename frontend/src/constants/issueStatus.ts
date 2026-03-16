// Central definition of canonical issue workflow statuses.
export const ISSUE_STATUSES = ['todo','in_progress','done'] as const
export type IssueStatus = typeof ISSUE_STATUSES[number]
