import { useSyncStatus, type SyncStatus } from '@/hooks/useSyncStatus'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SyncStatusIndicatorProps {
  entityType: 'project' | 'issue'
  entityId?: string
  workspaceId?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SyncStatusIndicator({
  entityType,
  entityId,
  workspaceId,
  showLabel = true,
  size = 'md',
}: SyncStatusIndicatorProps) {
  const syncState = useSyncStatus({ entityType, entityId, workspaceId })

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'syncing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300',
          label: 'Syncing',
          animate: true,
        }
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          label: 'Synced',
          animate: false,
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          label: 'Error',
          animate: false,
        }
      default:
        return {
          icon: Circle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          label: 'Idle',
          animate: false,
        }
    }
  }

  const config = getStatusConfig(syncState.status)
  const Icon = config.icon

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size]

  if (!showLabel) {
    return (
      <div className="relative inline-flex items-center">
        <Icon
          className={`${iconSize} ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        {syncState.status === 'syncing' && syncState.progress !== undefined && (
          <span className="absolute -top-1 -right-1 text-xs font-medium text-blue-600">
            {Math.round(syncState.progress)}%
          </span>
        )}
      </div>
    )
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${config.color} ${config.borderColor} ${config.bgColor}`}
    >
      <Icon className={`${iconSize} ${config.animate ? 'animate-spin' : ''}`} />
      <span className="font-medium">{config.label}</span>
      {syncState.lastSyncedAt && syncState.status === 'success' && (
        <span className="text-xs opacity-75">
          {formatDistanceToNow(syncState.lastSyncedAt, { addSuffix: true })}
        </span>
      )}
      {syncState.status === 'syncing' && syncState.progress !== undefined && (
        <span className="text-xs font-medium">{Math.round(syncState.progress)}%</span>
      )}
    </Badge>
  )
}
