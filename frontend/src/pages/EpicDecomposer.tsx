import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { agentService, EpicDecomposeResponse, GeneratedStoryDraft, AnalystInsights } from '@/lib/api/agentService'
import { issuesService, type Issue } from '@/lib/api/issuesService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RunQualityBadge } from '@/components/agent/RunQualityBadge'
import { DuplicateWarnings } from '@/components/agent/DuplicateWarnings'
import { RunMetricsBar } from '@/components/agent/RunMetricsBar'
import { toast } from 'sonner'
import { Loader2, Sparkles, RefreshCw, CheckCircle2, Undo2, ClipboardList, ShieldCheck, Check, BrainCircuit, PenTool, CheckCheck, Target, User, AlertTriangle, ArrowRight, Wand2, ArrowLeft } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'


const clampStories = (value: number) => {
  if (!Number.isFinite(value)) return 6
  return Math.max(3, Math.min(12, Math.floor(value)))
}

type Stage = 'init' | 'analyst' | 'author' | 'reviewer' | 'refiner' | 'final'

export default function EpicDecomposerPage() {
  const location = useLocation()
  const [epicId, setEpicId] = useState('')
  const [prefilledEpic, setPrefilledEpic] = useState<string | null>(null)
  const lastPrefilledEpic = useRef<string | null>(null)
  
  // URL Param Handling
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const epicParam = params.get('epic')
    if (epicParam) {
      if (epicParam !== lastPrefilledEpic.current) {
        setEpicId(epicParam)
        lastPrefilledEpic.current = epicParam
      }
      setPrefilledEpic(epicParam)
    } else {
      lastPrefilledEpic.current = null
      setPrefilledEpic(null)
    }
  }, [location.search])

  const [maxStories, setMaxStories] = useState(6)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCommittingAll, setIsCommittingAll] = useState(false)
  
  // State for Streaming & Results
  const [storiesDraft, setStoriesDraft] = useState<GeneratedStoryDraft[]>([])
  const [analystInsights, setAnalystInsights] = useState<AnalystInsights | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<{ story_index: number; story_title: string; existing_title: string; similarity: number }[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ message: string; percent: number; stage: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [userPrompt, setUserPrompt] = useState('')
  const [runItems, setRunItems] = useState<{ id: string; item_index: number }[]>([])
  const [perItemBusy, setPerItemBusy] = useState<Record<number, boolean>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({})
  const [committedMap, setCommittedMap] = useState<Record<number, boolean>>({})
  const [activeTab, setActiveTab] = useState<string>('stories')

  const { activeWorkspaceId } = useWorkspace()
  const [epicPickerOpen, setEpicPickerOpen] = useState(false)
  const [epicSearch, setEpicSearch] = useState('')
  
  const { data: epicOptions, isLoading: epicsLoading } = useQuery<Issue[]>({
    queryKey: ['workspace-epics', activeWorkspaceId],
    queryFn: () => issuesService.listEpics({ workspaceId: activeWorkspaceId ?? undefined, limit: 200 }),
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (!epicPickerOpen) setEpicSearch('')
  }, [epicPickerOpen])

  const epicList = useMemo(() => (Array.isArray(epicOptions) ? epicOptions : []), [epicOptions])
  
  const filteredEpics = useMemo(() => {
    const query = epicSearch.trim().toLowerCase()
    if (!query) return epicList
    return epicList.filter((epic) => {
      const key = (epic.issue_key || '').toLowerCase()
      const title = (epic.title || '').toLowerCase()
      return (key && key.includes(query)) || (title && title.includes(query))
    })
  }, [epicList, epicSearch])

  const normalizedEpicId = epicId.trim().toLowerCase()
  const selectedEpic = useMemo(() => {
    if (!normalizedEpicId) return null
    return epicList.find((epic) => {
      const key = (epic.issue_key || '').toLowerCase()
      if (key && key === normalizedEpicId) return true
      return (epic.id || '').toLowerCase() === normalizedEpicId
    }) || null
  }, [epicList, normalizedEpicId])

  useEffect(() => {
    if (prefilledEpic) {
      const normalizedPrefilled = prefilledEpic.trim().toLowerCase()
      if (normalizedEpicId && normalizedEpicId !== normalizedPrefilled) {
        setPrefilledEpic(null)
      }
    }
  }, [prefilledEpic, normalizedEpicId])

  const handleSelectEpic = (epic: Issue) => {
    const identifier = epic.issue_key || epic.id
    if (!identifier) return
    setEpicId(identifier)
    setPrefilledEpic(null)
    setEpicPickerOpen(false)
    setEpicSearch('')
  }

  // Auto-switch tabs when insights arrive
  useEffect(() => {
    if (analystInsights && storiesDraft.length === 0) {
      setActiveTab('insights')
    } else if (storiesDraft.length > 0) {
      setActiveTab('stories')
    }
  }, [analystInsights, storiesDraft.length])

  // Fetch run items when runId is available
  useEffect(() => {
    if (runId && !isGenerating && storiesDraft.length > 0) {
      agentService.listRunItems(runId).then(items => {
        setRunItems(items.map((item) => ({ id: item.id, item_index: item.item_index })))
      }).catch(console.error)
    }
  }, [runId, isGenerating, storiesDraft.length])

  const handleGenerate = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const trimmedEpicId = epicId.trim()
    if (!trimmedEpicId) {
      toast.error('Enter an epic identifier to start')
      return
    }
    
    const clamped = clampStories(maxStories)
    setMaxStories(clamped)
    setIsGenerating(true)
    setStoriesDraft([])
    setAnalystInsights(null)
    setWarnings([])
    setDuplicates([])
    setRunId(null)
    setPerItemBusy({})
    setFeedbackMap({})
    setCommittedMap({})
    setError(null)
    setProgress({ message: 'Initializing...', percent: 0, stage: 'init' })

    try {
      await agentService.decomposeStream(trimmedEpicId, clamped, userPrompt.trim() || undefined, (event) => {
        if (event.type === 'progress') {
          setProgress({ 
            message: event.message || '', 
            percent: event.percent || 0,
            stage: event.stage || 'init'
          })
        } else if (event.type === 'analyst_result') {
          setAnalystInsights(event.data as AnalystInsights)
        } else if (event.type === 'author_result') {
          const data = event.data as { stories: GeneratedStoryDraft[] }
          if (data && data.stories) {
            setStoriesDraft(data.stories)
          }
        } else if (event.type === 'reviewer_result') {
          const data = event.data as { stories: GeneratedStoryDraft[] }
          if (data && data.stories) {
            setStoriesDraft(data.stories)
          }
        } else if (event.type === 'refiner_result') {
          // Refinement complete - use refined stories as final draft
          const data = event.data as { stories: GeneratedStoryDraft[] }
          if (data && data.stories) {
            setStoriesDraft(data.stories)
          }
        } else if (event.type === 'result') {
          const res = event.data as {
            success: boolean
            data: { stories: GeneratedStoryDraft[] }
            warnings?: string[]
            duplicate_matches?: { story_index: number; story_title: string; existing_title: string; similarity: number }[]
            error?: string
            analyst_insights?: AnalystInsights
            run_id?: string
          }
          if (res && res.success) {
            setStoriesDraft(res.data.stories)
            setWarnings(res.warnings || [])
            setDuplicates(res.duplicate_matches || [])
            if (res.analyst_insights) setAnalystInsights(res.analyst_insights)
            if (res.run_id) setRunId(res.run_id)
            
            // Force fetch items immediately after result
            if (res.run_id) {
               agentService.listRunItems(res.run_id).then(items => {
                  setRunItems(items.map((item) => ({ id: item.id, item_index: item.item_index })))
               }).catch(console.error)
            }
          } else {
             const errMsg = res?.error || 'Generation failed'
             setError(errMsg)
             toast.error(errMsg)
          }
        } else if (event.type === 'run_created') {
            setRunId(event.run_id || null)
        } else if (event.type === 'error') {
            const errMsg = event.error || 'Stream error'
            setError(errMsg)
            toast.error(errMsg)
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate stories'
      setError(message)
      toast.error(message)
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleCommitAll = async () => {
    if (!storiesDraft.length) {
      toast.error('Generate stories before committing')
      return
    }
    if (!epicId.trim()) {
      toast.error('Epic identifier is required to commit')
      return
    }

    setIsCommittingAll(true)
    try {
      const res = await agentService.commit(epicId.trim(), storiesDraft)
      toast.success('Committed all stories to backlog')
      setCommittedMap(Object.fromEntries(storiesDraft.map((_, index) => [index, true])))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Commit failed'
      toast.error(message)
    } finally {
      setIsCommittingAll(false)
    }
  }

  const handleReset = () => {
    setStoriesDraft([])
    setAnalystInsights(null)
    setRunItems([])
    setFeedbackMap({})
    setPerItemBusy({})
    setCommittedMap({})
    setUserPrompt('')
    setWarnings([])
    setDuplicates([])
    setRunId(null)
  }

  const updateStory = (index: number, patch: Partial<GeneratedStoryDraft>) => {
    setStoriesDraft((prev) => prev.map((story, idx) => (idx === index ? { ...story, ...patch } : story)))
  }

  const handleCommitStory = async (index: number) => {
    if (!runId) {
      toast.error('Run metadata missing. Generate stories again to commit individually.')
      return
    }

    const item = runItems.find((runItem) => runItem.item_index === index)
    if (!item) {
      toast.error('Story metadata not available yet')
      return
    }

    const story = storiesDraft[index]
    if (!story) {
      toast.error('Story draft not found')
      return
    }

    setPerItemBusy((prev) => ({ ...prev, [index]: true }))
    try {
      const response = await agentService.commitStory(runId, item.id, {
        title: story.title,
        acceptance_criteria: story.acceptance_criteria,
      })
      if (!response.created_issue_id) {
        throw new Error('Story was not created in the backlog')
      }
      toast.success(`Committed ${response.created_issue_id.slice(0, 8)}`)
      setCommittedMap((prev) => ({ ...prev, [index]: true }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Commit failed'
      toast.error(message)
    } finally {
      setPerItemBusy((prev) => ({ ...prev, [index]: false }))
    }
  }

  const handleRegenerateStory = async (index: number) => {
    if (!runId) {
      toast.error('Run metadata missing. Generate stories again to regenerate.')
      return
    }

    const item = runItems.find((runItem) => runItem.item_index === index)
    if (!item) {
      toast.error('Story metadata not available yet')
      return
    }

    const feedback = (feedbackMap[index] || '').trim()
    if (!feedback) {
      toast.error('Provide feedback before regenerating the story')
      return
    }

    setPerItemBusy((prev) => ({ ...prev, [index]: true }))
    try {
      const regenerated = await agentService.regenerateStory(runId, item.id, feedback)
      updateStory(index, {
        title: regenerated.title,
        acceptance_criteria: regenerated.acceptance_criteria,
      })
      toast.success('Story regenerated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Regeneration failed'
      toast.error(message)
    } finally {
      setPerItemBusy((prev) => ({ ...prev, [index]: false }))
    }
  }

  const getStageIcon = (stage: string) => {
    switch(stage) {
      case 'analyst': return <BrainCircuit className="w-4 h-4" />
      case 'author': return <PenTool className="w-4 h-4" />
      case 'reviewer': return <CheckCheck className="w-4 h-4" />
      case 'refiner': return <Wand2 className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link 
                  to="/dashboard/agents" 
                  className="mt-1 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-500" />
                </Link>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                  <Wand2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">Epic Architect</h1>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Transform epics into ready-to-commit user stories with AI-powered analysis
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/dashboard/projects">
                  <ClipboardList className="h-4 w-4" />
                  View Backlog
                </Link>
              </Button>
            </div>
          </motion.div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                {/* Gradient accent bar */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Configuration</CardTitle>
                      <CardDescription className="text-xs">Setup your decomposition run</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleGenerate}>
                  <div className="space-y-2">
                    <Label htmlFor="epic-id">Epic reference</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          id="epic-id"
                          placeholder="Epic UUID or key"
                          value={epicId}
                          onChange={(event) => setEpicId(event.target.value)}
                          className="flex-1"
                        />
                        <Popover open={epicPickerOpen} onOpenChange={setEpicPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="icon">
                              <Sparkles className="h-4 w-4 text-sky-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[300px] p-0">
                            <Command>
                              <CommandInput value={epicSearch} onValueChange={setEpicSearch} placeholder="Search epics..." />
                              <CommandList>
                                <CommandEmpty>No epics found.</CommandEmpty>
                                {epicsLoading ? (
                                  <CommandGroup><CommandItem disabled>Loading...</CommandItem></CommandGroup>
                                ) : (
                                  <CommandGroup heading="Epics">
                                    {filteredEpics.map((epic) => (
                                      <CommandItem key={epic.id} onSelect={() => handleSelectEpic(epic)}>
                                        <span className="truncate">{epic.title}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{epic.issue_key}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {selectedEpic && (
                        <div className="text-xs text-sky-600 bg-sky-50 px-2 py-1 rounded border border-sky-100 truncate">
                          {selectedEpic.title}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-stories">Max stories</Label>
                    <Input
                      id="max-stories"
                      type="number"
                      min={3}
                      max={12}
                      value={maxStories}
                      onChange={(e) => setMaxStories(clampStories(parseInt(e.target.value) || 6))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-prompt">Guidance</Label>
                    <Textarea
                      id="user-prompt"
                      placeholder="Focus areas, constraints, etc."
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button 
                      type="submit" 
                      disabled={isGenerating} 
                      className="w-full gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isGenerating ? 'Generating...' : 'Generate Stories'}
                    </Button>
                    {(storiesDraft.length > 0 || analystInsights) && (
                      <Button type="button" variant="outline" onClick={handleReset} disabled={isGenerating} className="gap-2">
                        <Undo2 className="h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
            </motion.div>

            {/* Progress Card */}
            {isGenerating && progress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-400 to-purple-500" />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium text-blue-700">
                      <span className="flex items-center gap-2">
                        {getStageIcon(progress.stage)}
                        {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)} Stage
                      </span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                        {progress.percent}%
                      </Badge>
                    </div>
                    <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-blue-600/80">{progress.message}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <motion.div 
            className="lg:col-span-8 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm min-h-[500px] overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2"
                >
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-900">Generation Failed</h3>
                <p className="text-sm text-slate-600 max-w-md">{error}</p>
                <Button variant="outline" onClick={() => setError(null)} className="gap-2">
                  <Undo2 className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : isGenerating && !storiesDraft.length && !analystInsights ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <motion.div 
                  className="relative w-24 h-24"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-2 rounded-lg bg-blue-100">
                      {progress?.stage && getStageIcon(progress.stage)}
                    </div>
                  </div>
                </motion.div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {progress?.message || 'Starting agent...'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Our AI agent is analyzing your epic, identifying user personas, and drafting acceptance criteria.
                  </p>
                </div>
                {progress && (
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="capitalize font-medium">{progress.stage} Stage</span>
                      <span className="font-semibold text-blue-600">{progress.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : !storiesDraft.length && !analystInsights ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 flex items-center justify-center mb-4"
                >
                  <Wand2 className="w-10 h-10 text-blue-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-700">Ready to Generate</h3>
                <p className="max-w-sm mt-2 text-sm text-slate-500">Select an epic and provide optional guidance to start the AI decomposition process.</p>
                <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="h-4 w-4" />
                    <span>AI Analysis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PenTool className="h-4 w-4" />
                    <span>Story Generation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCheck className="h-4 w-4" />
                    <span>Quality Review</span>
                  </div>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-6 pt-4 border-b bg-slate-50/50">
                  {isGenerating && progress && (
                    <div className="mb-4 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
                      <div className="relative w-8 h-8 shrink-0">
                         <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
                         <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                           {getStageIcon(progress.stage)}
                         </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs font-medium text-blue-700 mb-1">
                          <span className="truncate">{progress.message}</span>
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 ml-2">
                            {progress.percent}%
                          </Badge>
                        </div>
                        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.percent}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100">
                    <TabsTrigger value="stories" disabled={!storiesDraft.length} className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Stories ({storiesDraft.length})
                      {isGenerating && storiesDraft.length === 0 && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                    </TabsTrigger>
                    <TabsTrigger value="insights" disabled={!analystInsights} className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <BrainCircuit className="h-4 w-4 mr-2" />
                      Insights
                      {isGenerating && !analystInsights && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 relative">
                  <TabsContent value="stories" className="m-0">
                    <div className="h-full">
                      <div className="p-6 space-y-6 pb-20">
                        {warnings.length > 0 && (
                          <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <ul className="list-disc list-inside text-xs">
                                {warnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {storiesDraft.map((story, index) => {
                          const isDup = duplicates.some(d => d.story_index === index)
                          const isCommitted = committedMap[index]
                          const isBusy = perItemBusy[index]

                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card className={cn(
                                "transition-all hover:shadow-md border-l-4 overflow-hidden",
                                isDup ? "border-l-amber-400" : "border-l-blue-500",
                                isCommitted && "bg-emerald-50/30"
                              )}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs font-medium bg-slate-50">Story #{index + 1}</Badge>
                                      {isDup && <Badge className="text-amber-700 bg-amber-100 border-amber-200">Possible Duplicate</Badge>}
                                      {isCommitted && (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Committed
                                        </Badge>
                                      )}
                                    </div>
                                    <Input 
                                      value={story.title} 
                                      onChange={(e) => updateStory(index, { title: e.target.value })}
                                      className="font-semibold text-base border-transparent hover:border-slate-200 px-0 h-auto focus-visible:ring-1 focus-visible:ring-blue-500"
                                      disabled={isCommitted}
                                    />
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <CheckCheck className="h-3 w-3" />
                                    Acceptance Criteria
                                  </Label>
                                  <Textarea 
                                    value={story.acceptance_criteria.join('\n')} 
                                    onChange={(e) => updateStory(index, { acceptance_criteria: e.target.value.split('\n').filter(Boolean) })}
                                    rows={Math.max(3, story.acceptance_criteria.length)} 
                                    className="text-sm font-mono bg-slate-50/50 min-h-[100px] focus-visible:ring-1 focus-visible:ring-blue-500"
                                    disabled={isCommitted}
                                  />
                                </div>

                                {(story.persona || story.user_value || story.risks?.length) && (
                                  <div className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50/30 p-3 rounded-lg border border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      {story.persona && (
                                        <div>
                                          <span className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                            <User className="h-3 w-3" /> Persona
                                          </span>
                                          <span className="font-medium text-slate-700">{story.persona}</span>
                                        </div>
                                      )}
                                      {story.user_value && (
                                        <div>
                                          <span className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                            <Target className="h-3 w-3" /> User Value
                                          </span>
                                          <span className="text-slate-700">{story.user_value}</span>
                                        </div>
                                      )}
                                    </div>
                                    {story.risks && story.risks.length > 0 && (
                                      <div className="pt-2 border-t border-slate-200/60">
                                        <span className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3 text-amber-500" /> Risks & Dependencies
                                        </span>
                                        <ul className="space-y-1 mt-1">
                                          {story.risks.map((risk, rIdx) => (
                                            <li key={rIdx} className="text-xs text-amber-700 flex items-start gap-1.5">
                                              <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                              {risk}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                                  <Input 
                                    placeholder="Feedback for regeneration..." 
                                    className="text-xs h-8 flex-1"
                                    value={feedbackMap[index] || ''}
                                    onChange={(e) => setFeedbackMap(prev => ({ ...prev, [index]: e.target.value }))}
                                    disabled={isCommitted}
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="h-8 text-xs gap-1"
                                    disabled={isBusy || isCommitted || isGenerating}
                                    onClick={() => handleRegenerateStory(index)}
                                  >
                                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Regenerate
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant={isCommitted ? "secondary" : "outline"}
                                    className={cn(
                                      "h-8 text-xs gap-1",
                                      !isCommitted && "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                    )}
                                    disabled={isBusy || isCommitted || isGenerating}
                                    onClick={() => handleCommitStory(index)}
                                  >
                                    {isCommitted ? <CheckCircle2 className="h-3 w-3 text-emerald-600"/> : <Check className="h-3 w-3" />}
                                    {isCommitted ? "Committed" : "Commit"}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="insights" className="m-0">
                    <div className="h-full">
                      <div className="p-6 space-y-6">
                        {analystInsights && (
                          <>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Target className="w-4 h-4 text-blue-500"/>
                                  Strategic Analysis
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium text-slate-700 mb-1">Epic Summary</h4>
                                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">{analystInsights.epic_summary}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                      <User className="w-3 h-3"/> Primary Users
                                    </h4>
                                    <ul className="space-y-1">
                                      {analystInsights.primary_users.map((u,i) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"/>
                                          {u}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                      <Target className="w-3 h-3"/> Success Metrics
                                    </h4>
                                    <ul className="space-y-1">
                                      {analystInsights.success_metrics.map((m,i) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0"/>
                                          {m}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">Must-Have Capabilities</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-2">
                                    {analystInsights.must_have_capabilities.map((c,i) => (
                                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0"/>
                                        {c}
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                              
                              {analystInsights.constraints && analystInsights.constraints.length > 0 && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Constraints & Risks</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className="space-y-2">
                                      {analystInsights.constraints.map((c,i) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0"/>
                                          {c}
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </motion.div>
        </div>
        
        {/* Footer Actions */}
        {storiesDraft.length > 0 && (
          <motion.div 
            className="flex justify-between items-center pt-4 border-t border-slate-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{storiesDraft.length}</span> stories generated
              {Object.values(committedMap).filter(Boolean).length > 0 && (
                <span className="ml-2">
                  • <span className="text-emerald-600 font-medium">{Object.values(committedMap).filter(Boolean).length}</span> committed
                </span>
              )}
            </div>
            <Button 
              onClick={handleCommitAll} 
              disabled={isCommittingAll || !storiesDraft.length || Object.values(committedMap).filter(Boolean).length === storiesDraft.length} 
              className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
            >
              {isCommittingAll ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
              Commit All Stories
            </Button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
