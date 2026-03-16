import { apiBase, apiFetch } from './client'

const p = (path: string) => apiBase(path)

export const authService = {
  sendInvite(email: string, redirect?: string) {
    return apiFetch<{ message: string; mode: 'admin_invite' | 'otp_fallback' }>(p('/api/auth/invite'), {
      method: 'POST',
      body: JSON.stringify({ email, redirect })
    })
  }
}
