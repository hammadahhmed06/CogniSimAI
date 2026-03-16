import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/lib/supabase/auth'
import PasswordRequirements from '@/components/PasswordRequirements'
import { checkPasswordParts, meetsAllPasswordRequirements } from '@/lib/password'
import { useBodyTheme } from '@/hooks/useBodyTheme'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // When user lands here from email link, Supabase places a recovery session.
  useEffect(() => {
    // No-op here; AuthCallback handles session exchange for OAuth.
    // For reset, Supabase SDK attaches the recovery session automatically.
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (!meetsAllPasswordRequirements(password)) {
      setError('Please meet all password requirements')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await AuthService.updatePassword(password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/auth/login', { replace: true }), 1500)
      }
    } catch (err) {
      setError('Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  useBodyTheme('landing')

  const parts = checkPasswordParts(password)

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
                <h1 className="text-2xl font-bold text-white">Reset password</h1>
                <p className="text-balance text-slate-300">Choose a new password for your account.</p>
              </div>

              {error && (
                <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
              )}

              {success && (
                <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  Password updated. Redirecting to sign in…
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-3">
                  <Label htmlFor="password" className="text-slate-200">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-white/20 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-sky-500"
                  />
                  <PasswordRequirements password={password} theme="dark" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirm" className="text-slate-200">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-white/20 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-sky-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-slate-900 hover:bg-slate-100"
                  disabled={
                    isLoading || !parts.length || !parts.lower || !parts.upper || !parts.digit || !parts.symbol
                  }
                >
                  {isLoading ? 'Updating…' : 'Update password'}
                </Button>
                <div className="text-center text-sm text-slate-300">
                  <a href="/auth/login" className="text-sky-300 underline underline-offset-4">Back to sign in</a>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-xs text-balance text-slate-400">
          Make sure your new password is unique and not used on other websites.
        </div>
      </div>
    </div>
  )
}
