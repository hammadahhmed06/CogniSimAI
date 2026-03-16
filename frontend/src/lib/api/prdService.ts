/**
 * PRD Generator Service
 * 
 * API client for the PRD Generator backend endpoints.
 */

import { apiFetch, apiFetchBlob, apiBase, apiStream } from './client'

// Path helper (same pattern as agentService)
const p = (path: string) => apiBase(path)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PRDInput {
  problem_statement: string
  target_users: string | string[]
  success_metrics?: string
  constraints?: string
  jira_epic_key?: string
  confluence_space_key?: string
  slack_channel_id?: string
  template_version?: string
}

export interface UserPersona {
  name: string
  role: string
  pain_points: string[]
  goals: string[]
  behaviors: string[]
}

export interface AcceptanceCriteria {
  given: string
  when: string
  then: string
}

export interface FeatureSpec {
  id: string
  name: string
  description: string
  user_story: string
  acceptance_criteria: AcceptanceCriteria[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimated_effort?: string
  dependencies?: string[]
}

export interface TechnicalRequirements {
  architecture_overview: string
  api_specifications: string[]
  data_models: string[]
  integrations: string[]
  security_requirements: string[]
  performance_requirements: string[]
  scalability_requirements?: string[]
}

export interface RiskItem {
  id: string
  title: string
  description: string
  category: string
  level: 'critical' | 'high' | 'medium' | 'low'
  probability: string
  impact: string
  mitigation: string
  owner?: string
  contingency?: string
}

export interface TimelinePhase {
  phase_number: number
  name: string
  description: string
  duration: string
  deliverables: string[]
  milestones: string[]
  dependencies?: string[]
}

export interface CoherenceIssue {
  section: string
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  suggestion: string
}

export interface CoherenceReview {
  issues: CoherenceIssue[]
  overall_score: number
  recommendations: string[]
}

export interface ExecutiveSummary {
  problem_statement: string
  proposed_solution: string
  target_audience: string
  key_benefits: string[]
  success_metrics: string[]
  scope: { in_scope: string[]; out_of_scope: string[] }
}

export interface PRDDocument {
  id: string
  title: string
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'archived'
  executive_summary: ExecutiveSummary
  user_personas: UserPersona[]
  feature_specifications: FeatureSpec[]
  technical_requirements: TechnicalRequirements
  risks_and_mitigations: RiskItem[]
  timeline_and_phases: TimelinePhase[]
  coherence_review: CoherenceReview
  created_at?: string
  updated_at?: string
  generation_time_ms?: number
  tokens_used?: number
}

export interface PRDStreamEvent {
  // Backend emits: progress, section_start, section_complete, complete, error
  // API route may also emit: run_created, context_complete, saved
  type:
    | 'progress'
    | 'section_start'
    | 'section_complete'
    | 'complete'
    | 'saved'
    | 'run_created'
    | 'context_complete'
    | 'result'
    | 'error'
  section?: string
  data?: Record<string, unknown>
  message?: string
  percent?: number
  stage?: string
  error?: string
  prd_id?: string
  run_id?: string
}

export interface PRDTemplate {
  id: string
  version: string
  name: string
  description: string
  sections: Array<{
    type: string
    required: boolean
    max_words?: number
    max_personas?: number
    max_features?: number
    max_risks?: number
    max_phases?: number
  }>
  is_default: boolean
}

export interface BacklogIssueResult {
  feature_id: string
  feature_title: string
  issue_id?: string
  issue_key?: string
  error?: string
}

export interface CreateBacklogResponse {
  prd_id: string
  project_id: string
  created: number
  skipped: number
  dry_run: boolean
  items: BacklogIssueResult[]
}

export interface JiraExportItem {
  feature_id: string
  feature_title: string
  jira_key?: string
  jira_id?: string
  error?: string
}

export interface JiraExportResponse {
  created: number
  failed: number
  items: JiraExportItem[]
}

export interface PRDListItem {
  id: string
  title: string
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'archived'
  overall_quality_score?: number
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const prdService = {
  /**
   * Generate a PRD with streaming progress updates.
   * Uses the same pattern as agentService.decomposeStream
   */
  async generateStream(
    input: PRDInput,
    onEvent: (event: PRDStreamEvent) => void
  ): Promise<void> {
    let buffer = ''
    
    await apiStream(
      p('/api/prd/generate/stream'),
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      (chunk) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as PRDStreamEvent
              onEvent(event)
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    )
  },

  /**
   * Generate a PRD synchronously (non-streaming).
   */
  async generate(input: PRDInput): Promise<PRDDocument> {
    const response = await apiFetch<{ prd: PRDDocument }>(p('/api/prd/generate'), {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.prd
  },

  /**
   * List all PRDs for the current user.
   */
  async list(): Promise<PRDListItem[]> {
    return apiFetch<PRDListItem[]>(p('/api/prd/'))
  },

  /**
   * Get a specific PRD by ID.
   */
  async get(prdId: string): Promise<PRDDocument> {
    return apiFetch<PRDDocument>(p(`/api/prd/${prdId}`))
  },

  /**
   * Update a PRD.
   */
  async update(prdId: string, updates: Partial<PRDDocument>): Promise<PRDDocument> {
    return apiFetch<PRDDocument>(p(`/api/prd/${prdId}`), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a PRD.
   */
  async delete(prdId: string): Promise<void> {
    await apiFetch(p(`/api/prd/${prdId}`), { method: 'DELETE' })
  },

  /**
   * Regenerate a specific section of a PRD.
   */
  async regenerateSection(
    prdId: string,
    section: string,
    feedback?: string
  ): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(
      p(`/api/prd/${prdId}/sections/${section}/regenerate`),
      {
        method: 'POST',
        body: JSON.stringify({ feedback }),
      }
    )
  },

  /**
   * Update a specific section of a PRD.
   */
  async updateSection(
    prdId: string,
    section: string,
    content: Record<string, unknown>
  ): Promise<void> {
    await apiFetch(p(`/api/prd/${prdId}/sections/${section}`), {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    })
  },

  /**
   * Approve a PRD.
   */
  async approve(prdId: string, notes?: string): Promise<PRDDocument> {
    return apiFetch<PRDDocument>(p(`/api/prd/${prdId}/approve`), {
      method: 'POST',
      body: JSON.stringify({ notes }),
    })
  },

  /**
   * Export a PRD to a specific format.
   */
  async export(prdId: string, format: 'markdown' | 'pdf' | 'confluence' | 'notion'): Promise<Blob> {
    return apiFetchBlob(p(`/api/prd/${prdId}/export/${format}`))
  },

  /**
   * Get available PRD templates.
   */
  async getTemplates(): Promise<PRDTemplate[]> {
    return apiFetch<PRDTemplate[]>(p('/api/prd/templates'))
  },

  /**
   * Migrate a PRD to a new template version.
   */
  async migrateToTemplate(prdId: string, targetVersion: string): Promise<PRDDocument> {
    return apiFetch<PRDDocument>(p(`/api/prd/${prdId}/migrate`), {
      method: 'POST',
      body: JSON.stringify({ target_version: targetVersion }),
    })
  },

  /**
   * Create backlog issues from PRD features.
   */
  async createBacklog(
    prdId: string,
    projectId: string,
    options?: {
      featureIds?: string[]
      issueType?: string
      dryRun?: boolean
    }
  ): Promise<CreateBacklogResponse> {
    return apiFetch<CreateBacklogResponse>(p(`/api/prd/${prdId}/create-backlog`), {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        feature_ids: options?.featureIds,
        issue_type: options?.issueType ?? 'story',
        dry_run: options?.dryRun ?? false,
      }),
    })
  },

  /**
   * Export PRD features as Jira issues.
   */
  async exportToJira(
    prdId: string,
    integrationId: string,
    projectKey: string,
    options?: {
      featureIds?: string[]
      issueType?: string
      epicKey?: string
      labels?: string[]
    }
  ): Promise<JiraExportResponse> {
    return apiFetch<JiraExportResponse>(p(`/api/prd/${prdId}/export/jira`), {
      method: 'POST',
      body: JSON.stringify({
        integration_id: integrationId,
        project_key: projectKey,
        issue_type: options?.issueType ?? 'Story',
        feature_ids: options?.featureIds,
        epic_key: options?.epicKey,
        labels: options?.labels,
      }),
    })
  },
}

export default prdService
