import { supabase } from '@/lib/supabase/client'
import { ApiError } from '@/lib/api/errors'
import { emitAuthFailure } from '@/lib/api/auth-event'

export type Json = unknown

// Build base URL: use VITE_API_URL from env, fallback to empty string for dev proxy
export const apiBase = (path: string) => {
  // In production, VITE_API_URL will be the full backend URL
  // In development, empty string uses Vite proxy
  const base = import.meta.env.VITE_API_URL || ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Inject the Supabase access token + workspace/team headers into a Headers object. */
async function injectAuthHeaders(headers: Headers): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  } catch {
    // ignore – proceed without token
  }

  try {
    const activeWorkspaceId = localStorage.getItem('activeWorkspaceId')
    if (activeWorkspaceId && !headers.has('X-Workspace-Id')) {
      headers.set('X-Workspace-Id', activeWorkspaceId)
    }
    const currentTeamId = localStorage.getItem('currentTeamId')
    if (currentTeamId && !headers.has('X-Team-Id')) {
      headers.set('X-Team-Id', currentTeamId)
    }
  } catch { /* ignore */ }
}

/** Extract a human-readable message from an error response payload. */
function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>
    const first = [p.message, p.error, p.detail].find(
      (v) => typeof v === 'string'
    ) as string | undefined
    if (first) return first
  }
  return fallback || 'Request failed'
}

/**
 * Attempt to recover from a 401 by refreshing the Supabase session.
 * Returns a fresh access token on success, or `null` if unrecoverable.
 */
async function tryRefreshSession(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) return null
    return data.session.access_token
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

export async function apiFetch<T = Json>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  await injectAuthHeaders(headers)

  let res = await fetch(input, { ...init, headers })

  // --- 401 interceptor: refresh session & retry once ---
  if (res.status === 401) {
    const newToken = await tryRefreshSession()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(input, { ...init, headers })
    }
    if (res.status === 401) {
      emitAuthFailure()
      throw new ApiError(401, res.statusText, 'Session expired')
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await res.json().catch(() => ({})) : await res.text()

  if (!res.ok) {
    const message = extractErrorMessage(payload, res.statusText)
    throw new ApiError(res.status, res.statusText, message)
  }

  return payload as T
}

// ---------------------------------------------------------------------------
// apiFetchBlob
// ---------------------------------------------------------------------------

export async function apiFetchBlob(
  input: string,
  init: RequestInit = {}
): Promise<Blob> {
  const headers = new Headers(init.headers || {})
  await injectAuthHeaders(headers)

  let res = await fetch(input, { ...init, headers })

  // --- 401 interceptor: refresh session & retry once ---
  if (res.status === 401) {
    const newToken = await tryRefreshSession()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(input, { ...init, headers })
    }
    if (res.status === 401) {
      emitAuthFailure()
      throw new ApiError(401, res.statusText, 'Session expired')
    }
  }

  if (!res.ok) {
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const payload: unknown = isJson ? await res.json().catch(() => ({})) : await res.text()
    const message = extractErrorMessage(payload, res.statusText)
    throw new ApiError(res.status, res.statusText, message)
  }

  return res.blob()
}

// ---------------------------------------------------------------------------
// apiStream
// ---------------------------------------------------------------------------

export async function apiStream(
  input: string,
  init: RequestInit = {},
  onChunk: (chunk: string) => void
): Promise<void> {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  await injectAuthHeaders(headers)

  let res = await fetch(input, { ...init, headers })

  // --- 401 interceptor: refresh session & retry once ---
  if (res.status === 401) {
    const newToken = await tryRefreshSession()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(input, { ...init, headers })
    }
    if (res.status === 401) {
      emitAuthFailure()
      throw new ApiError(401, res.statusText, 'Session expired')
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, `Stream failed: ${res.status} ${res.statusText}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Response body is null')

  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}
