import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

export interface SyncConflict {
  id: string
  entityType: 'project' | 'issue'
  entityId: string
  entityName: string
  field: string
  localValue: unknown
  jiraValue: unknown
  lastSyncedAt?: string
  localUpdatedAt?: string
  jiraUpdatedAt?: string
}

interface ConflictResolverProps {
  conflicts: SyncConflict[]
  open: boolean
  onClose: () => void
  onResolve: (resolutions: Map<string, 'local' | 'jira' | 'smart'>) => Promise<void>
}

export function ConflictResolver({ conflicts, open, onClose, onResolve }: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Map<string, 'local' | 'jira' | 'smart'>>(new Map())
  const [autoResolveTimer, setAutoResolveTimer] = useState<number>(30)
  const [resolving, setResolving] = useState(false)

  const getSmartDefault = (conflict: SyncConflict): 'local' | 'jira' | 'smart' => {
    // Smart defaults based on field type and timestamps
    const { field, localUpdatedAt, jiraUpdatedAt } = conflict

    // If we have timestamps, choose the more recent one
    if (localUpdatedAt && jiraUpdatedAt) {
      const localDate = new Date(localUpdatedAt).getTime()
      const jiraDate = new Date(jiraUpdatedAt).getTime()
      return localDate > jiraDate ? 'local' : 'jira'
    }

    // Field-specific defaults
    if (field === 'status' || field === 'assignee') {
      // For status and assignee, prefer Jira (single source of truth)
      return 'jira'
    }

    if (field === 'description' || field === 'title') {
      // For text fields, prefer local if modified recently
      return 'local'
    }

    // Default to Jira
    return 'jira'
  }

  const handleAutoResolve = async (defaultResolutions: Map<string, 'local' | 'jira' | 'smart'>) => {
    setResolving(true)
    try {
      await onResolve(defaultResolutions)
      onClose()
    } catch (error) {
      console.error('Auto-resolve failed:', error)
    } finally {
      setResolving(false)
    }
  }

  // Auto-resolve timer (30 seconds countdown)
  useEffect(() => {
    if (!open || conflicts.length === 0) return

    // Initialize smart defaults for all conflicts
    const smartDefaults = new Map<string, 'local' | 'jira' | 'smart'>()
    conflicts.forEach(conflict => {
      smartDefaults.set(conflict.id, getSmartDefault(conflict))
    })
    setResolutions(smartDefaults)

    // Start countdown
    setAutoResolveTimer(30)
    const interval = setInterval(() => {
      setAutoResolveTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleAutoResolve(smartDefaults)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conflicts])

  const handleManualResolve = async () => {
    setResolving(true)
    try {
      await onResolve(resolutions)
      onClose()
    } catch (error) {
      console.error('Manual resolve failed:', error)
    } finally {
      setResolving(false)
    }
  }

  const updateResolution = (conflictId: string, choice: 'local' | 'jira' | 'smart') => {
    setResolutions(prev => new Map(prev).set(conflictId, choice))
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            We detected {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} between local and Jira data.
            Review and choose which version to keep, or use our smart defaults.
          </DialogDescription>
        </DialogHeader>

        {/* Auto-resolve countdown */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Auto-resolving in {autoResolveTimer} seconds</p>
            <p className="text-xs text-blue-700 mt-1">
              Smart defaults will be applied automatically. Review and change if needed.
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-600">{autoResolveTimer}s</div>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4 mt-4">
          {conflicts.map((conflict) => {
            const resolution = resolutions.get(conflict.id) || 'smart'
            const smartDefault = getSmartDefault(conflict)

            return (
              <div key={conflict.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{conflict.entityName}</h4>
                    <p className="text-sm text-gray-500">
                      {conflict.entityType} • Field: <span className="font-mono">{conflict.field}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Conflict
                  </Badge>
                </div>

                <RadioGroup
                  value={resolution}
                  onValueChange={(value) => updateResolution(conflict.id, value as 'local' | 'jira' | 'smart')}
                  className="space-y-2"
                >
                  <div className="flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value="local" id={`${conflict.id}-local`} />
                    <Label htmlFor={`${conflict.id}-local`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Keep Local Version</span>
                        {conflict.localUpdatedAt && (
                          <span className="text-xs text-gray-500">
                            Updated {new Date(conflict.localUpdatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                        {formatValue(conflict.localValue)}
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value="jira" id={`${conflict.id}-jira`} />
                    <Label htmlFor={`${conflict.id}-jira`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Keep Jira Version</span>
                        {conflict.jiraUpdatedAt && (
                          <span className="text-xs text-gray-500">
                            Updated {new Date(conflict.jiraUpdatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 font-mono bg-blue-50 p-2 rounded">
                        {formatValue(conflict.jiraValue)}
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 border-2 border-green-200 rounded-md p-3 bg-green-50">
                    <RadioGroupItem value="smart" id={`${conflict.id}-smart`} />
                    <Label htmlFor={`${conflict.id}-smart`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Smart Default</span>
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-100">
                          Recommended: {smartDefault === 'local' ? 'Local' : 'Jira'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {smartDefault === 'local'
                          ? 'Local version is more recent or has important changes'
                          : 'Jira version is the source of truth for this field'}
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={resolving}>
            Cancel
          </Button>
          <Button onClick={handleManualResolve} disabled={resolving}>
            {resolving ? 'Resolving...' : `Resolve ${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
