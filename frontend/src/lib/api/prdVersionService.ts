/**
 * PRD Version Service
 * 
 * API client for managing PRD version history.
 */

import { apiFetch, apiBase } from './client'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PRDVersion {
  id: string
  prd_id: string
  version_number: number
  change_summary?: string
  changed_sections?: string[]
  document_snapshot: Record<string, unknown>
  created_at: string
  created_by: string
  created_by_email?: string
}

export interface PRDVersionListResponse {
  items: PRDVersion[]
  total: number
}

export interface PRDVersionCompare {
  version_a: PRDVersion
  version_b: PRDVersion
  differences: {
    section: string
    field: string
    old_value: unknown
    new_value: unknown
  }[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const prdVersionService = {
  /**
   * List all versions for a PRD
   */
  listVersions: async (prdId: string): Promise<PRDVersion[]> => {
    const response = await apiFetch<PRDVersionListResponse>(
      apiBase(`/api/prd/${prdId}/versions`)
    )
    return response.items
  },

  /**
   * Get a specific version
   */
  getVersion: async (prdId: string, versionNumber: number): Promise<PRDVersion> => {
    return apiFetch<PRDVersion>(
      apiBase(`/api/prd/${prdId}/versions/${versionNumber}`)
    )
  },

  /**
   * Get the latest version of a PRD
   */
  getLatestVersion: async (prdId: string): Promise<PRDVersion | null> => {
    try {
      return apiFetch<PRDVersion>(apiBase(`/api/prd/${prdId}/versions/latest`))
    } catch {
      return null
    }
  },

  /**
   * Compare two versions
   */
  compareVersions: async (
    prdId: string,
    versionA: number,
    versionB: number
  ): Promise<PRDVersionCompare> => {
    return apiFetch<PRDVersionCompare>(
      apiBase(`/api/prd/${prdId}/versions/compare?v1=${versionA}&v2=${versionB}`)
    )
  },

  /**
   * Restore a specific version (creates new version from old snapshot)
   */
  restoreVersion: async (
    prdId: string,
    versionNumber: number
  ): Promise<PRDVersion> => {
    return apiFetch<PRDVersion>(
      apiBase(`/api/prd/${prdId}/versions/${versionNumber}/restore`),
      { method: 'POST' }
    )
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const formatVersionDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatVersionLabel = (version: PRDVersion): string => {
  return `v${version.version_number}${version.change_summary ? ` - ${version.change_summary}` : ''}`
}
