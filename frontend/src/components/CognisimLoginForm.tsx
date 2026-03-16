'use client'

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthService } from '@/lib/supabase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Brain } from 'lucide-react'

export function CognisimLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'options' | 'email'>('options')

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { user, error } = await AuthService.signIn({ email, password })
      if (error) {
        setError(error.message)
      }
      // The useEffect above will handle navigation when auth state updates
    } catch {
      setError('Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect') || '/dashboard'
      const { error } = await AuthService.signInWithProvider('google', redirect)
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
      // Browser will redirect to provider; keep loading state
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect') || '/dashboard'
      const { error } = await AuthService.signInWithProvider('github', redirect)
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
      // Browser will redirect to provider; keep loading state
    } catch {
      setError('Failed to sign in with GitHub')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border border-white/10 bg-black p-0">
        <CardContent className="grid bg-transparent p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex items-center space-x-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white text-slate-900 font-bold shadow">
                    C
                  </div>
                  <span className="text-xl font-semibold text-white">CogniSim AI</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-balance text-slate-300">Choose how you&apos;d like to sign in</p>
              </div>

              {error && (
                <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {view === 'options' ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-white text-base font-semibold text-black hover:bg-gray-200 transition-colors flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setView('email')
                      setError('')
                    }}
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/5 text-base font-medium text-slate-100 transition hover:bg-white/10 flex items-center justify-center gap-3"
                  >
                    <Mail className="w-5 h-5" />
                    Continue with Email
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGitHubSignIn}
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/5 text-base font-medium text-slate-100 transition hover:bg-white/10 flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </Button>
                </div>
              ) : (
                <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                  <div className="grid gap-3">
                    <Label htmlFor="email" className="text-slate-200">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-white/20 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-sky-500"
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password" className="text-slate-200">
                        Password
                      </Label>
                      <a
                        href="/auth/forgot-password"
                        className="ml-auto text-sm text-sky-300 underline-offset-2 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-white/20 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-sky-500"
                    />
                    <p className="text-xs text-slate-400">Min 8 chars including lowercase, uppercase, number, and symbol.</p>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-lg bg-white text-base font-semibold text-slate-900 hover:bg-slate-100"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full rounded-lg text-base text-slate-200 hover:bg-white/10"
                    onClick={() => {
                      setView('options')
                      setIsLoading(false)
                    }}
                  >
                    Back to all sign-in options
                  </Button>
                </form>
              )}

              <div className="text-center text-sm text-slate-300">
                Don&apos;t have an account?{' '}
                <a href="/auth/signup" className="text-sky-300 underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </div>
          </div>
          <div className="relative hidden md:block bg-black border-l border-white/10">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center text-slate-200">
                <div className="mb-6">
                  <Brain className="mx-auto h-24 w-24 text-sky-300" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  AI-Powered Product Management
                </h3>
                <p className="text-slate-200">
                  Join thousands of product teams using CogniSim AI to streamline their Agile workflows.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-balance text-slate-400">
        By clicking continue, you agree to our{" "}
        <a href="/terms-of-service" className="text-sky-300 underline underline-offset-4 hover:text-sky-200 transition-colors">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" className="text-sky-300 underline underline-offset-4 hover:text-sky-200 transition-colors">
          Privacy Policy
        </a>.
      </div>
    </div>
  )
}
