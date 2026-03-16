import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Reply,
  CheckCircle2,
  Circle,
  Send,
  Trash2,
  Loader2,
} from 'lucide-react'

import { prdCollabService, type PRDComment } from '@/lib/api/prdCollabService'

// ─────────────────────────────────────────────────────────────────────────────

interface PRDCommentThreadProps {
  prdId: string
  section: string
  className?: string
}

// ─────────────────────────────────────────────────────────────────────────────

function getInitials(email?: string): string {
  if (!email) return '?'
  const parts = email.split('@')[0].split(/[._-]/)
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('')
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─────────────────────────────────────────────────────────────────────────────

function SingleComment({
  comment,
  prdId,
  depth = 0,
}: {
  comment: PRDComment
  prdId: string
  depth?: number
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const queryClient = useQueryClient()

  const createReply = useMutation({
    mutationFn: (body: string) =>
      prdCollabService.createComment(prdId, {
        section: comment.section,
        body,
        parent_id: comment.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-comments', prdId] })
      setReplyText('')
      setReplying(false)
      toast.success('Reply added')
    },
    onError: () => toast.error('Failed to post reply'),
  })

  const toggleResolve = useMutation({
    mutationFn: () =>
      prdCollabService.updateComment(prdId, comment.id, { resolved: !comment.resolved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-comments', prdId] })
      toast.success(comment.resolved ? 'Comment reopened' : 'Comment resolved')
    },
  })

  const deleteComment = useMutation({
    mutationFn: () => prdCollabService.deleteComment(prdId, comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-comments', prdId] })
      toast.success('Comment deleted')
    },
    onError: () => toast.error('Failed to delete comment'),
  })

  return (
    <div className={cn('group', depth > 0 && 'ml-6 border-l-2 border-muted pl-3')}>
      <div className={cn(
        'flex gap-2.5 py-2',
        comment.resolved && 'opacity-60'
      )}>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10">
            {getInitials(comment.author_email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {comment.author_email?.split('@')[0] || 'User'}
            </span>
            <span>{timeAgo(comment.created_at)}</span>
            {comment.resolved && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600">
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.body}</p>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {depth === 0 && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setReplying(!replying)}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleResolve.mutate()}
                    disabled={toggleResolve.isPending}
                  >
                    {comment.resolved ? (
                      <Circle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{comment.resolved ? 'Reopen' : 'Resolve'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deleteComment.mutate()}
                    disabled={deleteComment.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {replying && (
        <div className="ml-9 mb-2 flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              className="h-8 w-8"
              disabled={!replyText.trim() || createReply.isPending}
              onClick={() => createReply.mutate(replyText.trim())}
            >
              {createReply.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies?.map((reply) => (
        <SingleComment key={reply.id} comment={reply} prdId={prdId} depth={depth + 1} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function PRDCommentThread({ prdId, section, className }: PRDCommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const queryClient = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['prd-comments', prdId, section],
    queryFn: () => prdCollabService.listComments(prdId, section),
    enabled: !!prdId,
  })

  const createComment = useMutation({
    mutationFn: (body: string) =>
      prdCollabService.createComment(prdId, { section, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prd-comments', prdId] })
      setNewComment('')
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to post comment'),
  })

  const unresolvedCount = comments.filter(c => !c.resolved).length

  return (
    <div className={cn('border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="w-4 h-4" />
          Comments
          {unresolvedCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {unresolvedCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Comment list */}
      <ScrollArea className="max-h-[300px]">
        <div className="p-3 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No comments yet
            </p>
          ) : (
            comments.map((c) => (
              <SingleComment key={c.id} comment={c} prdId={prdId} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* New comment input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="text-sm resize-none flex-1"
          />
          <Button
            size="icon"
            className="h-auto w-10 shrink-0"
            disabled={!newComment.trim() || createComment.isPending}
            onClick={() => createComment.mutate(newComment.trim())}
          >
            {createComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
