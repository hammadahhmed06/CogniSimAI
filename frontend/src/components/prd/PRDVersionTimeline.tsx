import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { History, RotateCcw, GitCompareArrows } from 'lucide-react'

import { prdVersionService, type PRDVersion } from '@/lib/api/prdVersionService'

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface PRDVersionTimelineProps {
  prdId: string
  onRestore: (versionNumber: number) => void
  onCompare: (versionA: number, versionB: number) => void
}

export function PRDVersionTimeline({ prdId, onRestore, onCompare }: PRDVersionTimelineProps) {
  const [compareMode, setCompareMode] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])

  const { data: versions, isLoading } = useQuery({
    queryKey: ['prd-versions', prdId],
    queryFn: () => prdVersionService.listVersions(prdId),
    enabled: !!prdId,
  })

  const handleVersionSelect = (vn: number) => {
    if (!compareMode) return
    setSelectedVersions(prev => {
      if (prev.includes(vn)) return prev.filter(v => v !== vn)
      if (prev.length >= 2) return [prev[1], vn]
      return [...prev, vn]
    })
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const [a, b] = selectedVersions.sort((x, y) => x - y)
      onCompare(a, b)
      setCompareMode(false)
      setSelectedVersions([])
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="p-4 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No version history yet</p>
        <p className="text-xs text-muted-foreground mt-1">Versions are created when sections are edited or regenerated</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Version History
        </h3>
        <Button
          variant={compareMode ? 'default' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            if (compareMode && selectedVersions.length === 2) {
              handleCompare()
            } else {
              setCompareMode(!compareMode)
              setSelectedVersions([])
            }
          }}
        >
          <GitCompareArrows className="w-3.5 h-3.5 mr-1" />
          {compareMode ? (selectedVersions.length === 2 ? 'Compare' : 'Select 2') : 'Compare'}
        </Button>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        {versions.map((version, i) => (
          <div
            key={version.id}
            className={cn(
              'relative pl-8 pb-4 cursor-default',
              compareMode && 'cursor-pointer'
            )}
            onClick={() => handleVersionSelect(version.version_number)}
          >
            {/* Timeline dot */}
            <div className={cn(
              'absolute left-1.5 w-3 h-3 rounded-full border-2 transition-colors',
              i === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40',
              compareMode && selectedVersions.includes(version.version_number) && 'bg-blue-500 border-blue-500 ring-2 ring-blue-500/20'
            )} />

            {/* Version card */}
            <div className={cn(
              'p-3 rounded-lg border bg-card hover:shadow-sm transition-all',
              compareMode && selectedVersions.includes(version.version_number) && 'border-blue-500/50 bg-blue-500/5'
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">v{version.version_number}</span>
                <time className="text-xs text-muted-foreground">
                  {formatRelativeTime(version.created_at)}
                </time>
              </div>

              <p className="text-xs text-muted-foreground mb-2">
                {version.change_summary || 'Version snapshot'}
              </p>

              {version.changed_sections && version.changed_sections.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {version.changed_sections.map(s => (
                    <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {version.created_by_email && (
                <p className="text-[10px] text-muted-foreground mb-2">
                  by {version.created_by_email}
                </p>
              )}

              {!compareMode && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCompare(version.version_number, versions[0].version_number)
                    }}
                  >
                    <GitCompareArrows className="w-3 h-3 mr-1" />
                    Compare
                  </Button>
                  {i > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-orange-600 hover:text-orange-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRestore(version.version_number)
                      }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
