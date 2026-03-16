/**
 * Custom error class for API responses that preserves HTTP status information.
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly statusText: string

  constructor(status: number, statusText: string, message?: string) {
    super(message || statusText || 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }
}
