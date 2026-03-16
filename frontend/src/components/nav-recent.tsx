import { Clock, FolderIcon } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
// Recent items tracking with localStorage persistence
import { getRecentItems, type RecentItem } from "@/lib/recent"

export function NavRecent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // Load recent items from localStorage
  useEffect(() => {
    setRecentItems(getRecentItems())
    
    // Listen for recent items updates
    const handleUpdate = () => {
      setRecentItems(getRecentItems())
    }
    
    window.addEventListener('recent-updated', handleUpdate)
    return () => window.removeEventListener('recent-updated', handleUpdate)
  }, [])

  // Don't render if no recent items
  if (recentItems.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden px-2">
      <SidebarGroupLabel className="text-slate-500 font-medium font-space text-xs flex items-center gap-2 px-1 mb-1">
        <Clock className="h-3 w-3 text-slate-400" />
        Recent
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {recentItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.url
            const Icon = item.icon || FolderIcon
            
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  onClick={() => navigate(item.url)}
                  className={`font-space text-sm font-normal rounded-md px-3 py-2 transition-colors ${
                    isActive 
                      ? 'bg-slate-50 text-slate-900' 
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-slate-700' : 'text-slate-600'}`} />
                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
