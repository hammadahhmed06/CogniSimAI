import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Command } from 'cmdk'
import { Briefcase, Database, LayoutDashboard, FolderIcon, Plus, Keyboard, Users, Settings2, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useWorkspace } from '@/contexts/WorkspaceContext'

type CommandPaletteProps = Record<string, never>

// Simple registry; can be extended later programmatically
interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  group: string
  icon?: JSX.Element
  keywords?: string
  action: () => void
}

export function CommandPalette(_: CommandPaletteProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { workspaces, setActiveWorkspace, activeWorkspaceId } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Hotkey: Ctrl+K / Cmd+K or Ctrl+P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const close = useCallback(() => { setOpen(false); setSearch('') }, [])

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name))

  const baseItems: PaletteItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      group: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => { navigate('/dashboard'); close() }
    },
    {
      id: 'nav-workspaces',
      title: 'Manage Workspaces',
      group: 'Navigation',
      icon: <Briefcase className="w-4 h-4" />,
      action: () => { navigate('/dashboard/workspaces'); close() }
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      group: 'Navigation',
      icon: <FolderIcon className="w-4 h-4" />,
      action: () => { navigate('/dashboard/projects'); close() }
    },
    {
      id: 'nav-issues',
      title: 'Go to Issues',
      group: 'Navigation',
      icon: <FolderIcon className="w-4 h-4" />,
      action: () => { navigate('/dashboard/issues'); close() }
    },
    {
      id: 'nav-teams',
      title: 'Go to Teams',
      group: 'Navigation',
      icon: <Users className="w-4 h-4" />,
      action: () => { navigate('/dashboard/teams'); close() }
    },
    {
      id: 'action-new-workspace',
      title: 'Create Workspace…',
      group: 'Actions',
      icon: <Plus className="w-4 h-4" />,
      action: () => { dispatch('open-create-workspace'); close() }
    },
    {
      id: 'action-open-members',
      title: 'Open Members (current workspace)',
      group: 'Actions',
      icon: <Users className="w-4 h-4" />,
      action: () => { if (activeWorkspaceId) { navigate(`/dashboard/workspaces?manage=members&wid=${activeWorkspaceId}`) }; close() }
    },
    {
      id: 'action-open-workspace-settings',
      title: 'Open Workspace Settings',
      group: 'Actions',
      icon: <Settings2 className="w-4 h-4" />,
      action: () => { if (activeWorkspaceId) { navigate('/dashboard/workspaces'); close() } }
    },
    {
      id: 'action-delete-workspace',
      title: 'Delete Workspace…',
      group: 'Danger',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      action: () => { if (activeWorkspaceId) dispatch('request-delete-workspace'); close() }
    },
    {
      id: 'nav-integrations',
      title: 'Go to Integrations',
      group: 'Navigation',
      icon: <Database className="w-4 h-4" />,
      action: () => {
        const projectMatch = /\/dashboard\/projects\/([^/]+)/.exec(location.pathname)
        const projectId = projectMatch?.[1]
        const url = projectId ? `/dashboard/projects/${projectId}/integrations` : '/dashboard/workspaces'
        navigate(url)
        close()
      }
    },
    {
      id: 'help-shortcuts',
      title: 'Keyboard Shortcuts',
      group: 'Help',
      icon: <Keyboard className="w-4 h-4" />,
      action: () => { alert('Shortcuts:\nCtrl/Cmd+K: Command Palette\nCtrl/Cmd+P: Command Palette\nEsc: Close palette'); close() }
    }
  ]

  const workspaceItems: PaletteItem[] = workspaces.map(w => ({
    id: 'ws-' + w.id,
    title: (w.id === activeWorkspaceId ? '✔ ' : '') + w.name,
    subtitle: w.plan || undefined,
    group: 'Switch Workspace',
    icon: <Briefcase className="w-4 h-4" />,
    action: () => { setActiveWorkspace(w.id); close() }
  }))

  // Filter items by search term (simple case-insensitive contains)
  const term = search.trim().toLowerCase()
  const scored = [...baseItems, ...workspaceItems].map(item => {
    if (!term) return { item, score: 0 }
    const hay = (item.title + ' ' + (item.subtitle || '') + ' ' + (item.keywords || '')).toLowerCase()
    let score = 0
    if (hay.includes(term)) score += 10
    let seq = 0, lastIndex = -1
    for (const ch of term) {
      const idx = hay.indexOf(ch, lastIndex + 1)
      if (idx >= 0) { seq += 1; lastIndex = idx } else break
    }
    score += seq
    return { item, score }
  }).filter(s => term ? s.score > 0 : true)
  const allItems = scored.sort((a,b) => b.score - a.score).map(s => s.item)

  const groups = Array.from(new Set(allItems.map(i => i.group)))

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={close}>
      <div className="mx-auto mt-24 w-full max-w-xl px-4" onClick={e => e.stopPropagation()}>
        <Command label="Command Palette" className="rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden font-space">
          <div className="flex items-center border-b px-3" role="search">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-500 mr-2"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <Command.Input autoFocus value={search} onValueChange={setSearch} placeholder="Type a command or search…" className="flex-1 h-11 outline-none text-sm" />
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Esc</span>
          </div>
          <Command.List className="max-h-[55vh] overflow-y-auto p-2">
            {allItems.length === 0 && (
              <Command.Empty className="py-10 text-center text-sm text-slate-500">No results found.</Command.Empty>
            )}
            {groups.map(g => (
              <Command.Group key={g} heading={g} className="mb-2">
                {allItems.filter(i => i.group === g).map(item => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={() => item.action()}
                    className="flex items-center gap-2 px-2 py-2 text-sm rounded-md aria-selected:bg-slate-100 cursor-pointer"
                  >
                    {item.icon}
                    <div className="flex flex-col">
                      <span className="leading-tight">{item.title}</span>
                      {item.subtitle && <span className="text-[10px] uppercase tracking-wide text-slate-500 leading-tight">{item.subtitle}</span>}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            <Command.Separator className="my-2 h-px bg-slate-200" />
            <div className="px-2 pb-2 text-[10px] text-slate-500 flex flex-wrap gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px]">Ctrl/⌘+K</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px]">Ctrl/⌘+P</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px]">Esc</kbd>
            </div>
          </Command.List>
        </Command>
      </div>
    </div>,
    document.body
  )
}
