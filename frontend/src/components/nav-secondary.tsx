"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()
  const location = useLocation()

  if (!items || items.length === 0) {
    return null
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  className={`font-space text-sm rounded-md px-3 py-2 h-9 font-normal transition-colors ${
                    isActive 
                      ? 'text-blue-600' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => navigate(item.url)}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
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
