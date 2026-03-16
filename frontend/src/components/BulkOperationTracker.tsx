import { useBulkOperations, type BulkOperation } from '@/hooks/useBulkOperations'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface BulkOperationTrackerProps {
  operations?: Map<string, BulkOperation>
  onDismiss?: (operationId: string) => void
}

export function BulkOperationTracker({ operations: externalOps, onDismiss }: BulkOperationTrackerProps) {
  const { operations: internalOps, cancelOperation } = useBulkOperations()
  const operations = externalOps || internalOps

  const activeOperations = Array.from(operations.values()).filter(
    op => op.status === 'queued' || op.status === 'processing'
  )

  const completedOperations = Array.from(operations.values()).filter(
    op => op.status === 'completed' || op.status === 'failed'
  )

  if (activeOperations.length === 0 && completedOperations.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 space-y-2 z-50">
      {/* Active Operations */}
      {activeOperations.map(operation => (
        <OperationCard
          key={operation.id}
          operation={operation}
          onCancel={() => cancelOperation(operation.id)}
        />
      ))}

      {/* Recently Completed */}
      {completedOperations.slice(0, 3).map(operation => (
        <OperationCard
          key={operation.id}
          operation={operation}
          onDismiss={onDismiss ? () => onDismiss(operation.id) : undefined}
        />
      ))}
    </div>
  )
}

interface OperationCardProps {
  operation: BulkOperation
  onCancel?: () => void
  onDismiss?: () => void
}

function OperationCard({ operation, onCancel, onDismiss }: OperationCardProps) {
  const progressPercentage = operation.totalItems > 0
    ? (operation.processedItems / operation.totalItems) * 100
    : 0

  const isActive = operation.status === 'queued' || operation.status === 'processing'
  const isCompleted = operation.status === 'completed'
  const isFailed = operation.status === 'failed'

  const getOperationLabel = () => {
    const typeLabels = {
      sync: 'Syncing',
      import: 'Importing',
      export: 'Exporting',
    }
    return typeLabels[operation.type]
  }

  const getEntityLabel = () => {
    return operation.entityType === 'project' ? 'projects' : 'issues'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-right">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {isFailed && <XCircle className="h-4 w-4 text-red-600" />}
          <span className="font-medium text-sm">
            {getOperationLabel()} {operation.totalItems} {getEntityLabel()}
          </span>
        </div>
        {isActive && onCancel && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        )}
        {!isActive && onDismiss && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isActive && (
        <>
          <Progress value={progressPercentage} className="mb-2" />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {operation.processedItems} / {operation.totalItems}
            </span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </>
      )}

      {isCompleted && (
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <Badge variant="outline" className="text-green-600 border-green-300">
            {operation.successCount} succeeded
          </Badge>
          {operation.failedCount > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-300">
              {operation.failedCount} failed
            </Badge>
          )}
          {operation.completedAt && (
            <span className="text-gray-500">
              {formatDistanceToNow(operation.completedAt, { addSuffix: true })}
            </span>
          )}
        </div>
      )}

      {isFailed && (
        <div className="text-xs text-red-600 mt-2">
          {operation.error || 'Operation failed'}
        </div>
      )}
    </div>
  )
}
