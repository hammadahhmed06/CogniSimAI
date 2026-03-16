import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Send, Pin, Smile } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { teamService, ChatMessage } from '@/lib/api/teamService'

export default function TeamChat() {
  const { currentTeam } = useTeam()
  const teamId = currentTeam?.id
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading } = useQuery({
    queryKey: ['team-chat', teamId],
    queryFn: () => teamService.listChatMessages(teamId!, { limit: 100 }),
    enabled: !!teamId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  })

  const { data: threads } = useQuery({
    queryKey: ['chat-threads', teamId, replyTo?.id],
    queryFn: () => teamService.listChatMessages(teamId!, { parent_message_id: replyTo!.id }),
    enabled: !!teamId && !!replyTo,
  })

  const sendMessage = useMutation({
    mutationFn: (data: { message: string; parent_message_id?: string }) =>
      teamService.createChatMessage(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat', teamId] })
      if (replyTo) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads', teamId, replyTo.id] })
      }
      setMessage('')
      setReplyTo(null)
      scrollToBottom()
    },
  })

  const addReaction = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      teamService.addMessageReaction(teamId!, messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat', teamId] })
      if (replyTo) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads', teamId, replyTo.id] })
      }
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => teamService.deleteChatMessage(teamId!, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat', teamId] })
      if (replyTo) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads', teamId, replyTo.id] })
      }
    },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    sendMessage.mutate({
      message: message.trim(),
      parent_message_id: replyTo?.id,
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Team Chat</h1>
          <p className="text-gray-600 mt-2">Real-time team discussions and collaboration</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 animate-pulse" />
                <p className="text-gray-500 mt-2">Loading messages...</p>
              </div>
            ) : messages && messages.length > 0 ? (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className="group flex gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {getInitials(msg.user_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{msg.user_name || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                        {msg.is_edited && (
                          <Badge variant="outline" className="text-xs">edited</Badge>
                        )}
                        {msg.is_pinned && (
                          <Pin className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap break-words">{msg.message}</p>
                      
                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                              onClick={() => addReaction.mutate({ messageId: msg.id, emoji })}
                            >
                              <span>{emoji}</span>
                              <span className="text-xs text-muted-foreground">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setReplyTo(msg)}
                        >
                          Reply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addReaction.mutate({ messageId: msg.id, emoji: '👍' })}
                        >
                          <Smile className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600"
                          onClick={() => {
                            if (confirm('Delete this message?')) {
                              deleteMessage.mutate(msg.id)
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>

                      {/* Thread preview */}
                      {replyTo?.id === msg.id && threads && threads.length > 0 && (
                        <div className="mt-3 ml-4 border-l-2 border-blue-300 pl-3 space-y-2">
                          {threads.map(threadMsg => (
                            <div key={threadMsg.id} className="text-sm">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-xs">{threadMsg.user_name}</span>
                                <span className="text-xs text-muted-foreground">{formatTime(threadMsg.created_at)}</span>
                              </div>
                              <p className="text-xs mt-1 text-muted-foreground">{threadMsg.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="text-lg font-semibold mt-4">No messages yet</h3>
                <p className="text-muted-foreground mt-2">Start the conversation!</p>
              </div>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t p-4">
            {replyTo && (
              <div className="mb-3 px-3 py-2 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Replying to {replyTo.user_name}</p>
                    <p className="text-sm truncate max-w-md">{replyTo.message}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={replyTo ? 'Write a reply...' : 'Type a message...'}
                className="min-h-[60px] max-h-[120px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!message.trim() || sendMessage.isPending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
