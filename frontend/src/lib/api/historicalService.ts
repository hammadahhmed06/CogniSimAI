import { apiBase, apiFetch } from './client'

export interface ProjectMetricSnapshot {
  date: string
  open_issues: number
  closed_issues: number
  story_points_open: number
  story_points_closed: number
  velocity: number
  avg_cycle_time: number
  extra_metrics?: Record<string, any>
}

export const historicalService = {
  getProjectSnapshots: (projectId: string) =>
    apiFetch<ProjectMetricSnapshot[]>(apiBase(`/api/historical/project/${projectId}/snapshots`)),
}
