import { Star, FolderIcon } from "lucide-react"
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
import { getFavorites, type FavoriteItem } from "@/lib/favorites"

export function NavFavorites() {
  const navigate = useNavigate()
  const location = useLocation()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  // Load favorites from localStorage
  useEffect(() => {
    setFavorites(getFavorites())
    
    // Listen for favorites updates
    const handleUpdate = () => {
      setFavorites(getFavorites())
    }
    
    window.addEventListener('favorites-updated', handleUpdate)
    return () => window.removeEventListener('favorites-updated', handleUpdate)
  }, [])

  // Don't render if no favorites
  if (favorites.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden px-2">
      <SidebarGroupLabel className="text-slate-500 font-medium font-space text-xs flex items-center gap-2 px-1 mb-1">
        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
        Favorites
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {favorites.slice(0, 5).map((item) => {
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
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-slate-600'}`} />
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
