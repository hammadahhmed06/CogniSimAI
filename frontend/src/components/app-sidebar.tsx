"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { 
  LayoutDashboardIcon, 
  FolderKanban, 
  Bug, 
  Building2, 
  Users, 
  SparklesIcon, 
  ChevronDown, 
  ChevronRight, 
  Plug,
  ChevronsLeft, 
  ChevronsRight, 
  MousePointer2,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Search,
  Command,
  MoreHorizontal,
  CreditCard,
  Database,
  BookOpen,
  Keyboard,
  LifeBuoy,
  BarChart3,
  Target,
  MessageSquare,
  BookMarked,
  UserPlus,
  LayoutGrid,
  FileText,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { projectService, type Project } from '@/lib/api/projectService'
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Constants
const SIDEBAR_WIDTH_EXPANDED = 260
const SIDEBAR_WIDTH_COLLAPSED = 64
const HOVER_DELAY = 150
const LEAVE_DELAY = 300

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  badge?: number | string
}

interface AppSidebarProps {
  sidebarMode: 'hover' | 'expanded' | 'collapsed'
  setSidebarMode: (mode: 'hover' | 'expanded' | 'collapsed') => void
}

// Navigation configuration
const primaryNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
  { title: "Issues", url: "/dashboard/issues", icon: Bug },
  { title: "PRDs", url: "/dashboard/prds", icon: FileText },
]

const secondaryNav: NavItem[] = [
  { title: "Workspaces", url: "/dashboard/workspaces", icon: Building2 },
  { title: "AI Agents", url: "/dashboard/agents", icon: SparklesIcon },
  { title: "Integrations", url: "/dashboard/integrations", icon: Plug },
]

const teamNav: NavItem[] = [
  { title: "All Teams", url: "/dashboard/teams", icon: LayoutGrid },
  { title: "Overview", url: "/dashboard/team", icon: LayoutGrid },
  { title: "Members", url: "/dashboard/team/members", icon: Users },
  { title: "Analytics", url: "/dashboard/team/analytics", icon: BarChart3 },
  { title: "Goals", url: "/dashboard/team/goals", icon: Target },
  { title: "Resources", url: "/dashboard/team/resources", icon: BookMarked },
  { title: "Chat", url: "/dashboard/team/chat", icon: MessageSquare },
  { title: "Invite", url: "/dashboard/team/invite", icon: UserPlus },
  { title: "Settings", url: "/dashboard/team/settings", icon: Settings },
]

// NavItem Component
const NavItemButton = React.memo(({ 
  item, 
  isExpanded, 
  isActive,
  onClick 
}: { 
  item: NavItem
  isExpanded: boolean
  isActive: boolean
  onClick: () => void
}) => {
  const Icon = item.icon

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "group relative flex items-center w-full rounded-lg transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            isExpanded ? "px-3 py-2.5 gap-3" : "px-0 py-2.5 justify-center",
            isActive 
              ? "bg-blue-50 text-blue-600" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Icon className={cn(
            "h-[18px] w-[18px] flex-shrink-0 transition-colors",
            isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
          )} />
          
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "text-sm font-medium truncate whitespace-nowrap",
                  isActive ? "text-blue-600" : "text-slate-700"
                )}
              >
                {item.title}
              </motion.span>
            )}
          </AnimatePresence>

          {item.badge && isExpanded && (
            <span className={cn(
              "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              isActive 
                ? "bg-blue-100 text-blue-700" 
                : "bg-slate-100 text-slate-600"
            )}>
              {item.badge}
            </span>
          )}
          
          {/* Active indicator */}
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-600 rounded-r-full"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      </TooltipTrigger>
      {!isExpanded && (
        <TooltipContent side="right" sideOffset={8} className="font-medium">
          {item.title}
        </TooltipContent>
      )}
    </Tooltip>
  )
})
NavItemButton.displayName = "NavItemButton"

// Collapsible Section Component
const CollapsibleSection = React.memo(({ 
  title, 
  icon: Icon, 
  items, 
  isExpanded,
  defaultOpen = false
}: { 
  title: string
  icon: React.ElementType
  items: NavItem[]
  isExpanded: boolean
  defaultOpen?: boolean
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  const isInSection = items.some(item => 
    location.pathname === item.url || location.pathname.startsWith(item.url + '/')
  )

  React.useEffect(() => {
    if (isInSection) setIsOpen(true)
  }, [isInSection])

  return (
    <div className="space-y-1">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "group flex items-center w-full rounded-lg transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isExpanded ? "px-3 py-2.5 gap-3" : "px-0 py-2.5 justify-center",
              isInSection 
                ? "text-blue-600" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className={cn(
              "h-[18px] w-[18px] flex-shrink-0 transition-colors",
              isInSection ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
            )} />
            
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1 flex-1 min-w-0"
                >
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isInSection ? "text-blue-600" : "text-slate-700"
                  )}>
                    {title}
                  </span>
                  <ChevronDown className={cn(
                    "ml-auto h-3.5 w-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-180"
                  )} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        {!isExpanded && (
          <TooltipContent side="right" sideOffset={8} className="font-medium">
            {title}
          </TooltipContent>
        )}
      </Tooltip>

      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-slate-200 space-y-0.5">
              {items.map((item) => {
                const isActive = location.pathname === item.url
                return (
                  <button
                    key={item.url}
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      isActive 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4",
                      isActive ? "text-blue-600" : "text-slate-500"
                    )} />
                    <span className="truncate">{item.title}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
CollapsibleSection.displayName = "CollapsibleSection"

// Projects Section with Recent Projects
const ProjectsSection = React.memo(({ isExpanded }: { isExpanded: boolean }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = React.useState(false)
  const [recentProjects, setRecentProjects] = React.useState<Project[]>([])
  
  const isInProjects = location.pathname.startsWith('/dashboard/projects')

  React.useEffect(() => {
    if (isInProjects) setIsOpen(true)
  }, [isInProjects])

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await projectService.listProjects()
        setRecentProjects(projects.slice(0, 3))
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }
    if (isOpen) loadProjects()
  }, [isOpen])

  return (
    <div className="space-y-1">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "group flex items-center w-full rounded-lg transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isExpanded ? "px-3 py-2.5 gap-3" : "px-0 py-2.5 justify-center",
              isInProjects 
                ? "text-blue-600" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <FolderKanban className={cn(
              "h-[18px] w-[18px] flex-shrink-0 transition-colors",
              isInProjects ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
            )} />
            
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1 flex-1 min-w-0"
                >
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isInProjects ? "text-blue-600" : "text-slate-700"
                  )}>
                    Projects
                  </span>
                  <ChevronDown className={cn(
                    "ml-auto h-3.5 w-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-180"
                  )} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        {!isExpanded && (
          <TooltipContent side="right" sideOffset={8} className="font-medium">
            Projects
          </TooltipContent>
        )}
      </Tooltip>

      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-slate-200 space-y-0.5">
              {recentProjects.map((project) => {
                const isActive = location.pathname.includes(`/dashboard/projects/${project.id}`)
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      isActive 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                      isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {project.key?.substring(0, 2) || project.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{project.name}</span>
                  </button>
                )
              })}
              <button
                onClick={() => navigate('/dashboard/projects')}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  location.pathname === '/dashboard/projects'
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <ChevronRight className="h-4 w-4" />
                <span>All Projects</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
ProjectsSection.displayName = "ProjectsSection"

// User Profile Section - Critical fix for hover mode
const UserProfile = React.memo(({ 
  isExpanded,
  onInteraction
}: { 
  isExpanded: boolean
  onInteraction?: (interacting: boolean) => void
}) => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [status, setStatus] = React.useState<'available' | 'busy' | 'away'>('available')

  // Detect if we're in a project context for integrations link
  const projectMatch = /\/dashboard\/projects\/([^/]+)/.exec(location.pathname)
  const currentProjectId = projectMatch?.[1]
  const integrationsUrl = currentProjectId 
    ? `/dashboard/projects/${currentProjectId}/integrations` 
    : '/dashboard/integrations'

  // Notify parent when dropdown is open to prevent sidebar collapse
  React.useEffect(() => {
    onInteraction?.(dropdownOpen)
  }, [dropdownOpen, onInteraction])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name[0].toUpperCase()
  }

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'available': return 'bg-emerald-500'
      case 'busy': return 'bg-red-500'
      case 'away': return 'bg-amber-500'
      default: return 'bg-slate-400'
    }
  }

  if (!user) return null

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center w-full rounded-lg transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            "hover:bg-slate-50",
            isExpanded ? "px-3 py-2.5 gap-3" : "px-0 py-2.5 justify-center"
          )}
        >
          <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8 border-2 border-slate-200">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white", getStatusColor(status))} />
          </div>
          
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium text-slate-900 truncate">{getUserDisplayName()}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {isExpanded && (
            <MoreHorizontal className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        className="w-64 p-2 rounded-xl border border-slate-200 shadow-xl bg-white"
        side="right"
        align="end"
        sideOffset={12}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={16}
        forceMount={dropdownOpen ? true : undefined}
        style={{ zIndex: 99999 }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-sidebar]')) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-sidebar]')) {
            e.preventDefault()
          }
        }}
      >
        {/* User Info */}
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-slate-200">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{getUserDisplayName()}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Account Actions */}
        <DropdownMenuItem
          onClick={() => { navigate('/account-settings'); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <Settings className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Account Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { navigate('/notifications'); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Notifications</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { navigate(integrationsUrl); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <Database className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Integrations</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { navigate('/subscription'); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <CreditCard className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Subscription</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Status Section */}
        <div className="px-2.5 py-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</span>
        </div>
        
        <DropdownMenuItem
          onClick={() => setStatus('available')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-slate-700">Available</span>
          {status === 'available' && <span className="ml-auto text-blue-600">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setStatus('busy')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm text-slate-700">Busy</span>
          {status === 'busy' && <span className="ml-auto text-blue-600">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setStatus('away')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm text-slate-700">Away</span>
          {status === 'away' && <span className="ml-auto text-blue-600">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Help & Support Section */}
        <div className="px-2.5 py-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Help & Support</span>
        </div>
        
        <DropdownMenuItem
          onClick={() => { navigate('/docs'); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <BookOpen className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Documentation</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))
            setDropdownOpen(false)
          }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <Keyboard className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Keyboard Shortcuts</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { navigate('/support'); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
        >
          <LifeBuoy className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">Contact Support</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Sign Out */}
        <DropdownMenuItem
          onClick={() => { handleSignOut(); setDropdownOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-red-50 focus:bg-red-50 group"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-600 group-hover:text-red-700">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
UserProfile.displayName = "UserProfile"

// Quick Search Button
const QuickSearchButton = React.memo(({ isExpanded }: { isExpanded: boolean }) => {
  const handleOpenSearch = () => {
    // Dispatch keyboard event to open command palette
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          onClick={handleOpenSearch}
          className={cn(
            "group flex items-center w-full rounded-lg border border-slate-200 transition-all duration-200",
            "hover:border-slate-300 hover:bg-slate-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isExpanded ? "px-3 py-2 gap-3" : "px-0 py-2 justify-center"
          )}
        >
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 flex-1"
              >
                <span className="text-sm text-slate-400">Search...</span>
                <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500">
                  <Command className="h-3 w-3" />K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </TooltipTrigger>
      {!isExpanded && (
        <TooltipContent side="right" sideOffset={8}>
          <div className="flex items-center gap-2">
            <span className="font-medium">Search</span>
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500">
              ⌘K
            </kbd>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
})
QuickSearchButton.displayName = "QuickSearchButton"

// Sidebar Mode Toggle
const SidebarModeToggle = React.memo(({ 
  sidebarMode, 
  setSidebarMode, 
  isExpanded 
}: { 
  sidebarMode: 'hover' | 'expanded' | 'collapsed'
  setSidebarMode: (mode: 'hover' | 'expanded' | 'collapsed') => void
  isExpanded: boolean
}) => {
  return (
    <DropdownMenu>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200",
                "hover:bg-slate-100 text-slate-500 hover:text-slate-700",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              )}
            >
              {sidebarMode === 'collapsed' ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-medium">
          Sidebar Options
        </TooltipContent>
      </Tooltip>
      
      <DropdownMenuContent align="start" sideOffset={8} className="w-48 p-1.5 rounded-xl" style={{ zIndex: 99999 }}>
        <DropdownMenuItem
          onClick={() => setSidebarMode('hover')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer"
        >
          <MousePointer2 className="h-4 w-4 text-slate-500" />
          <span className="text-sm">Expand on hover</span>
          {sidebarMode === 'hover' && <span className="ml-auto text-blue-600 text-sm">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSidebarMode('expanded')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer"
        >
          <ChevronsRight className="h-4 w-4 text-slate-500" />
          <span className="text-sm">Always expanded</span>
          {sidebarMode === 'expanded' && <span className="ml-auto text-blue-600 text-sm">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSidebarMode('collapsed')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer"
        >
          <ChevronsLeft className="h-4 w-4 text-slate-500" />
          <span className="text-sm">Collapsed</span>
          {sidebarMode === 'collapsed' && <span className="ml-auto text-blue-600 text-sm">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
SidebarModeToggle.displayName = "SidebarModeToggle"

// Main Sidebar Component
export function AppSidebar({ sidebarMode, setSidebarMode }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = React.useState(false)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const leaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Determine if sidebar is visually expanded
  const isExpanded = React.useMemo(() => {
    if (sidebarMode === 'expanded') return true
    if (sidebarMode === 'collapsed') return false
    return isHovered || isInteracting // hover mode - keep expanded if interacting with dropdown
  }, [sidebarMode, isHovered, isInteracting])

  const sidebarWidth = isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED

  // Hover handlers with debouncing
  const handleMouseEnter = React.useCallback(() => {
    if (sidebarMode !== 'hover') return
    
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true)
    }, HOVER_DELAY)
  }, [sidebarMode])

  const handleMouseLeave = React.useCallback(() => {
    if (sidebarMode !== 'hover') return
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    // Don't collapse if user is interacting with dropdown
    if (isInteracting) return
    
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, LEAVE_DELAY)
  }, [sidebarMode, isInteracting])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Spacer for layout */}
      <div 
        className="hidden md:block flex-shrink-0 transition-all duration-300 ease-out"
        style={{ width: sidebarWidth }}
      />
      
      {/* Fixed Sidebar */}
      <motion.aside
        data-sidebar="true"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-slate-200",
          "flex flex-col z-40 transition-shadow duration-300",
          isExpanded && sidebarMode === 'hover' && "shadow-xl shadow-slate-200/50"
        )}
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-14 border-b border-slate-100 flex-shrink-0",
          isExpanded ? "px-4 justify-between" : "px-2 justify-center"
        )}>
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-lg font-semibold text-slate-900 tracking-tight">CogniSim</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"
              >
                <span className="text-white font-bold text-sm">C</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <SidebarModeToggle
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            isExpanded={isExpanded}
          />
        </div>

        {/* Search */}
        <div className={cn(
          "flex-shrink-0 border-b border-slate-100",
          isExpanded ? "p-3" : "p-2"
        )}>
          <QuickSearchButton isExpanded={isExpanded} />
        </div>

        {/* Navigation Content */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3",
          isExpanded ? "px-3" : "px-2"
        )}>
          {/* Primary Navigation */}
          <div className="space-y-1 mb-4">
            {primaryNav.filter(item => item.title !== 'Projects').map((item) => (
              <NavItemButton
                key={item.url}
                item={item}
                isExpanded={isExpanded}
                isActive={location.pathname === item.url}
                onClick={() => navigate(item.url)}
              />
            ))}
          </div>

          {/* Projects Section */}
          <div className="mb-4">
            <ProjectsSection isExpanded={isExpanded} />
          </div>

          {/* Teams Section */}
          <div className="mb-4">
            <CollapsibleSection
              title="Teams"
              icon={Users}
              items={teamNav}
              isExpanded={isExpanded}
            />
          </div>

          {/* Divider */}
          <div className={cn(
            "h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-4",
            !isExpanded && "mx-2"
          )} />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            {secondaryNav.map((item) => (
              <NavItemButton
                key={item.url}
                item={item}
                isExpanded={isExpanded}
                isActive={location.pathname === item.url || location.pathname.startsWith(item.url + '/')}
                onClick={() => navigate(item.url)}
              />
            ))}
          </div>
        </nav>

        {/* Footer - User Profile */}
        <div className={cn(
          "flex-shrink-0 border-t border-slate-100",
          isExpanded ? "p-3" : "p-2"
        )}>
          <UserProfile isExpanded={isExpanded} onInteraction={setIsInteracting} />
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
