/**
 * Agent Configuration Service
 * 
 * API client for managing enterprise agent customization.
 */

import { apiFetch, apiBase } from './client'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AgentType = 'epic_decomposer' | 'prd_generator'

export interface AgentInstructionsConfig {
  system_prompt_prefix?: string
  system_prompt_suffix?: string
  custom_instructions?: string
  output_format_override?: string
  tone?: string
  language?: string
  industry_context?: string
  company_context?: string
  glossary?: Record<string, string>
}

export interface EpicDecomposerConfig {
  min_stories?: number
  max_stories?: number
  default_stories?: number
  story_title_format?: string
  acceptance_criteria_format?: string
  min_acceptance_criteria?: number
  max_acceptance_criteria?: number
  include_risks?: boolean
  include_story_points?: boolean
  include_dependencies?: boolean
  default_personas?: string[]
}

export interface PRDGeneratorConfig {
  template_version?: string
  include_executive_summary?: boolean
  include_personas?: boolean
  include_user_journeys?: boolean
  include_features?: boolean
  include_technical_requirements?: boolean
  include_risks?: boolean
  include_timeline?: boolean
  include_success_metrics?: boolean
  min_features?: number
  max_features?: number
  default_max_features?: number
  min_personas?: number
  max_personas?: number
  risk_categories?: string[]
  default_export_format?: string
  include_table_of_contents?: boolean
  include_version_history?: boolean
}

export interface AgentConfig {
  id: string
  workspace_id: string
  agent_type: AgentType
  name: string
  description?: string
  is_default: boolean
  is_active: boolean
  instructions: AgentInstructionsConfig
  epic_decomposer_config?: EpicDecomposerConfig
  prd_generator_config?: PRDGeneratorConfig
  created_at: string
  updated_at: string
  created_by: string
}

export interface AgentConfigCreate {
  agent_type: AgentType
  name: string
  description?: string
  is_default?: boolean
  is_active?: boolean
  instructions?: AgentInstructionsConfig
  epic_decomposer_config?: EpicDecomposerConfig
  prd_generator_config?: PRDGeneratorConfig
}

export interface AgentConfigUpdate {
  name?: string
  description?: string
  is_default?: boolean
  is_active?: boolean
  instructions?: AgentInstructionsConfig
  epic_decomposer_config?: EpicDecomposerConfig
  prd_generator_config?: PRDGeneratorConfig
}

export interface AgentConfigListResponse {
  items: AgentConfig[]
  total: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const agentConfigService = {
  /**
   * List all agent configurations for the workspace
   */
  list: async (agentType?: AgentType, activeOnly = true): Promise<AgentConfig[]> => {
    const params = new URLSearchParams()
    if (agentType) params.set('agent_type', agentType)
    if (!activeOnly) params.set('active_only', 'false')
    
    const url = params.toString() 
      ? apiBase(`/api/agent-configs?${params.toString()}`)
      : apiBase('/api/agent-configs')
    
    const response = await apiFetch<AgentConfigListResponse>(url)
    return response.items
  },

  /**
   * Get the default/active configuration for an agent type
   */
  getDefault: async (agentType: AgentType): Promise<AgentConfig | null> => {
    try {
      const response = await apiFetch<AgentConfig>(
        apiBase(`/api/agent-configs/default/${agentType}`)
      )
      return response
    } catch {
      return null
    }
  },

  /**
   * Get a specific configuration by ID
   */
  get: async (configId: string): Promise<AgentConfig> => {
    return apiFetch<AgentConfig>(apiBase(`/api/agent-configs/${configId}`))
  },

  /**
   * Create a new configuration
   */
  create: async (config: AgentConfigCreate): Promise<AgentConfig> => {
    return apiFetch<AgentConfig>(apiBase('/api/agent-configs'), {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  /**
   * Update a configuration
   */
  update: async (configId: string, update: AgentConfigUpdate): Promise<AgentConfig> => {
    return apiFetch<AgentConfig>(apiBase(`/api/agent-configs/${configId}`), {
      method: 'PATCH',
      body: JSON.stringify(update),
    })
  },

  /**
   * Delete a configuration
   */
  delete: async (configId: string): Promise<void> => {
    await apiFetch(apiBase(`/api/agent-configs/${configId}`), {
      method: 'DELETE',
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const getAgentTypeName = (type: AgentType): string => {
  switch (type) {
    case 'epic_decomposer':
      return 'Epic Architect'
    case 'prd_generator':
      return 'PRD Generator'
    default:
      return type
  }
}

export const getAgentTypeDescription = (type: AgentType): string => {
  switch (type) {
    case 'epic_decomposer':
      return 'Transform epics into well-structured user stories'
    case 'prd_generator':
      return 'Generate comprehensive Product Requirements Documents'
    default:
      return ''
  }
}
