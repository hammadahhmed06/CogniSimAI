import { apiBase, apiFetch } from './client'

export interface ProjectMetricsSummary {
  velocity_last_3: number
  avg_cycle_time_days: number | null
  wip_count: number
  issue_count: number
}

export const metricsService = {
  getProjectSummary: (projectId: string) => apiFetch<ProjectMetricsSummary>(apiBase(`/api/projects/${projectId}/metrics/summary`)),
}
