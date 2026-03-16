/**
 * Jira OAuth Callback Page
 * Handles the OAuth redirect from Jira and completes the authorization
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function JiraOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      setStatus('error')
      setMessage(errorDescription || 'Authorization failed')
      return
    }

    if (!code || !state) {
      setStatus('error')
      setMessage('Missing authorization code or state')
      return
    }

    // The backend will automatically handle the OAuth callback
    // when it receives the code and state parameters
    // Just wait a moment and then redirect to integrations
    setTimeout(() => {
      setStatus('success')
      setMessage('Jira connected successfully!')
      
      // Redirect to integrations page after 2 seconds
      setTimeout(() => {
        navigate('/dashboard/integrations', { replace: true })
      }, 2000)
    }, 1500)
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Connecting to Jira...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete the authorization'}
            {status === 'success' && message}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <p className="text-sm text-slate-600">
              This should only take a moment...
            </p>
          )}
          {status === 'success' && (
            <p className="text-sm text-slate-600">
              Redirecting to integrations page...
            </p>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/dashboard/integrations')} className="mt-4">
              Return to Integrations
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
