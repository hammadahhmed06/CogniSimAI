import { apiBase, apiFetch, apiStream } from './client'

export interface StreamEvent {
  type: 'progress' | 'analyst_result' | 'author_result' | 'reviewer_result' | 'refiner_result' | 'result' | 'error' | 'run_created'
  stage?: string
  message?: string
  percent?: number
  data?: unknown
  error?: string
  run_id?: string
}

export interface GeneratedStoryDraft {
  title: string
  acceptance_criteria: string[]
  persona?: string
  user_value?: string
  risks?: string[]
}

export interface AnalystInsights {
  epic_summary: string
  primary_users: string[]
  success_metrics: string[]
  constraints?: string[]
  must_have_capabilities: string[]
}

export interface ReviewFeedback {
  llm_score?: number
  improvements?: string[]
  rationale?: string
}

export interface EpicDecomposeResponse {
  epic_id: string
  stories: GeneratedStoryDraft[]
  warnings: string[]
  model: string
  stub: boolean
  dry_run: boolean
  committed: boolean
  created_issue_ids?: string[]
  run_id?: string
  generated_at: string
  quality_score?: number
  warnings_count?: number
  duplicate_matches?: { story_index: number; story_title: string; existing_title: string; similarity: number }[]
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  epic_issue_key?: string
  analyst_insights?: AnalystInsights
  review_feedback?: ReviewFeedback
}

export interface AgentRunSummary {
  id: string
  agent_type: string
  action: string
  epic_id?: string
  status: string
  started_at: string
  ended_at?: string
  model?: string
  stub?: boolean
  created_issue_count: number
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  latency_ms?: number
  cost_usd_estimate?: number
  quality_score?: number
  warnings_count?: number
  prompt_version?: string
  regen_count?: number
}

export interface AgentUsageStats {
  total_runs: number
  runs_today: number
  stories_generated: number
  avg_quality_score: number
  total_tokens_used: number
  remaining_daily_limit: number
}

// Feature Request / Feedback Types
export interface FeatureRequest {
  id: string
  category: 'agent_request' | 'bug_report' | 'improvement' | 'general'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: string
  created_at: string
}

export interface FeatureRequestCreate {
  category: 'agent_request' | 'bug_report' | 'improvement' | 'general'
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high'
  contact_preference?: 'email' | 'none'
}

const p = (path: string) => apiBase(path)

export const agentService = {
  decompose(epicId: string, maxStories = 6, userPrompt?: string) {
    return apiFetch<EpicDecomposeResponse>(p('/api/agents/epic/decompose'), {
      method: 'POST',
      body: JSON.stringify({ epic_id: epicId, max_stories: maxStories, user_prompt: userPrompt || undefined })
    })
  },
  commitStory(runId: string, itemId: string, patch?: Partial<GeneratedStoryDraft>) {
    return apiFetch<{ run_id: string; item_id: string; created_issue_id?: string; status: string; title: string; acceptance_criteria: string[] }>(
      p(`/api/agents/runs/${runId}/items/${itemId}/commit`),
      { method: 'POST', body: JSON.stringify(patch || {}) }
    )
  },
  regenerateStory(runId: string, itemId: string, feedback?: string) {
    return apiFetch<{ run_id: string; item_id: string; status: string; title: string; acceptance_criteria: string[]; warnings: string[]; duplicate_matches?: { story_index: number; story_title: string; existing_title: string; similarity: number }[] }>(
      p(`/api/agents/runs/${runId}/items/${itemId}/regenerate`),
      { method: 'POST', body: JSON.stringify({ feedback }) }
    )
  },
  listRunItems(runId: string) {
    return apiFetch<{ id: string; item_index: number }[]>(p(`/api/agents/runs/${runId}/items`))
  },
  commit(epicId: string, stories: GeneratedStoryDraft[]) {
    return apiFetch<EpicDecomposeResponse>(p('/api/agents/epic/decompose'), {
      method: 'POST',
      body: JSON.stringify({ epic_id: epicId, stories })
    })
  },
  decomposeStream(
    epicId: string,
    maxStories = 6,
    userPrompt?: string,
    onEvent?: (event: StreamEvent) => void
  ) {
    let buffer = ''
    return apiStream(p('/api/agents/epic/decompose/stream'), {
      method: 'POST',
      body: JSON.stringify({ epic_id: epicId, max_stories: maxStories, user_prompt: userPrompt || undefined })
    }, (chunk) => {
      buffer += chunk
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      
      for (const part of parts) {
        if (part.startsWith('data: ')) {
          try {
            const data = JSON.parse(part.slice(6))
            onEvent?.(data as StreamEvent)
          } catch (e) {
            // ignore partial chunks
          }
        }
      }
    })
  },
  listTeams() {
    return apiFetch<{ id: string; name: string }[]>(p('/api/teams'))
  },
  // Agent runs
  listRuns(opts?: { epic_id?: string; limit?: number }) {
    const params = new URLSearchParams()
    if (opts?.epic_id) params.append('epic_id', opts.epic_id)
    if (opts?.limit) params.append('limit', String(opts.limit))
    const qs = params.toString()
    return apiFetch<AgentRunSummary[]>(p(`/api/agents/runs${qs ? '?' + qs : ''}`))
  },
  getRun(runId: string) {
    return apiFetch<AgentRunSummary & { output?: Record<string, unknown> }>(p(`/api/agents/runs/${runId}`))
  },
  
  // Feature Requests / Feedback
  submitFeedback(body: FeatureRequestCreate) {
    return apiFetch<FeatureRequest>(p('/api/agents/feedback'), {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },
  
  listMyFeedback(limit: number = 20) {
    return apiFetch<FeatureRequest[]>(p(`/api/agents/feedback?limit=${limit}`))
  }
}

