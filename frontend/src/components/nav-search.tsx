import { SearchIcon, Command } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSearch() {
  const openCommandPalette = () => {
    // Dispatch keyboard event to trigger command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true
    })
    window.dispatchEvent(event)
  }

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={openCommandPalette}
              className="bg-white hover:bg-slate-50 border border-slate-200/80 h-8 font-space text-slate-600 hover:text-slate-900 transition-all rounded-md"
              tooltip="Quick search (Ctrl+K)"
            >
              <SearchIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="flex-1 text-left text-[13px] font-normal">Search...</span>
              <kbd className="hidden group-data-[collapsible=icon]:hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                <Command className="h-3 w-3" />K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
