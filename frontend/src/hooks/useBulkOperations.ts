import { useState, useCallback } from 'react'

export interface BulkOperation {
  id: string
  type: 'sync' | 'import' | 'export'
  entityType: 'project' | 'issue'
  totalItems: number
  processedItems: number
  successCount: number
  failedCount: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  startedAt?: Date
  completedAt?: Date
}

interface UseBulkOperationsReturn {
  operations: Map<string, BulkOperation>
  startOperation: (type: BulkOperation['type'], entityType: BulkOperation['entityType'], itemIds: string[]) => Promise<string>
  cancelOperation: (operationId: string) => void
  getOperation: (operationId: string) => BulkOperation | undefined
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const [operations, setOperations] = useState<Map<string, BulkOperation>>(new Map())

  const pollOperationProgress = useCallback(async (operationId: string, jobId: string) => {
    const pollInterval = 1000 // 1 second

    const poll = async () => {
      try {
        const response = await fetch(`/api/jira/sync/bulk/${jobId}`)
        if (!response.ok) throw new Error('Failed to fetch progress')

        const progress = await response.json()

        setOperations(prev => {
          const current = prev.get(operationId)
          if (!current) return prev

          const updated: BulkOperation = {
            ...current,
            processedItems: progress.processed_items || 0,
            successCount: progress.success_count || 0,
            failedCount: progress.failed_count || 0,
            status: progress.status === 'completed' ? 'completed' : 'processing',
            completedAt: progress.status === 'completed' ? new Date() : undefined,
          }

          return new Map(prev).set(operationId, updated)
        })

        // Continue polling if not completed
        if (progress.status !== 'completed' && progress.status !== 'failed') {
          setTimeout(poll, pollInterval)
        }
      } catch (error) {
        console.error('Failed to poll operation progress:', error)
        setOperations(prev => {
          const current = prev.get(operationId)
          if (!current) return prev

          return new Map(prev).set(operationId, {
            ...current,
            status: 'failed',
            error: 'Failed to fetch progress',
            completedAt: new Date(),
          })
        })
      }
    }

    poll()
  }, [])

  const processOperation = useCallback(async (
    operationId: string,
    operation: BulkOperation,
    itemIds: string[]
  ) => {
    // Update status to processing
    setOperations(prev =>
      new Map(prev).set(operationId, { ...operation, status: 'processing' })
    )

    try {
      // Send bulk operation request to backend
      const response = await fetch('/api/jira/sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: operation.type,
          entity_type: operation.entityType,
          item_ids: itemIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`Bulk operation failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Poll for progress updates
      const jobId = result.job_id
      await pollOperationProgress(operationId, jobId)
    } catch (error) {
      setOperations(prev =>
        new Map(prev).set(operationId, {
          ...operation,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        })
      )
    }
  }, [pollOperationProgress])

  const startOperation = useCallback(
    async (
      type: BulkOperation['type'],
      entityType: BulkOperation['entityType'],
      itemIds: string[]
    ): Promise<string> => {
      const operationId = crypto.randomUUID()
      const operation: BulkOperation = {
        id: operationId,
        type,
        entityType,
        totalItems: itemIds.length,
        processedItems: 0,
        successCount: 0,
        failedCount: 0,
        status: 'queued',
        startedAt: new Date(),
      }

      setOperations(prev => new Map(prev).set(operationId, operation))

      // Start processing in background
      processOperation(operationId, operation, itemIds)

      return operationId
    },
    [processOperation]
  )

  const cancelOperation = useCallback((operationId: string) => {
    setOperations(prev => {
      const operation = prev.get(operationId)
      if (!operation) return prev

      return new Map(prev).set(operationId, {
        ...operation,
        status: 'failed',
        error: 'Cancelled by user',
        completedAt: new Date(),
      })
    })

    // Send cancel request to backend
    fetch(`/api/jira/sync/bulk/${operationId}/cancel`, { method: 'POST' }).catch(
      console.error
    )
  }, [])

  const getOperation = useCallback(
    (operationId: string) => {
      return operations.get(operationId)
    },
    [operations]
  )

  return {
    operations,
    startOperation,
    cancelOperation,
    getOperation,
  }
}
