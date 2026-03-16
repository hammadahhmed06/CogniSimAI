import { CognisimSignupForm } from '@/components/CognisimSignupForm'
import { useBodyTheme } from '@/hooks/useBodyTheme'
import Navbar from '@/components/Navbar'

export default function SignupPage() {
  useBodyTheme('landing')
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <Navbar />
      
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 pt-20">
        <div className="relative z-10 w-full max-w-4xl">
          <CognisimSignupForm />
        </div>
      </div>
    </div>
  )
}
