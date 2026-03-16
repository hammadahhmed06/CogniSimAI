import { type LucideIcon } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    badge?: number | string
  }[]
}) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + '/')
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  className={`justify-start font-space text-sm rounded-md w-full px-3 py-2 h-9 font-normal transition-colors ${
                    isActive 
                      ? 'text-blue-600' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => navigate(item.url)}
                >
                  {item.icon && (
                    <item.icon
                      data-icon
                      className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-600'} transition-colors`}
                    />
                  )}
                  <span className="truncate">{item.title}</span>
                  {item.badge !== undefined && (
                    <SidebarMenuBadge className={`ml-auto text-[10px] font-medium ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
