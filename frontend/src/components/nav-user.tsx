import * as React from "react"
import {
  BellIcon,
  CreditCardIcon,
  DatabaseIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
  BookOpenIcon,
  KeyboardIcon,
  LifeBuoyIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-hooks"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = React.useState<'available' | 'busy' | 'away'>('available')

  // Detect if we're in a project context
  const projectMatch = /\/dashboard\/projects\/([^/]+)/.exec(location.pathname)
  const currentProjectId = projectMatch?.[1]
  const integrationsUrl = currentProjectId 
    ? `/dashboard/projects/${currentProjectId}/integrations` 
    : '/dashboard/integrations'

  // Ensure light theme is always applied
  React.useEffect(() => {
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.remove('dark')
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-red-500'
      case 'away': return 'bg-amber-500'
    }
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
    if (!name) return 'U'
    
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  }

  if (!user) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-slate-50 hover:bg-slate-50 font-space transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-md border border-slate-200">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                  <AvatarFallback className="rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-white font-medium text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white ${getStatusColor()}`}
                  title={status.charAt(0).toUpperCase() + status.slice(1)}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-slate-900">{getUserDisplayName()}</span>
                <span className="truncate text-xs text-slate-500">
                  {user.email}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4 text-slate-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-slate-200 font-space z-[200]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-md border border-slate-200">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                  <AvatarFallback className="rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-white font-medium text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-slate-900">{getUserDisplayName()}</span>
                  <span className="truncate text-xs text-slate-500">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate('/account-settings')}
              >
                <UserCircleIcon className="text-slate-600" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate('/notifications')}
              >
                <BellIcon className="text-slate-600" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate(integrationsUrl)}
              >
                <DatabaseIcon className="text-slate-600" />
                Integrations
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate('/subscription')}
              >
                <CreditCardIcon className="text-slate-600" />
                Subscription
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-slate-500 px-2 font-medium">Status</DropdownMenuLabel>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => setStatus('available')}
              >
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                Available
                {status === 'available' && <span className="ml-auto text-slate-900">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => setStatus('busy')}
              >
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                Busy
                {status === 'busy' && <span className="ml-auto text-slate-900">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => setStatus('away')}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Away
                {status === 'away' && <span className="ml-auto text-slate-900">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-slate-500 px-2 font-medium">Help & Support</DropdownMenuLabel>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate('/docs')}
              >
                <BookOpenIcon className="text-slate-600" />
                Documentation
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => {
                  // Trigger keyboard shortcuts modal
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))
                }}
              >
                <KeyboardIcon className="text-slate-600" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-50 text-slate-700 cursor-pointer"
                onClick={() => navigate('/support')}
              >
                <LifeBuoyIcon className="text-slate-600" />
                Contact Support
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem 
              className="hover:bg-red-50 text-red-600 cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOutIcon className="text-red-500" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
