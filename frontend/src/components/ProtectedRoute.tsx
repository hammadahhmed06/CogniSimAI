import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
  // Redirect to login page with return url; include a redirect param to avoid loops
  const redirect = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={{ pathname: "/auth/login", search: `?redirect=${redirect}` }} state={{ from: location }} replace />
  }

  return <>{children}</>
}
