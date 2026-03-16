import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ArrowRight, Plus, Minus, RefreshCw } from 'lucide-react'

import { prdVersionService } from '@/lib/api/prdVersionService'

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(v => formatValue(v)).join('\n')
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

interface PRDDiffViewerProps {
  prdId: string
  versionA: number
  versionB: number
  open: boolean
  onClose: () => void
}

export function PRDDiffViewer({ prdId, versionA, versionB, open, onClose }: PRDDiffViewerProps) {
  const { data: comparison, isLoading } = useQuery({
    queryKey: ['prd-compare', prdId, versionA, versionB],
    queryFn: () => prdVersionService.compareVersions(prdId, versionA, versionB),
    enabled: open && !!prdId,
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Compare Versions</span>
            <Badge variant="outline" className="font-mono">v{versionA}</Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline" className="font-mono">v{versionB}</Badge>
          </DialogTitle>
          <DialogDescription>
            Side-by-side comparison of changes between versions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : comparison?.differences && comparison.differences.length > 0 ? (
            <div className="space-y-4 p-1">
              {comparison.differences.map((diff, i) => (
                <div key={i} className="rounded-lg border overflow-hidden">
                  {/* Section Header */}
                  <div className="bg-muted px-4 py-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatSectionLabel(diff.section)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="text-sm font-medium">{formatFieldLabel(diff.field)}</span>
                    <DiffIcon oldValue={diff.old_value} newValue={diff.new_value} />
                  </div>

                  {/* Side-by-side diff */}
                  <div className="grid grid-cols-2 divide-x">
                    <div className="p-4 bg-red-50/30 dark:bg-red-950/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        v{versionA} (old)
                      </p>
                      <pre className="text-sm whitespace-pre-wrap break-words font-sans text-muted-foreground">
                        {formatValue(diff.old_value)}
                      </pre>
                    </div>
                    <div className="p-4 bg-green-50/30 dark:bg-green-950/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        v{versionB} (new)
                      </p>
                      <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                        {formatValue(diff.new_value)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No differences found</p>
              <p className="text-xs text-muted-foreground mt-1">These versions are identical</p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DiffIcon({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const isAdded = (oldValue === null || oldValue === undefined || oldValue === '') && newValue
  const isRemoved = oldValue && (newValue === null || newValue === undefined || newValue === '')

  if (isAdded) return <Plus className="w-3.5 h-3.5 text-green-600 ml-auto" />
  if (isRemoved) return <Minus className="w-3.5 h-3.5 text-red-600 ml-auto" />
  return <RefreshCw className="w-3.5 h-3.5 text-blue-600 ml-auto" />
}

const SECTION_LABEL_MAP: Record<string, string> = {
  executive_summary: 'Executive Summary',
  user_personas: 'User Personas',
  personas: 'User Personas',
  feature_specifications: 'Features',
  features: 'Features',
  technical_requirements: 'Technical',
  technical: 'Technical',
  risks_and_mitigations: 'Risks',
  risks: 'Risks',
  timeline_and_phases: 'Timeline',
  timeline: 'Timeline',
}

function formatSectionLabel(section: string): string {
  return SECTION_LABEL_MAP[section] || section.replace(/_/g, ' ')
}

function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
