import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useBodyTheme } from '@/hooks/useBodyTheme'

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isProcessing, setIsProcessing] = useState(true)
  useBodyTheme('landing')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started, current URL:', window.location.href)
        
        // Get redirect target from URL params
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect') || '/dashboard'
        
        console.log('Target redirect:', redirect)

        // For GitHub OAuth, the URL contains the auth code and state
        // Let Supabase handle the session exchange automatically
        const urlParams = new URLSearchParams(window.location.search)
        const hasAuthCode = urlParams.get('code')
        
        console.log('Has auth code:', !!hasAuthCode)

        if (hasAuthCode) {
          // Wait for Supabase to process the OAuth callback
          console.log('OAuth code detected, waiting for session...')
          
          let attempts = 0
          const maxAttempts = 10
          
          while (attempts < maxAttempts) {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionData?.session) {
              console.log('Session found after', attempts + 1, 'attempts, redirecting to:', redirect)
              navigate(redirect, { replace: true })
              return
            }
            
            if (sessionError) {
              console.error('Session error:', sessionError)
              break
            }
            
            attempts++
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        // If no auth code or session not found, listen for auth state changes
        console.log('Setting up auth state listener...')
        
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session?.user?.email)
          
          if (event === 'SIGNED_IN' && session) {
            console.log('User signed in via state change, redirecting to:', redirect)
            authListener.subscription.unsubscribe()
            setIsProcessing(false)
            navigate(redirect, { replace: true })
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out, redirecting to login')
            authListener.subscription.unsubscribe()
            setIsProcessing(false)
            navigate('/auth/login', { replace: true })
          }
        })

        // Final fallback timeout
        setTimeout(async () => {
          console.log('Final timeout check...')
          const { data } = await supabase.auth.getSession()
          if (data?.session) {
            console.log('Final timeout: session found, redirecting')
            navigate(redirect, { replace: true })
          } else {
            console.log('Final timeout: no session, redirecting to login')
            navigate('/auth/login?error=auth_timeout', { replace: true })
          }
          authListener.subscription.unsubscribe()
          setIsProcessing(false)
        }, 10000)

      } catch (error) {
        console.error('Auth callback error:', error)
        setIsProcessing(false)
        navigate('/auth/login?error=unexpected_error', { replace: true })
      }
    }

    handleAuthCallback()
  }, [navigate, location])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
        {!isProcessing && (
          <p className="text-sm text-gray-500 mt-2">
            If this takes too long, please try signing in again.
          </p>
        )}
      </div>
    </div>
  )
}
