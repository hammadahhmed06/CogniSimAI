import { CognisimLoginForm } from '@/components/CognisimLoginForm'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBodyTheme } from '@/hooks/useBodyTheme'
import Navbar from '@/components/Navbar'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  useBodyTheme('landing')

  useEffect(() => {
    if (!loading && user) {
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(redirect || '/dashboard', { replace: true })
    }
  }, [user, loading, location, navigate])
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <Navbar />
      
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 pt-20">
        <div className="relative z-10 w-full max-w-4xl">
          <CognisimLoginForm />
        </div>
      </div>
    </div>
  )
}
