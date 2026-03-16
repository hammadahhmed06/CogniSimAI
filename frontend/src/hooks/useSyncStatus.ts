import { useState, useEffect, useCallback } from 'react'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt?: Date
  error?: string
  progress?: number
}

interface UseSyncStatusOptions {
  entityType: 'project' | 'issue'
  entityId?: string
  workspaceId?: string
  pollingInterval?: number // milliseconds
}

export function useSyncStatus({
  entityType,
  entityId,
  workspaceId,
  pollingInterval = 5000,
}: UseSyncStatusOptions) {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' })
  const [isPolling, setIsPolling] = useState(false)

  // Fetch sync status from backend
  const fetchSyncStatus = useCallback(async () => {
    if (!workspaceId) return

    try {
      const url = entityId
        ? `/api/jira/sync/status/${entityType}/${entityId}`
        : `/api/jira/sync/status/${entityType}?workspace_id=${workspaceId}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch sync status')

      const data = await response.json()
      setSyncState({
        status: data.status || 'idle',
        lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
        error: data.error,
        progress: data.progress,
      })
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
      setSyncState(prev => ({ ...prev, status: 'error', error: 'Failed to fetch status' }))
    }
  }, [entityType, entityId, workspaceId])

  // Start polling
  useEffect(() => {
    if (!isPolling || !workspaceId) return

    const interval = setInterval(fetchSyncStatus, pollingInterval)
    fetchSyncStatus() // Initial fetch

    return () => clearInterval(interval)
  }, [isPolling, workspaceId, fetchSyncStatus, pollingInterval])

  // WebSocket connection (optional, with fallback to polling)
  useEffect(() => {
    if (!workspaceId) return

    // Try WebSocket connection
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/sync/${workspaceId}`
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected for sync status')
        setIsPolling(false) // Disable polling when WebSocket is connected
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (
            data.entity_type === entityType &&
            (!entityId || data.entity_id === entityId)
          ) {
            setSyncState({
              status: data.status || 'idle',
              lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
              error: data.error,
              progress: data.progress,
            })
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = () => {
        console.warn('WebSocket error, falling back to polling')
        setIsPolling(true)
      }

      ws.onclose = () => {
        console.log('WebSocket closed, falling back to polling')
        setIsPolling(true)
      }
    } catch (error) {
      console.warn('WebSocket not supported, using polling')
      setIsPolling(true)
    }

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [entityType, entityId, workspaceId])

  return syncState
}
