"use client"

import {
  FolderIcon,
  MoreHorizontalIcon,
  ShareIcon,
  type LucideIcon,
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-hooks"

export function NavDocuments({
  items,
  title = "Documents",
}: {
  items: {
    name?: string
    title?: string
    url: string
    icon: LucideIcon
    items?: { title: string; url: string }[]
  }[]
  title?: string
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-slate-700 font-semibold font-space">{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = location.pathname === item.url
          return (
            <SidebarMenuItem key={item.name || item.title}>
              <SidebarMenuButton 
                className={`hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 active:bg-blue-100 font-space text-slate-800 font-medium ${
                  isActive ? 'bg-blue-100 text-blue-800' : ''
                }`}
                onClick={() => navigate(item.url)}
              >
                <item.icon className="text-slate-700" />
                <span className="text-slate-800">{item.name || item.title}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    showOnHover
                    className="rounded-sm data-[state=open]:bg-blue-100 hover:bg-blue-50 text-blue-600"
                  >
                    <MoreHorizontalIcon />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-24 rounded-lg border-blue-200 font-space"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem 
                    className="hover:bg-blue-50 text-blue-700"
                    onClick={() => navigate(item.url)}
                  >
                    <FolderIcon />
                    <span>Open</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-blue-50 text-blue-700"
                    onClick={() => {
                      // TODO: Add configure functionality
                      console.log('Configure', item.name || item.title)
                    }}
                  >
                    <ShareIcon />
                    <span>Configure</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
        <SidebarMenuItem>
          <SidebarMenuButton 
            className="text-blue-500/70 hover:bg-blue-50 hover:text-blue-700 font-space"
            onClick={() => {
              // TODO: Add more functionality
              console.log('More clicked')
            }}
          >
            <MoreHorizontalIcon className="text-blue-500/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
