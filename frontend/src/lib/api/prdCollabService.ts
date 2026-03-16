/**
 * PRD Collaboration Service
 *
 * API client for PRD comments and reviewers.
 */

import { apiFetch, apiBase } from './client'

const p = (path: string) => apiBase(path)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PRDComment {
  id: string
  prd_id: string
  section: string
  field_path?: string
  body: string
  parent_id?: string
  author_id: string
  author_email?: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  replies?: PRDComment[]
}

export interface PRDReviewer {
  id: string
  prd_id: string
  user_id: string
  email?: string
  status: 'pending' | 'approved' | 'changes_requested' | 'commented'
  feedback?: string
  reviewed_at?: string
  assigned_by?: string
  assigned_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const prdCollabService = {
  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(prdId: string, section?: string): Promise<PRDComment[]> {
    const qs = section ? `?section=${encodeURIComponent(section)}` : ''
    return apiFetch<PRDComment[]>(p(`/api/prd/${prdId}/comments${qs}`))
  },

  async createComment(
    prdId: string,
    data: { section: string; body: string; parent_id?: string; field_path?: string }
  ): Promise<PRDComment> {
    return apiFetch<PRDComment>(p(`/api/prd/${prdId}/comments`), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateComment(
    prdId: string,
    commentId: string,
    data: { body?: string; resolved?: boolean }
  ): Promise<PRDComment> {
    return apiFetch<PRDComment>(p(`/api/prd/${prdId}/comments/${commentId}`), {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteComment(prdId: string, commentId: string): Promise<void> {
    await apiFetch(p(`/api/prd/${prdId}/comments/${commentId}`), {
      method: 'DELETE',
    })
  },

  // ── Reviewers ─────────────────────────────────────────────────────────────

  async listReviewers(prdId: string): Promise<PRDReviewer[]> {
    return apiFetch<PRDReviewer[]>(p(`/api/prd/${prdId}/reviewers`))
  },

  async assignReviewer(
    prdId: string,
    data: { user_id: string; email?: string }
  ): Promise<PRDReviewer> {
    return apiFetch<PRDReviewer>(p(`/api/prd/${prdId}/reviewers`), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateReviewerStatus(
    prdId: string,
    reviewerId: string,
    data: { status: string; feedback?: string }
  ): Promise<PRDReviewer> {
    return apiFetch<PRDReviewer>(p(`/api/prd/${prdId}/reviewers/${reviewerId}`), {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async removeReviewer(prdId: string, reviewerId: string): Promise<void> {
    await apiFetch(p(`/api/prd/${prdId}/reviewers/${reviewerId}`), {
      method: 'DELETE',
    })
  },
}

export default prdCollabService
