/**
 * Lightweight event bus for auth failure events.
 * Bridges the non-React API client with React components that can navigate.
 */

const AUTH_FAILURE_EVENT = 'auth:session-expired'

/** Dispatch an auth failure event (called from the API client on unrecoverable 401). */
export function emitAuthFailure(): void {
  window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT))
}

/** Subscribe to auth failure events. Returns an unsubscribe function. */
export function onAuthFailure(callback: () => void): () => void {
  window.addEventListener(AUTH_FAILURE_EVENT, callback)
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, callback)
}
