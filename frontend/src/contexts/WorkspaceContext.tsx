import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { workspaceService, type Workspace } from '@/lib/api/workspaceService'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

interface WorkspaceContextType {
  workspaces: Workspace[]
  loading: boolean
  activeWorkspaceId: string | null
  activeWorkspace: Workspace | null
  refresh: () => Promise<void>
  setActiveWorkspace: (id: string | null) => void
  creating?: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

const LS_KEY = 'activeWorkspaceId'

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_KEY) } catch { return null }
  })
  const qc = useQueryClient()

  const syncToStorage = (id: string | null) => {
    try {
      if (id) localStorage.setItem(LS_KEY, id)
      else localStorage.removeItem(LS_KEY)
    } catch {/* ignore */}
  }

  const setActiveWorkspace = useCallback((id: string | null) => {
    setActiveWorkspaceId(id)
    syncToStorage(id)
    // Broadcast change so other tabs/components can react if needed
    try { window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { id } })) } catch {/* ignore */}
    // Invalidate react-query caches that might be workspace scoped
    qc.invalidateQueries()
  }, [qc])

  const [autoCreating, setAutoCreating] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setWorkspaces([]); return }
    setLoading(true)
    try {
      let list = await workspaceService.listWorkspaces()
      
      // Auto-create default workspace for new users who have no workspaces
      if (list.length === 0 && !autoCreating) {
        setAutoCreating(true)
        try {
          console.log('No workspaces found, creating default workspace...')
          const newWorkspace = await workspaceService.createWorkspace({ 
            name: 'My Workspace',
            description: 'Default workspace'
          })
          list = [newWorkspace]
          console.log('Default workspace created:', newWorkspace.id)
        } catch (createErr) {
          console.error('Failed to auto-create default workspace:', createErr)
        } finally {
          setAutoCreating(false)
        }
      }
      
      setWorkspaces(list)
      // If current active no longer valid, or none selected, choose first
      if (!list.length) {
        if (activeWorkspaceId) setActiveWorkspace(null)
      } else if (!activeWorkspaceId || !list.some(w => w.id === activeWorkspaceId)) {
        setActiveWorkspace(list[0].id)
      }
    } catch (e) {
      // swallow; UI will show empty
    } finally {
      setLoading(false)
    }
  }, [user, activeWorkspaceId, setActiveWorkspace, autoCreating])

  // Initial & auth-dependent load
  useEffect(() => { if (!authLoading) refresh() }, [authLoading, refresh])

  // Listen for storage events (multi-tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        setActiveWorkspace(e.newValue)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [setActiveWorkspace])

  const activeWorkspace = activeWorkspaceId ? workspaces.find(w => w.id === activeWorkspaceId) || null : null

  const value: WorkspaceContextType = {
    workspaces,
    loading,
    activeWorkspaceId,
    activeWorkspace,
    refresh,
    setActiveWorkspace
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Hook for consuming the workspace context
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider')
  return ctx
}
