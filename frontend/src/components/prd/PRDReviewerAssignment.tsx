import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  UserPlus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2,
  Send,
} from 'lucide-react'

import { prdCollabService, type PRDReviewer } from '@/lib/api/prdCollabService'

// ─────────────────────────────────────────────────────────────────────────────

interface PRDReviewerAssignmentProps {
  prdId: string
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-500 bg-green-500/10', icon: CheckCircle2 },
  changes_requested: { label: 'Changes Requested', color: 'text-red-500 bg-red-500/10', icon: AlertTriangle },
  commented: { label: 'Commented', color: 'text-blue-500 bg-blue-500/10', icon: MessageSquare },
}

function getInitials(email?: string): string {
  if (!email) return '?'
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────

function ReviewerCard({
  reviewer,
  prdId,
  isCurrentUser,
}: {
  reviewer: PRDReviewer
  prdId: string
  isCurrentUser: boolean
}) {
  const [feedback, setFeedback] = useState(reviewer.feedback || '')
  const [showFeedback, setShowFeedback] = useState(false)
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      prdCollabService.updateReviewerStatus(prdId, reviewer.id, {
        status,
        feedback: feedback || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-reviewers', prdId] })
      setShowFeedback(false)
      toast.success('Review status updated')
    },
    onError: () => toast.error('Failed to update review'),
  })

  const remove = useMutation({
    mutationFn: () => prdCollabService.removeReviewer(prdId, reviewer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-reviewers', prdId] })
      toast.success('Reviewer removed')
    },
    onError: () => toast.error('Failed to remove reviewer'),
  })

  const cfg = STATUS_CONFIG[reviewer.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10">
          {getInitials(reviewer.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {reviewer.email || 'Unknown User'}
          </span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', cfg.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {cfg.label}
          </Badge>
        </div>
        {reviewer.feedback && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reviewer.feedback}</p>
        )}
        {reviewer.reviewed_at && (
          <span className="text-[10px] text-muted-foreground">
            Reviewed {new Date(reviewer.reviewed_at).toLocaleDateString()}
          </span>
        )}

        {/* Review actions — only for the assigned reviewer */}
        {isCurrentUser && reviewer.status === 'pending' && (
          <div className="mt-2 space-y-2">
            {showFeedback ? (
              <>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback..."
                  rows={2}
                  className="text-sm resize-none"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate('approved')}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate('changes_requested')}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Request Changes
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowFeedback(true)}
              >
                Submit Review
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove reviewer</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function PRDReviewerAssignment({ prdId, className }: PRDReviewerAssignmentProps) {
  const [email, setEmail] = useState('')
  const queryClient = useQueryClient()

  const { data: reviewers = [], isLoading } = useQuery({
    queryKey: ['prd-reviewers', prdId],
    queryFn: () => prdCollabService.listReviewers(prdId),
    enabled: !!prdId,
  })

  const assign = useMutation({
    mutationFn: (reviewerEmail: string) =>
      prdCollabService.assignReviewer(prdId, {
        user_id: reviewerEmail, // In a real app, we'd resolve email→id
        email: reviewerEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-reviewers', prdId] })
      setEmail('')
      toast.success('Reviewer assigned')
    },
    onError: (err: Error) => {
      if (err.message?.includes('409')) {
        toast.error('Reviewer already assigned')
      } else {
        toast.error('Failed to assign reviewer')
      }
    },
  })

  const approvedCount = reviewers.filter(r => r.status === 'approved').length
  const totalCount = reviewers.length

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Reviewers
          </CardTitle>
          {totalCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {approvedCount}/{totalCount} approved
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Reviewer list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : reviewers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No reviewers assigned yet
          </p>
        ) : (
          <div className="space-y-2">
            {reviewers.map((r) => (
              <ReviewerCard
                key={r.id}
                reviewer={r}
                prdId={prdId}
                isCurrentUser={false} // Would check auth context in production
              />
            ))}
          </div>
        )}

        {/* Add reviewer */}
        <div className="flex gap-2 pt-1">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="reviewer@email.com"
            className="text-sm h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email.trim()) {
                assign.mutate(email.trim())
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 px-3"
            disabled={!email.trim() || assign.isPending}
            onClick={() => assign.mutate(email.trim())}
          >
            {assign.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
