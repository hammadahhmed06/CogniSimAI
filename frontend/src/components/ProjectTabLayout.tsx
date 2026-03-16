import { ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { cn } from '@/lib/utils'
import { 
  Home, 
  LayoutDashboard, 
  ListTodo, 
  BarChart3, 
  Settings, 
  Plug 
} from 'lucide-react'

interface ProjectTabLayoutProps {
  children: ReactNode
}

const tabs = [
  { id: 'hub', label: 'Hub', icon: Home, path: '' },
  { id: 'board', label: 'Board', icon: LayoutDashboard, path: '/board' },
  { id: 'backlog', label: 'Backlog', icon: ListTodo, path: '/backlog' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'integrations', label: 'Integrations', icon: Plug, path: '/integrations' },
]

export function ProjectTabLayout({ children }: ProjectTabLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine active tab based on current path
  const getActiveTab = () => {
    const basePath = `/dashboard/projects/${projectId}`
    const currentPath = location.pathname

    if (currentPath === basePath) return 'hub'
    if (currentPath.includes('/board')) return 'board'
    if (currentPath.includes('/backlog')) return 'backlog'
    if (currentPath.includes('/reports')) return 'reports'
    if (currentPath.includes('/settings')) return 'settings'
    if (currentPath.includes('/integrations')) return 'integrations'
    
    return 'hub'
  }

  const activeTab = getActiveTab()

  const handleTabClick = (tabPath: string) => {
    const basePath = `/dashboard/projects/${projectId}`
    navigate(`${basePath}${tabPath}`)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Horizontal Tab Navigation */}
        <div className="border-b border-gray-200 bg-white px-6">
          <nav className="flex space-x-1" aria-label="Project navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </DashboardLayout>
  )
}
