import React, { useEffect, useState } from 'react'
import { issueService, type IssueDTO, type IssueComment } from '@/lib/api/issueService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AssigneePicker } from '@/components/issues/AssigneePicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface Props {
  issueId: string | null
  onClose: () => void
  onUpdated?: (issue: IssueDTO) => void
  focusMode: boolean
  setFocusMode: (v: boolean) => void
}

// Lightweight duplication of internal issue sheet logic for backlog usage
export function IssueDetailSheet({ issueId, onClose, onUpdated, focusMode, setFocusMode }: Props) {
  const { activeWorkspaceId } = useWorkspace()
  const [issue, setIssue] = useState<IssueDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('task')
  const [description, setDescription] = useState('')
  const [epicId, setEpicId] = useState('')
  const [storyPoints, setStoryPoints] = useState('')
  const [businessValue, setBusinessValue] = useState('')
  const [effortEstimate, setEffortEstimate] = useState('')
  const [riskLevel, setRiskLevel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [criteria, setCriteria] = useState<{ text: string; done?: boolean }[]>([])
  const [newCriterion, setNewCriterion] = useState('')
  const [comments, setComments] = useState<IssueComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  const projectId = issue?.project_id || ''
  // Fetch epics in same project for linking
  const epicsQuery = useQuery({
    queryKey: ['issue-sheet-epics', projectId, activeWorkspaceId],
    queryFn: () => issueService.listIssues({ project_id: projectId || undefined, workspace_id: activeWorkspaceId || undefined, type: 'epic', limit: 500, offset: 0 }),
    enabled: !!projectId && !!issueId
  })

  // Load issue when id changes
  useEffect(() => {
    if (!issueId) { setIssue(null); return }
    setLoading(true)
    issueService.getIssue(issueId).then(setIssue).catch(e => {
      toast.error(e instanceof Error ? e.message : 'Failed to load issue')
    }).finally(() => setLoading(false))
  }, [issueId])

  useEffect(() => {
    if (!issue) return
    setTitle(issue.title)
    setAssignee(issue.assignee_name || '')
    setStatus(issue.status || 'todo')
    setPriority(issue.priority || '')
    setType(issue.type || 'task')
    setDescription(issue.description || '')
    setEpicId(issue.epic_id || '')
    setStoryPoints(issue.story_points != null ? String(issue.story_points) : '')
    setBusinessValue(issue.business_value != null ? String(issue.business_value) : '')
    setEffortEstimate(issue.effort_estimate != null ? String(issue.effort_estimate) : '')
    setRiskLevel(issue.risk_level || '')
    setDueDate(issue.due_date || '')
    setCriteria(issue.acceptance_criteria || [])
    // comments
    let mounted = true
    setLoadingComments(true)
    issueService.listComments(issue.id).then(cs => { if(mounted) setComments(cs) }).finally(()=> { if(mounted) setLoadingComments(false) })
    return () => { mounted = false }
  }, [issue])

  const save = async () => {
    if(!issue) return
    const patch: Record<string, unknown> = {}
    if (title.trim() && title.trim() !== issue.title) patch.title = title.trim()
    if (assignee.trim() !== (issue.assignee_name || '')) patch.assignee_name = assignee.trim() || null
    if (status !== issue.status) patch.status = status
    if (priority !== (issue.priority || '')) patch.priority = priority || null
    if (type !== issue.type) patch.type = type
    if (description !== (issue.description || '')) patch.description = description || null
    if (epicId !== (issue.epic_id || '')) patch.epic_id = epicId || null
    if (storyPoints !== (issue.story_points != null ? String(issue.story_points) : '')) patch.story_points = storyPoints ? Number(storyPoints) : null
    if (businessValue !== (issue.business_value != null ? String(issue.business_value) : '')) patch.business_value = businessValue ? Number(businessValue) : null
    if (effortEstimate !== (issue.effort_estimate != null ? String(issue.effort_estimate) : '')) patch.effort_estimate = effortEstimate ? Number(effortEstimate) : null
    if (riskLevel !== (issue.risk_level || '')) patch.risk_level = riskLevel || null
    if (dueDate !== (issue.due_date || '')) patch.due_date = dueDate || null
    if (JSON.stringify(criteria) !== JSON.stringify(issue.acceptance_criteria || [])) patch.acceptance_criteria = criteria
    if(!Object.keys(patch).length){ setEditMode(false); return }
    setSaving(true)
    try {
      const updated = await issueService.updateIssue(issue.id, patch)
      setIssue(updated)
      setEditMode(false)
      onUpdated?.(updated)
      toast.success('Issue updated')
    } catch(e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally { setSaving(false) }
  }

  const addComment = async () => {
    if(!issue || !newComment.trim()) return
    try { const c = await issueService.addComment(issue.id, newComment.trim()); setComments(prev => [...prev, c]); setNewComment('') } catch(e){ toast.error(e instanceof Error? e.message:'Failed') }
  }
  const deleteComment = async (id: string) => {
    if(!issue) return
    try { await issueService.deleteComment(issue.id, id); setComments(prev => prev.filter(c => c.id !== id)) } catch(e){ toast.error(e instanceof Error? e.message:'Failed') }
  }
  const doDelete = async () => {
    if(!issue) return
    if(!window.confirm('Delete this issue?')) return
    try { await issueService.deleteIssue(issue.id); toast.success('Deleted'); onUpdated?.(issue); onClose() } catch(e){ toast.error(e instanceof Error? e.message:'Delete failed') }
  }

  return (
    <Sheet open={!!issueId} onOpenChange={(o)=> { if(!o) onClose() }} modal={focusMode}>
      <SheetContent side="right" className="z-[80] w-full sm:max-w-2xl pt-6 flex flex-col">
        <SheetHeader className="sticky top-0 z-[90] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 pr-14">
          <SheetTitle className="flex items-center justify-between">
            <span>{issue ? issue.issue_key : (loading ? 'Loading…' : '')}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {!issue && !loading && <div className='p-6 text-sm text-slate-500'>No issue</div>}
          {loading && <div className='p-6 text-sm text-slate-500'>Loading…</div>}
          {issue && (
          <div className="p-4 space-y-4 text-sm">
            <div>
              <div className="font-medium">Summary</div>
              {editMode ? <Input className="mt-1" value={title} onChange={e=> setTitle(e.target.value)} /> : <div className='mt-1'>{issue.title}</div>}
            </div>
            <div className="flex items-center gap-2"><span className="font-medium">Status:</span> {issue.status ? (
              <Badge variant="outline" className={
                issue.status === 'done' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                issue.status === 'in_progress' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-slate-300 text-slate-700 bg-slate-50'
              }>{issue.status === 'in_progress' ? 'In Progress' : issue.status === 'todo' ? 'To Do' : issue.status.charAt(0).toUpperCase()+issue.status.slice(1)}</Badge>
            ) : '—'}</div>
            <div className="flex items-center gap-2"><span className="font-medium">Assignee:</span> {issue.assignee_name || 'Unassigned'}</div>
            <div>
              <div className="font-medium">Priority</div>
              {editMode ? (
                <Select value={priority || '__none__'} onValueChange={v=> setPriority(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder='Pick priority' /></SelectTrigger>
                  <SelectContent position='popper' className='z-[95]'>
                    {['high','med','low'].map(p => <SelectItem key={p} value={p}>{p === 'med' ? 'Medium' : p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
                    <SelectItem value='__none__'>—</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className='mt-1'>
                  {issue.priority ? (
                    <Badge variant='secondary' className={
                      issue.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                      issue.priority === 'med' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      issue.priority === 'low' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }>{issue.priority === 'med' ? 'Medium' : issue.priority.charAt(0).toUpperCase()+issue.priority.slice(1)}</Badge>
                  ) : '—'}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">Epic</div>
              {editMode ? (
                <Select value={epicId || '__none__'} onValueChange={(v)=> setEpicId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className='mt-1'><SelectValue placeholder='Select epic' /></SelectTrigger>
                  <SelectContent position='popper' className='z-[95] max-h-72 overflow-auto'>
                    <SelectItem value='__none__'>—</SelectItem>
                    {(epicsQuery.data?.items || []).filter(e => e.id !== issue.id).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.issue_key} • {e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className='mt-1 text-sm'>
                  {issue.type === 'epic' ? 'This issue is an Epic' : (
                    issue.epic_id ? (() => { const ep = (epicsQuery.data?.items||[]).find(e => e.id === issue.epic_id); return ep ? `${ep.issue_key} • ${ep.title}` : 'Linked to epic' })() : '—'
                  )}
                </div>
              )}
            </div>
            <div className='grid grid-cols-2 gap-4 pt-2'>
              <div>
                <div className='font-medium'>Story Points</div>
                {editMode ? <Input className='mt-1' value={storyPoints} onChange={e=> { const v=e.target.value.replace(/[^0-9]/g,''); setStoryPoints(v) }} placeholder='e.g. 5' /> : <div className='mt-1'>{issue.story_points != null ? issue.story_points : '—'}</div>}
              </div>
              <div>
                <div className='font-medium'>Risk</div>
                {editMode ? (
                  <Select value={riskLevel || '__none__'} onValueChange={v=> setRiskLevel(v === '__none__' ? '' : v)}>
                    <SelectTrigger className='mt-1'><SelectValue placeholder='Risk' /></SelectTrigger>
                    <SelectContent position='popper' className='z-[95]'>
                      <SelectItem value='__none__'>—</SelectItem>
                      {['low','med','high'].map(r => <SelectItem key={r} value={r}>{r === 'med' ? 'Medium' : r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <div className='mt-1'>{issue.risk_level ? (issue.risk_level === 'med' ? 'Medium' : issue.risk_level.charAt(0).toUpperCase()+issue.risk_level.slice(1)) : '—'}</div>}
              </div>
              <div>
                <div className='font-medium'>Business Value</div>
                {editMode ? <Input className='mt-1' value={businessValue} onChange={e=> { const v=e.target.value.replace(/[^0-9]/g,''); setBusinessValue(v) }} placeholder='0-100' /> : <div className='mt-1'>{issue.business_value != null ? issue.business_value : '—'}</div>}
              </div>
              <div>
                <div className='font-medium'>Effort Estimate</div>
                {editMode ? <Input className='mt-1' value={effortEstimate} onChange={e=> { const v=e.target.value.replace(/[^0-9]/g,''); setEffortEstimate(v) }} placeholder='0-100' /> : <div className='mt-1'>{issue.effort_estimate != null ? issue.effort_estimate : '—'}</div>}
              </div>
              <div>
                <div className='font-medium'>Due Date</div>
                {editMode ? <Input type='date' className='mt-1' value={dueDate} onChange={e=> setDueDate(e.target.value)} /> : <div className='mt-1'>{issue.due_date ? new Date(issue.due_date).toLocaleDateString() : '—'}</div>}
              </div>
            </div>
            <div>
              <div className='font-medium mt-2'>Acceptance Criteria</div>
              {editMode ? (
                <div className='mt-1 space-y-2'>
                  {criteria.map((c,i) => (
                    <div key={i} className='flex items-start gap-2 text-xs'>
                      <input type='checkbox' className='mt-1' checked={!!c.done} onChange={e=> setCriteria(prev => prev.map((pc,pi)=> pi===i ? { ...pc, done: e.target.checked } : pc))} />
                      <textarea className='flex-1 border rounded p-1 h-14' value={c.text} onChange={e=> setCriteria(prev => prev.map((pc,pi)=> pi===i ? { ...pc, text: e.target.value } : pc))} />
                      <button className='text-[10px] px-1 py-0.5 border rounded hover:bg-red-50' onClick={()=> setCriteria(prev => prev.filter((_,pi)=> pi!==i))}>x</button>
                    </div>
                  ))}
                  <div className='flex items-center gap-2'>
                    <Input className='text-xs' placeholder='New criterion' value={newCriterion} onChange={e=> setNewCriterion(e.target.value)} />
                    <Button variant='outline' size='sm' disabled={!newCriterion.trim()} onClick={()=> { setCriteria(prev => [...prev, { text: newCriterion.trim(), done: false }]); setNewCriterion('') }}>Add</Button>
                  </div>
                </div>
              ) : (
                <div className='mt-1 space-y-1 text-xs'>
                  {(issue.acceptance_criteria || []).length ? (
                    issue.acceptance_criteria!.map((c,i)=>(
                      <div key={i} className='flex items-start gap-2'>
                        <input type='checkbox' disabled checked={!!c.done} />
                        <div className={c.done? 'line-through text-muted-foreground':'text-slate-700'}>{c.text}</div>
                      </div>
                    ))
                  ) : <div className='text-muted-foreground'>—</div>}
                </div>
              )}
            </div>
            {editMode && (
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <div className='font-medium text-xs'>Status</div>
                  <Select value={status} onValueChange={v=> setStatus(v)}>
                    <SelectTrigger className='mt-1'><SelectValue /></SelectTrigger>
                    <SelectContent position='popper' className='z-[95]'>
                      {['todo','in_progress','done'].map(s => <SelectItem key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s === 'todo' ? 'To Do' : s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className='font-medium text-xs'>Type</div>
                  <Select value={type} onValueChange={v=> setType(v)}>
                    <SelectTrigger className='mt-1'><SelectValue /></SelectTrigger>
                    <SelectContent position='popper' className='z-[95]'>
                      {['task','bug','story','epic'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className='col-span-2'>
                  <div className='font-medium text-xs'>Assignee</div>
                  <div className='mt-1'>
                    <AssigneePicker value={assignee} onChange={setAssignee} placeholder="Unassigned" />
                  </div>
                </div>
                <div className='col-span-2'>
                  <div className='font-medium text-xs'>Description</div>
                  <textarea className='mt-1 border rounded w-full p-2 text-sm h-32' value={description} onChange={e=> setDescription(e.target.value)} placeholder='Details...' />
                </div>
              </div>
            )}
            {!editMode && (
              <div className='text-sm'>
                <div className='font-medium mb-1'>Description</div>
                <div className='whitespace-pre-wrap text-xs bg-slate-50 border rounded p-2 max-h-64 overflow-auto' style={{ minHeight: '64px' }}>{description || '—'}</div>
              </div>
            )}
            <div className='pt-2 border-t'>
              <div className='font-medium mb-2 flex items-center justify-between'>Comments {loadingComments && <span className='text-xs text-muted-foreground'>Loading…</span>}</div>
              <div className='space-y-2 max-h-60 overflow-auto pr-1 text-xs'>
                {comments.map(c => (
                  <div key={c.id} className='border rounded p-2 bg-white flex items-start justify-between gap-2'>
                    <div className='flex-1'>
                      <div className='font-medium'>{c.author_user_id.slice(0,8)}</div>
                      <div className='whitespace-pre-wrap mt-1'>{c.body}</div>
                      <div className='text-[10px] text-muted-foreground mt-1'>{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                    </div>
                    <button className='text-[10px] border rounded px-1 py-0.5 hover:bg-red-50' onClick={()=> deleteComment(c.id)}>Del</button>
                  </div>
                ))}
                {!comments.length && !loadingComments && <div className='text-muted-foreground'>No comments</div>}
              </div>
              <div className='mt-2 flex items-center gap-2'>
                <Input className='text-xs' placeholder='Add comment' value={newComment} onChange={e=> setNewComment(e.target.value)} />
                <Button variant='outline' size='sm' onClick={addComment} disabled={!newComment.trim()}>Add</Button>
              </div>
            </div>
          </div>
          )}
        </div>
        <div className='sticky bottom-0 z-[90] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t p-3 flex items-center gap-3'>
          <label className='flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none'>
            <input type='checkbox' className='accent-slate-700' checked={focusMode} onChange={e=> setFocusMode(e.target.checked)} />
            Focus mode
          </label>
          <div className='flex-1' />
          <div className='flex items-center gap-2'>
            {issue && editMode && <Button variant='outline' size='sm' disabled={saving} onClick={()=> setEditMode(false)}>Cancel</Button>}
            {issue && editMode && <Button size='sm' disabled={saving} onClick={save}>{saving ? 'Saving…':'Save'}</Button>}
            {issue && !editMode && <Button variant='outline' size='sm' onClick={()=> setEditMode(true)}>Edit</Button>}
            {issue && !editMode && <Button variant='destructive' size='sm' onClick={doDelete}>Delete</Button>}
            <Button variant='outline' size='sm' onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
