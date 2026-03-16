import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/lib/supabase/auth'
import { useBodyTheme } from '@/hooks/useBodyTheme'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useBodyTheme('landing')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const { error } = await AuthService.resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    } catch (err) {
      setError('Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-2xl">
        <Card className="overflow-hidden border border-white/10 bg-white/5 p-0 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white text-slate-900 font-bold shadow">C</div>
                  <span className="text-xl font-semibold text-white">CogniSim AI</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Forgot password</h1>
                <p className="text-balance text-slate-300">Enter your email and we’ll send you a reset link.</p>
              </div>

              {error && (
                <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
              )}

              {sent ? (
                <div className="space-y-6">
                  <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    If an account exists for {email}, a password reset link has been sent. Please check your inbox.
                  </div>
                  <Button className="w-full bg-white text-slate-900 hover:bg-slate-100" onClick={() => navigate('/auth/login')}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
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
                  <Button type="submit" className="w-full bg-white text-slate-900 hover:bg-slate-100" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send reset link'}
                  </Button>
                  <div className="text-center text-sm text-slate-300">
                    Remembered your password?{' '}
                    <a href="/auth/login" className="text-sky-300 underline underline-offset-4">Sign in</a>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-xs text-balance text-slate-400">
          If you don’t receive the email, check your spam folder.
        </div>
      </div>
    </div>
  )
}
