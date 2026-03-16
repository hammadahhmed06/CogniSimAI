import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { onAuthFailure } from '@/lib/api/auth-event'
import { notify } from '@/lib/notify'

/**
 * Invisible component that listens for auth failure events emitted by the
 * API client and reacts by signing the user out and redirecting to login.
 *
 * Must be mounted inside both <AuthProvider> and <BrowserRouter>.
 */
export function AuthFailureListener() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const handling = useRef(false) // prevent duplicate handling from concurrent 401s

  useEffect(() => {
    const handleAuthFailure = async () => {
      if (handling.current) return
      handling.current = true

      notify.error('Session expired. Please sign in again.', { duration: 6000 })

      try {
        await signOut()
      } catch {
        // sign-out may also fail if the session is already gone – that's fine
      }

      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      navigate(`/auth/login?redirect=${redirect}`, { replace: true })

      // Reset after a short delay so future failures (e.g., after re-login) are handled
      setTimeout(() => { handling.current = false }, 2000)
    }

    return onAuthFailure(handleAuthFailure)
  }, [signOut, navigate])

  return null
}
