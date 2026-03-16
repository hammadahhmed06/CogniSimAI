import { AppSidebar } from "@/components/app-sidebar"
import SkipLink from "@/components/SkipLink"
import { SiteHeader } from "@/components/site-header"
import { GlobalLoadingBar } from '@/components/GlobalLoadingBar'
import { CommandPalette } from '@/components/CommandPalette'
import { useBodyTheme } from "@/hooks/useBodyTheme"
import { useState, useEffect } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
  hideHeader?: boolean
  hideSidebar?: boolean
}

export function DashboardLayout({ children, hideHeader, hideSidebar }: DashboardLayoutProps) {
  useBodyTheme('app')
  
  // Get initial state from localStorage or default to 'hover'
  const [sidebarMode, setSidebarMode] = useState<'hover' | 'expanded' | 'collapsed'>(() => {
    const stored = localStorage.getItem('sidebar-mode')
    if (stored === 'hover' || stored === 'expanded' || stored === 'collapsed') {
      return stored
    }
    return 'hover'
  })

  // Persist sidebar mode
  useEffect(() => {
    localStorage.setItem('sidebar-mode', sidebarMode)
  }, [sidebarMode])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SkipLink />
      {!hideSidebar && <AppSidebar sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <GlobalLoadingBar />
        <CommandPalette />
        {!hideHeader && <SiteHeader />}
        <main id="main-content" tabIndex={-1} className={`${hideHeader ? 'p-2 sm:p-4' : 'p-4 sm:p-6'} ${hideHeader ? 'bg-white' : 'bg-slate-50'} font-space overflow-auto flex-1`}>
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
