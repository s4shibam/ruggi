import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, Edit, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ChatInput, type TChatInputProps } from '@/components/chat-input'
import { ChatMessageBlock } from '@/components/chat-message-block'
import { TextShimmer } from '@/components/motion-primitives/text-shimmer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DOCUMENT_STATUS } from '@/constants/common'
import {
  useCreateChatMessage,
  useDeleteChatSession,
  useGenerateChatTitle,
  useGetChatSession,
  useUpdateChatSession
} from '@/hooks/api/chat'
import { useGetAllDocuments } from '@/hooks/api/document'
import { invalidateQueries } from '@/lib/tanstack-query'
import { cn } from '@/lib/utils'
import { useChatRedirection } from '@/providers/chat-redirection-provider'
import type { TChatMessage, TDocument } from '@/types/models'

const ChatSessionPage = () => {
  const { chatSessionId } = Route.useParams()

  const { intermediateChatMessage, setIntermediateChatMessage } = useChatRedirection()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedIntermediateSessionIdRef = useRef<string | null>(null)

  const [sessionTitle, setSessionTitle] = useState('')
  const [messages, setMessages] = useState<TChatMessage[]>([])
  const [wasRedirectRender, setWasRedirectRender] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [sessionDocuments, setSessionDocuments] = useState<Pick<TDocument, 'id' | 'title'>[]>([])

  const { data: sessionData, isLoading: isLoadingSession } = useGetChatSession({ chatSessionId })
  const { data: documentsData, isLoading: isDocumentsLoading } = useGetAllDocuments({
    status: DOCUMENT_STATUS.COMPLETED
  })

  const session = sessionData?.data
  const availableDocuments = documentsData?.data || []

  const createMessageMutation = useCreateChatMessage()
  const generateTitleMutation = useGenerateChatTitle()

  const handleSendMessage = async ({ content, documents }: Parameters<TChatInputProps['onSend']>[0]) => {
    if (!chatSessionId) return

    setIsSendingMessage(true)

    const tempUserMessage: TChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: chatSessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }

    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const response = await createMessageMutation.mutateAsync({
        session_id: chatSessionId,
        content,
        document_ids: documents?.map((doc) => doc.id)
      })

      if (response?.data) {
        setSessionDocuments(response.data.attached_documents || documents || [])

        const assistantMessage: TChatMessage = {
          id: `temp-assistant-${Date.now()}`,
          session_id: chatSessionId,
          role: 'assistant',
          content: response.data.assistant_message_content,
          created_at: new Date().toISOString()
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('error sending chat message', error)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to handle the intermediate chat message when it changes
  useEffect(() => {
    const asyncFn = async () => {
      if (!intermediateChatMessage?.session_id) {
        processedIntermediateSessionIdRef.current = null
        return
      }

      if (processedIntermediateSessionIdRef.current === intermediateChatMessage.session_id) {
        return
      }

      processedIntermediateSessionIdRef.current = intermediateChatMessage.session_id

      const sessionId = intermediateChatMessage.session_id
      const content = intermediateChatMessage.content
      const attachedDocuments = intermediateChatMessage.attached_documents
      setIsSendingMessage(true)
      setSessionDocuments(attachedDocuments || [])

      const tempUserMessage: TChatMessage = {
        id: `temp-user-${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      }

      setMessages((prev) => {
        if (prev.length === 0) {
          return [...prev, tempUserMessage]
        }

        return prev
      })

      try {
        const response = await createMessageMutation.mutateAsync({
          session_id: sessionId,
          content,
          document_ids: attachedDocuments?.map((doc) => doc.id)
        })

        if (response?.data) {
          setSessionDocuments(response.data.attached_documents || attachedDocuments || [])

          const assistantMessage: TChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            session_id: sessionId,
            role: 'assistant',
            content: response.data.assistant_message_content,
            created_at: new Date().toISOString()
          }
          setMessages((prev) => [...prev, assistantMessage])
          setIntermediateChatMessage(null)

          generateTitleMutation.mutate(
            {
              chatSessionId,
              content
            },
            {
              onSuccess: (response) => {
                if (response.data) {
                  setSessionTitle(response.data.title)
                }

                invalidateQueries({ queryKey: ['useGetAllChatSessions', { is_starred: false }] })
              }
            }
          )
        }
      } catch (error) {
        console.error('Error sending intermediate chat message', error)
      } finally {
        setIsSendingMessage(false)
      }
    }

    asyncFn()
  }, [intermediateChatMessage])

  useEffect(() => {
    if (intermediateChatMessage?.session_id) {
      setWasRedirectRender(true)
    }
  }, [intermediateChatMessage?.session_id])

  useEffect(() => {
    if (intermediateChatMessage?.attached_documents) {
      setSessionDocuments(intermediateChatMessage.attached_documents)
      return
    }

    if (session?.attached_documents !== undefined) {
      setSessionDocuments(session.attached_documents || [])
    }
  }, [intermediateChatMessage?.attached_documents, session?.attached_documents])

  useEffect(() => {
    if (session?.messages && !wasRedirectRender) {
      setMessages(session.messages)
    }
  }, [session?.messages, wasRedirectRender])

  useEffect(() => {
    if (messages.length === 0) return

    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [messages])

  if (!intermediateChatMessage && !chatSessionId) {
    return <ChatErrorMessage />
  }

  if (!intermediateChatMessage && isLoadingSession) {
    return <ChatLoadingSkeleton />
  }

  return (
    <div className="relative h-full flex-1">
      <ChatHeader
        chatSessionId={chatSessionId}
        isStarred={session?.is_starred}
        sessionTitle={sessionTitle || session?.title || 'Untitled Chat'}
      />

      <ScrollArea className="relative h-[calc(100vh-3.5rem)] w-full">
        <div className="mx-auto max-w-3xl space-y-6 p-4 pb-32 md:pb-64">
          {messages.length === 0 && <ChatNoMessages />}

          {messages.map((msg) => (
            <ChatMessageBlock key={msg.id} message={msg} />
          ))}

          {isSendingMessage && (
            <TextShimmer duration={1} className="text-sm">
              Thinking...
            </TextShimmer>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div className="-translate-x-1/2 absolute bottom-0 left-1/2 z-10 h-10 w-full max-w-3xl bg-background" />
      </ScrollArea>

      <div className="-translate-x-1/2 absolute bottom-0 left-1/2 z-20 w-full max-w-3xl p-4" id="chat-input-container">
        <ChatInput
          onSend={handleSendMessage}
          isPending={isSendingMessage}
          documents={availableDocuments}
          isDocumentsLoading={isDocumentsLoading}
          initialSelectedDocuments={sessionDocuments}
        />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/lab/chat/$chatSessionId')({
  component: ChatSessionPage
})

const ChatLoadingSkeleton = () => {
  return (
    <div className="relative h-full flex-1">
      <nav className="flex h-14 w-full items-center justify-between gap-3 border-b p-3 md:p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="size-8 rounded-md" />
      </nav>

      <ScrollArea className="h-[calc(100vh-3.5rem)] w-full">
        <div className="mx-auto max-w-3xl space-y-6 p-4 pb-32 md:pb-64">
          {Array.from({ length: 4 }).map((_, i) => {
            const isUser = i % 2 === 0
            return (
              <div key={i} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                <Skeleton className={cn('rounded-xl', isUser ? 'h-10 w-1/4' : 'h-24 w-2/3')} />
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

const ChatErrorMessage = () => {
  return (
    <div className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="space-y-2">
          <h2 className="font-bold text-2xl text-foreground">Welcome to Chat</h2>
          <p className="text-muted-foreground">Start a new conversation or select a chat from the sidebar.</p>
        </div>
        <Button asChild>
          <Link to="/lab/chat/new">New Chat</Link>
        </Button>
      </div>
    </div>
  )
}

const ChatNoMessages = () => {
  return (
    <div className="flex h-full items-center justify-center py-12">
      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
    </div>
  )
}

type TChatHeaderProps = {
  chatSessionId: string
  isStarred?: boolean
  sessionTitle?: string
}

const ChatHeader = ({ chatSessionId, isStarred, sessionTitle }: TChatHeaderProps) => {
  const navigate = useNavigate()
  const [title, setTitle] = useState(sessionTitle || '')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const updateSessionMutation = useUpdateChatSession()
  const deleteSessionMutation = useDeleteChatSession()

  useEffect(() => {
    setTitle(sessionTitle || 'Untitled Chat')
  }, [sessionTitle])

  const handleToggleStar = () => {
    if (!chatSessionId) return
    updateSessionMutation.mutate({
      chatSessionId,
      is_starred: !isStarred
    })
  }

  const handleEditSave = () => {
    if (!chatSessionId) return

    if (title.trim() && title.trim() !== sessionTitle) {
      updateSessionMutation.mutate(
        {
          chatSessionId,
          title: title.trim() || null
        },
        {
          onSuccess: () => {
            invalidateQueries({ queryKey: ['useGetChatSession', { chatSessionId }] })
          }
        }
      )
    }
    setEditDialogOpen(false)
  }

  const handleEditCancel = () => {
    setTitle(sessionTitle || '')
    setEditDialogOpen(false)
  }

  const handleDelete = () => {
    if (!chatSessionId) return
    deleteSessionMutation.mutate(
      { chatSessionId },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          navigate({ to: '/lab/chat/new' })
        }
      }
    )
  }

  return (
    <>
      <nav className="flex h-14 w-full items-center justify-between gap-2 border-b p-3 sm:gap-3 md:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="truncate font-semibold text-sm sm:text-base">{sessionTitle || 'Untitled Chat'}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setTitle(sessionTitle || '')
                  setEditDialogOpen(true)
                }}
              >
                <Edit className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-px">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleStar}
                disabled={updateSessionMutation.isPending}
              >
                <Star className={cn('size-4', isStarred && 'fill-amber-500 text-amber-500')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isStarred ? 'Unstar chat' : 'Star chat'}</TooltipContent>
          </Tooltip>
        </div>
      </nav>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit chat title</DialogTitle>
            <DialogDescription>Update the title of this chat session.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
                if (e.key === 'Escape') handleEditCancel()
              }}
              placeholder="Untitled Chat"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={title.trim() === sessionTitle}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat session?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteSessionMutation.isPending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSessionMutation.isPending}>
              {deleteSessionMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
