import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Target,
  ArrowRight,
  Layers,
  Package,
} from 'lucide-react'

import { prdService, type BacklogIssueResult } from '@/lib/api/prdService'
import { projectService, type ProjectDTO } from '@/lib/api/projectService'
import { PRIORITY_COLORS, type PRDDocument } from './prd-types'

// ─────────────────────────────────────────────────────────────────────────────

interface Feature {
  id: string
  title: string
  priority: string
  estimated_effort?: string
  acceptance_criteria?: string[]
}

type DialogStep = 'select' | 'confirm' | 'result'

interface PRDFeatureToIssueDialogProps {
  open: boolean
  onClose: () => void
  document: PRDDocument
}

// ─────────────────────────────────────────────────────────────────────────────

function extractFeatures(doc: PRDDocument): Feature[] {
  const specs = doc.feature_specifications
  if (!specs) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = Array.isArray(specs)
    ? specs
    : typeof specs === 'object' && 'features' in (specs as Record<string, unknown>)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((specs as Record<string, unknown>).features as any[])
      : []

  return list.map((f) => ({
    id: String(f.id || '?'),
    title: String(f.title || f.name || 'Untitled'),
    priority: String(f.priority || 'P2'),
    estimated_effort: f.estimated_effort ? String(f.estimated_effort) : undefined,
    acceptance_criteria: Array.isArray(f.acceptance_criteria)
      ? f.acceptance_criteria.map(String)
      : undefined,
  }))
}

const EFFORT_LABELS: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large', XL: 'X-Large' }

// ─────────────────────────────────────────────────────────────────────────────

export function PRDFeatureToIssueDialog({ open, onClose, document: doc }: PRDFeatureToIssueDialogProps) {
  const features = extractFeatures(doc)

  // State
  const [dialogStep, setDialogStep] = useState<DialogStep>('select')
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set(features.map(f => f.id)))
  const [projectId, setProjectId] = useState<string>('')
  const [issueType, setIssueType] = useState('story')
  const [isCreating, setIsCreating] = useState(false)
  const [results, setResults] = useState<BacklogIssueResult[]>([])

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectService.listProjects({ status: 'active' }),
    enabled: open,
  })

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedFeatures.size === features.length) {
      setSelectedFeatures(new Set())
    } else {
      setSelectedFeatures(new Set(features.map(f => f.id)))
    }
  }

  const handleCreate = async () => {
    if (!doc.id || !projectId) return
    setIsCreating(true)
    try {
      const response = await prdService.createBacklog(doc.id, projectId, {
        featureIds: Array.from(selectedFeatures),
        issueType,
      })
      setResults(response.items)
      setDialogStep('result')
      toast.success(`Created ${response.created} issues from PRD features`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create backlog')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setDialogStep('select')
    setResults([])
    onClose()
  }

  const selectedProject = projects.find((p: ProjectDTO) => p.id === projectId)
  const selectedCount = selectedFeatures.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Create Backlog from PRD
          </DialogTitle>
          <DialogDescription>
            Convert PRD features into project backlog issues
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select features & project */}
          {dialogStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Project selector */}
              <div className="space-y-2">
                <Label>Target Project</Label>
                {projectsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading projects...
                  </div>
                ) : (
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects as ProjectDTO[]).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" />
                            {p.name}
                            <span className="text-muted-foreground text-xs">({p.key})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Issue type */}
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">User Story</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Feature list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Features ({selectedCount} of {features.length} selected)</Label>
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedFeatures.size === features.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <ScrollArea className="h-[280px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {features.map(f => (
                      <label
                        key={f.id}
                        className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedFeatures.has(f.id)}
                          onCheckedChange={() => toggleFeature(f.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{f.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${PRIORITY_COLORS[f.priority] || ''}`}
                            >
                              {f.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>ID: {f.id}</span>
                            {f.estimated_effort && (
                              <span>Effort: {EFFORT_LABELS[f.estimated_effort] || f.estimated_effort}</span>
                            )}
                            {f.acceptance_criteria && (
                              <span>{f.acceptance_criteria.length} criteria</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}

          {/* Step 2: Confirm */}
          {dialogStep === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm">Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{selectedProject?.name} ({selectedProject?.key})</span>
                  <span className="text-muted-foreground">Issue Type:</span>
                  <span className="font-medium capitalize">{issueType}</span>
                  <span className="text-muted-foreground">Features:</span>
                  <span className="font-medium">{selectedCount} selected</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium">Issues to be created:</h4>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {features
                      .filter(f => selectedFeatures.has(f.id))
                      .map(f => (
                        <div
                          key={f.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-muted/30"
                        >
                          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">[{f.id}]</span>
                          <span className="truncate">{f.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {selectedProject?.key}-?
                          </Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}

          {/* Step 3: Result */}
          {dialogStep === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              <div className="flex items-center gap-3 bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-lg">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">Backlog Created Successfully</p>
                  <p className="text-sm opacity-80">
                    {results.filter(r => !r.error).length} issues created in {selectedProject?.name}
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[250px] border rounded-md">
                <div className="p-2 space-y-1">
                  {results.map(r => (
                    <div
                      key={r.feature_id}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md"
                    >
                      {r.error ? (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-muted-foreground">[{r.feature_id}]</span>
                      <span className="truncate flex-1">{r.feature_title}</span>
                      {r.issue_key && (
                        <Badge variant="outline" className="shrink-0">{r.issue_key}</Badge>
                      )}
                      {r.error && (
                        <span className="text-destructive text-xs truncate max-w-[150px]">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {dialogStep === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setDialogStep('confirm')}
                disabled={selectedCount === 0 || !projectId}
              >
                Review ({selectedCount})
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          {dialogStep === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setDialogStep('select')}>Back</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create {selectedCount} Issues</>
                )}
              </Button>
            </>
          )}
          {dialogStep === 'result' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
