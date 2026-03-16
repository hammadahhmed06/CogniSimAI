import { useState, useRef, useEffect } from 'react'
import { agentService, GeneratedStoryDraft, AnalystInsights } from '@/lib/api/agentService'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Loader2, CheckCircle2, Circle, Sparkles, User, Target, AlertTriangle, FileText, ArrowRight, RefreshCw, BrainCircuit, PenTool, CheckCheck } from 'lucide-react'
import { notify } from '@/lib/notify'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { cn } from '@/lib/utils'

interface EpicOption { id: string; title: string; issue_key: string }

type Stage = 'init' | 'analyst' | 'author' | 'reviewer' | 'final'

export function EpicGenerateModal({
  open,
  onClose,
  epics,
  onCompleted,
  onBacklogRefresh,
}: {
  open: boolean
  onClose: () => void
  epics: EpicOption[]
  onCompleted?: () => void
  onBacklogRefresh?: () => Promise<void> | void
}) {
  const [epicId, setEpicId] = useState<string>('')
  const [maxStories, setMaxStories] = useState<number>(6)
  const [loading, setLoading] = useState(false)
  const [stories, setStories] = useState<GeneratedStoryDraft[] | null>(null)
  const [analystInsights, setAnalystInsights] = useState<AnalystInsights | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<{ story_index: number; story_title: string; existing_title: string; similarity: number }[]>([])
  const [committing, setCommitting] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [runItems, setRunItems] = useState<{ id: string; item_index: number }[]>([])
  const [perItemBusy, setPerItemBusy] = useState<Record<number, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({})
  const [committedMap, setCommittedMap] = useState<Record<number, boolean>>({})
  const [progress, setProgress] = useState<{ message: string; percent: number; stage: string } | null>(null)
  const [activeTab, setActiveTab] = useState<string>('stories')

  const canGenerate = !!epicId && !loading
  const canCommit = stories && stories.length > 0 && !committing

  // Auto-switch tabs when insights arrive
  useEffect(() => {
    if (analystInsights && !stories) {
      setActiveTab('insights')
    } else if (stories) {
      setActiveTab('stories')
    }
  }, [analystInsights, stories])

  const generate = async () => {
    if(!epicId) return
    setLoading(true)
    setStories(null)
    setAnalystInsights(null)
    setWarnings([])
    setDuplicates([])
    setProgress({ message: 'Initializing...', percent: 0, stage: 'init' })
    
    try {
      await agentService.decomposeStream(epicId, maxStories, userPrompt || undefined, (event) => {
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
            setStories(data.stories)
          }
        } else if (event.type === 'reviewer_result') {
          const data = event.data as { stories: GeneratedStoryDraft[] }
          if (data && data.stories) {
            setStories(data.stories)
          }
        } else if (event.type === 'refiner_result') {
          // Refinement complete - use refined stories
          const data = event.data as { stories: GeneratedStoryDraft[] }
          if (data && data.stories) {
            setStories(data.stories)
          }
        } else if (event.type === 'result') {
          const res = event.data as {
            success: boolean
            data: { stories: GeneratedStoryDraft[] }
            warnings?: string[]
            duplicate_matches?: { story_index: number; story_title: string; existing_title: string; similarity: number }[]
            error?: string
            analyst_insights?: AnalystInsights
          }
          if (res && res.success) {
            setStories(res.data.stories)
            setWarnings(res.warnings || [])
            setDuplicates(res.duplicate_matches || [])
            if (res.analyst_insights) setAnalystInsights(res.analyst_insights)
          } else {
             notify.error(res?.error || 'Generation failed')
          }
        } else if (event.type === 'run_created') {
            setRunId(event.run_id || null)
        } else if (event.type === 'error') {
            notify.error(event.error || 'Stream error')
        }
      })
      
      // Fetch run items if runId was set
      if (runId) {
          // This might be too late if runId is set in the stream, but we can try
          // Actually, we should probably fetch items after the stream is done if runId is set
      }
      
    } catch(e: unknown){
      const msg = e instanceof Error ? e.message : 'Generation failed'
      notify.error(msg)
    } finally { 
        setLoading(false) 
        setProgress(null)
        // Fetch run items after generation is complete if we have a runId
        // We need to access the latest runId state, but closures might be stale.
        // Ideally we'd use a ref or effect, but for now let's rely on the user clicking "Commit" or "Regenerate" which checks runId
    }
  }

  // Effect to fetch run items when runId changes and we have stories
  useEffect(() => {
    if (runId && stories && stories.length > 0) {
      agentService.listRunItems(runId).then(setRunItems).catch(console.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, stories?.length])

  const commit = async () => {
    if(!stories || !epicId) return
    setCommitting(true)
    try {
      const res = await agentService.commit(epicId, stories)
      if(res.committed){
        notify.success(`${res.created_issue_ids?.length || 0} stories created`)
        try {
          await onBacklogRefresh?.()
        } catch (err) {
          notify.error('Backlog refresh failed')
        }
        onCompleted?.()
        onClose()
      } else {
        notify.error('Commit failed')
      }
    } catch(e: unknown){
      const msg = e instanceof Error ? e.message : 'Commit failed'
      notify.error(msg)
    } finally { setCommitting(false) }
  }

  const triggerBacklogRefresh = async () => {
    if (!onBacklogRefresh) return
    try {
      setRefreshing(true)
      await onBacklogRefresh()
      notify.success('Backlog refreshed')
    } catch (err) {
      notify.error('Failed to refresh backlog')
    } finally {
      setRefreshing(false)
    }
  }

  const updateStoryTitle = (idx: number, value: string) => {
    if(!stories) return
    const copy = [...stories]
    copy[idx] = { ...copy[idx], title: value }
    setStories(copy)
  }
  const updateStoryCriteria = (idx: number, value: string) => {
    if(!stories) return
    const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
    const copy = [...stories]
    copy[idx] = { ...copy[idx], acceptance_criteria: lines }
    setStories(copy)
  }

  const getStageIcon = (stage: string) => {
    switch(stage) {
      case 'analyst': return <BrainCircuit className="w-4 h-4" />
      case 'author': return <PenTool className="w-4 h-4" />
      case 'reviewer': return <CheckCheck className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o)=> { if(!o) onClose() }}>
      <DialogContent className='max-w-5xl max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden'>
        <DialogHeader className='px-6 py-4 border-b bg-slate-50/50'>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='text-xl font-semibold flex items-center gap-2'>
                <Sparkles className='w-5 h-5 text-blue-600' />
                AI Epic Decomposition
              </DialogTitle>
              <DialogDescription className='mt-1'>
                Transform high-level epics into production-ready user stories with AI analysis.
              </DialogDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='ghost'
                className='gap-1 text-slate-500'
                disabled={!onBacklogRefresh || refreshing}
                onClick={triggerBacklogRefresh}
              >
                {refreshing ? <Loader2 className='w-4 h-4 animate-spin' /> : <RefreshCw className='w-4 h-4' />}
                Refresh Context
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-hidden flex flex-col md:flex-row'>
          {/* Left Sidebar: Configuration */}
          <div className='w-full md:w-80 border-r bg-slate-50 p-4 flex flex-col gap-6 overflow-y-auto'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Select Epic</label>
                <select 
                  className='w-full border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none' 
                  value={epicId} 
                  onChange={e=> setEpicId(e.target.value)} 
                  disabled={loading || committing}
                >
                  <option value=''>Choose an epic...</option>
                  {epics.map(e => <option key={e.id} value={e.id}>{e.title} ({e.issue_key})</option>)}
                </select>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Story Count Target</label>
                <div className='flex items-center gap-2'>
                  <Input 
                    type='number' 
                    min={1} 
                    max={12} 
                    value={maxStories} 
                    onChange={e=> setMaxStories(Number(e.target.value))} 
                    disabled={loading || committing} 
                    className='bg-white'
                  />
                  <span className='text-xs text-slate-500'>stories</span>
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Guidance & Context</label>
                <Textarea 
                  placeholder='E.g., "Focus on mobile responsiveness", "Include analytics events", "Strict security requirements"...' 
                  value={userPrompt} 
                  onChange={e => setUserPrompt(e.target.value)} 
                  rows={5} 
                  disabled={loading || committing} 
                  className='bg-white resize-none text-sm'
                />
              </div>

              <Button className='w-full gap-2' onClick={generate} disabled={!canGenerate}>
                {loading ? <Loader2 className='w-4 h-4 animate-spin'/> : <Sparkles className='w-4 h-4'/>}
                {loading ? 'Generating...' : 'Generate Stories'}
              </Button>
            </div>

            {/* Progress Indicator */}
            {loading && progress && (
              <Card className='border-blue-100 bg-blue-50/50 shadow-sm'>
                <CardContent className='p-4 space-y-3'>
                  <div className='flex items-center justify-between text-sm font-medium text-blue-700'>
                    <span className='flex items-center gap-2'>
                      {getStageIcon(progress.stage)}
                      {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)} Stage
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className='h-2 w-full bg-blue-100 rounded-full overflow-hidden'>
                    <div 
                      className='h-full bg-blue-600 transition-all duration-500 ease-out' 
                      style={{ width: `${progress.percent}%` }} 
                    />
                  </div>
                  <p className='text-xs text-blue-600/80 animate-pulse'>{progress.message}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className='flex-1 flex flex-col overflow-hidden bg-white'>
            {!stories && !analystInsights && !loading ? (
              <div className='flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center'>
                <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4'>
                  <Sparkles className='w-8 h-8 text-slate-300' />
                </div>
                <h3 className='text-lg font-medium text-slate-600'>Ready to Generate</h3>
                <p className='max-w-sm mt-2 text-sm'>Select an epic and provide optional guidance to start the AI decomposition process.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col overflow-hidden'>
                <div className='px-6 pt-4 border-b'>
                  <TabsList className='grid w-full max-w-md grid-cols-2'>
                    <TabsTrigger value="stories" disabled={!stories}>Generated Stories ({stories?.length || 0})</TabsTrigger>
                    <TabsTrigger value="insights" disabled={!analystInsights}>Analyst Insights</TabsTrigger>
                  </TabsList>
                </div>

                <div className='flex-1 overflow-hidden relative'>
                  <TabsContent value="stories" className='h-full m-0'>
                    <ScrollArea className='h-full'>
                      <div className='p-6 space-y-6 pb-20'>
                        {warnings.length > 0 && (
                          <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-3'>
                            <AlertTriangle className='w-5 h-5 shrink-0 text-amber-600' />
                            <div className='space-y-1'>
                              <p className='font-medium'>Generation Warnings</p>
                              <ul className='list-disc list-inside text-xs space-y-0.5 opacity-90'>
                                {warnings.map((w,i)=><li key={i}>{w}</li>)}
                              </ul>
                            </div>
                          </div>
                        )}

                        {stories?.map((s, idx) => {
                          const dup = duplicates.find(d=> d.story_index === idx)
                          return (
                            <Card key={idx} className={cn('border-l-4 transition-all hover:shadow-md', dup ? 'border-l-amber-400' : 'border-l-blue-500')}>
                              <CardHeader className='pb-3'>
                                <div className='flex items-start justify-between gap-4'>
                                  <div className='space-y-1 flex-1'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='outline' className='text-xs font-normal text-slate-500'>Story #{idx + 1}</Badge>
                                      {dup && <Badge variant='secondary' className='text-amber-700 bg-amber-100 hover:bg-amber-200'>Possible Duplicate</Badge>}
                                    </div>
                                    <Input 
                                      value={s.title} 
                                      onChange={e=> updateStoryTitle(idx, e.target.value)} 
                                      className='font-semibold text-base border-transparent hover:border-slate-200 px-0 h-auto focus-visible:ring-0'
                                    />
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className='space-y-4'>
                                <div className='space-y-2'>
                                  <label className='text-xs font-medium text-slate-500 uppercase tracking-wider'>Acceptance Criteria</label>
                                  <Textarea 
                                    value={s.acceptance_criteria.join('\n')} 
                                    onChange={e=> updateStoryCriteria(idx, e.target.value)} 
                                    rows={Math.max(3, s.acceptance_criteria.length)} 
                                    className='text-sm font-mono bg-slate-50/50 min-h-[100px]'
                                  />
                                </div>
                                
                                {(s.persona || s.user_value) && (
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-md'>
                                    {s.persona && (
                                      <div>
                                        <span className='text-xs text-slate-500 block mb-1'>Persona</span>
                                        <span className='font-medium text-slate-700'>{s.persona}</span>
                                      </div>
                                    )}
                                    {s.user_value && (
                                      <div>
                                        <span className='text-xs text-slate-500 block mb-1'>Value</span>
                                        <span className='text-slate-700'>{s.user_value}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className='flex items-center justify-between pt-2 border-t mt-2'>
                                  <div className='flex gap-2 w-full'>
                                    <Input 
                                      placeholder='Feedback for regeneration...' 
                                      className='text-xs h-8 flex-1'
                                      value={feedbackMap[idx] || ''}
                                      onChange={e => setFeedbackMap(prev => ({ ...prev, [idx]: e.target.value }))}
                                      disabled={committing}
                                    />
                                    <Button 
                                      size='sm' 
                                      variant='secondary' 
                                      className='h-8 text-xs'
                                      disabled={!runId || perItemBusy[idx] || committedMap[idx]}
                                      onClick={async ()=>{
                                        if (!runId) return
                                        const item = runItems.find(r => r.item_index === idx)
                                        if (!item) { notify.error('Run items not loaded'); return }
                                        const fb = (feedbackMap[idx] || '').trim()
                                        if (!fb) { notify.error('Enter feedback'); return }
                                        setPerItemBusy(p => ({ ...p, [idx]: true }))
                                        try {
                                          const resp = await agentService.regenerateStory(runId, item.id, fb)
                                          updateStoryTitle(idx, resp.title)
                                          updateStoryCriteria(idx, resp.acceptance_criteria.join('\n'))
                                          notify.success('Regenerated')
                                        } catch (e: unknown) {
                                          notify.error(e instanceof Error ? e.message : 'Failed')
                                        } finally { setPerItemBusy(p => ({ ...p, [idx]: false })) }
                                      }}
                                    >
                                      Regenerate
                                    </Button>
                                    <Button 
                                      size='sm' 
                                      variant='outline' 
                                      className='h-8 text-xs gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                                      disabled={!runId || perItemBusy[idx] || committedMap[idx]}
                                      onClick={async ()=>{
                                        if (!runId) return
                                        const item = runItems.find(r => r.item_index === idx)
                                        if (!item) { notify.error('Run items not loaded'); return }
                                        setPerItemBusy(p => ({ ...p, [idx]: true }))
                                        try {
                                          const resp = await agentService.commitStory(runId, item.id, { title: s.title, acceptance_criteria: s.acceptance_criteria })
                                          if (!resp.created_issue_id) throw new Error('Failed')
                                          notify.success(`Committed: ${resp.created_issue_id}`)
                                          setCommittedMap(prev => ({ ...prev, [idx]: true }))
                                          await onBacklogRefresh?.()
                                        } catch (e: unknown) {
                                          notify.error(e instanceof Error ? e.message : 'Failed')
                                        } finally { setPerItemBusy(p => ({ ...p, [idx]: false })) }
                                      }}
                                    >
                                      {committedMap[idx] ? <CheckCircle2 className='w-3 h-3'/> : 'Commit'}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="insights" className='h-full m-0'>
                    <ScrollArea className='h-full'>
                      <div className='p-6 space-y-6'>
                        {analystInsights && (
                          <>
                            <Card>
                              <CardHeader>
                                <CardTitle className='text-base flex items-center gap-2'>
                                  <Target className='w-4 h-4 text-blue-500'/>
                                  Strategic Analysis
                                </CardTitle>
                              </CardHeader>
                              <CardContent className='space-y-4'>
                                <div>
                                  <h4 className='text-sm font-medium text-slate-700 mb-1'>Epic Summary</h4>
                                  <p className='text-sm text-slate-600 bg-slate-50 p-3 rounded-md'>{analystInsights.epic_summary}</p>
                                </div>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                  <div>
                                    <h4 className='text-sm font-medium text-slate-700 mb-2 flex items-center gap-2'>
                                      <User className='w-3 h-3'/> Primary Users
                                    </h4>
                                    <ul className='space-y-1'>
                                      {analystInsights.primary_users.map((u,i) => (
                                        <li key={i} className='text-sm text-slate-600 flex items-start gap-2'>
                                          <span className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0'/>
                                          {u}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className='text-sm font-medium text-slate-700 mb-2 flex items-center gap-2'>
                                      <Target className='w-3 h-3'/> Success Metrics
                                    </h4>
                                    <ul className='space-y-1'>
                                      {analystInsights.success_metrics.map((m,i) => (
                                        <li key={i} className='text-sm text-slate-600 flex items-start gap-2'>
                                          <span className='w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0'/>
                                          {m}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                              <Card>
                                <CardHeader className='pb-2'>
                                  <CardTitle className='text-sm font-medium'>Must-Have Capabilities</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className='space-y-2'>
                                    {analystInsights.must_have_capabilities.map((c,i) => (
                                      <li key={i} className='text-sm text-slate-600 flex items-start gap-2'>
                                        <CheckCircle2 className='w-3 h-3 text-green-500 mt-0.5 shrink-0'/>
                                        {c}
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                              
                              {analystInsights.constraints && analystInsights.constraints.length > 0 && (
                                <Card>
                                  <CardHeader className='pb-2'>
                                    <CardTitle className='text-sm font-medium'>Constraints & Risks</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className='space-y-2'>
                                      {analystInsights.constraints.map((c,i) => (
                                        <li key={i} className='text-sm text-slate-600 flex items-start gap-2'>
                                          <AlertTriangle className='w-3 h-3 text-amber-500 mt-0.5 shrink-0'/>
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
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter className='px-6 py-4 border-t bg-slate-50/50'>
          <div className='flex items-center justify-between w-full'>
            <div className='text-xs text-slate-500'>
              {stories ? `${stories.length} stories generated` : 'Ready'}
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={onClose} disabled={loading || committing}>Close</Button>
              <Button onClick={commit} disabled={!canCommit} className='gap-2'>
                {committing ? <Loader2 className='w-4 h-4 animate-spin'/> : <CheckCircle2 className='w-4 h-4'/>}
                Commit All Stories
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
