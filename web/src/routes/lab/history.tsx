import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Edit, MessageSquare, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PaginationBlock } from '@/components/blocks/pagination'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDeleteChatSession, useGetAllChatSessions, useUpdateChatSession } from '@/hooks/api/chat'
import { useDebounce } from '@/hooks/custom/use-debounce'
import { cn } from '@/lib/utils'
import type { TChatSession } from '@/types/models'

type HistorySearch = {
  page?: number
  search?: string
  is_starred?: boolean
}

const HistoryPage = () => {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page = 1, search: searchQuery, is_starred: starredFilter } = Route.useSearch()
  const [searchInput, setSearchInput] = useState(searchQuery || '')
  const debouncedSearch = useDebounce(searchInput, 500)

  const { data, isLoading, isError, error } = useGetAllChatSessions({
    page,
    search: searchQuery,
    is_starred: starredFilter
  })

  useEffect(() => {
    setSearchInput(searchQuery || '')
  }, [searchQuery])

  // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to update the URL when the debounced search changes
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      navigate({
        search: (prev) => ({
          ...prev,
          search: debouncedSearch || undefined,
          page: 1
        })
      })
    }
  }, [debouncedSearch, searchQuery])

  const sessions = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-1 flex-col space-y-4 p-2 sm:p-4">
        <div className="space-y-1">
          <h2 className="font-bold text-xl sm:text-2xl">Chat History</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Revisit and manage previous conversations.</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <SearchInput
            type="text"
            placeholder="Search chat sessions..."
            value={searchInput}
            onChangeValue={setSearchInput}
            className="flex-1"
            inputClassName="h-9"
          />

          <Label
            htmlFor="starred-filter"
            className="flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-2.5 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            <Checkbox
              id="starred-filter"
              className="scale-120"
              checked={starredFilter || false}
              onCheckedChange={(checked) => {
                navigate({
                  search: (prev) => ({
                    ...prev,
                    is_starred: checked ? true : undefined,
                    page: 1
                  })
                })
              }}
            />
            Starred
          </Label>

          <Button asChild>
            <Link to="/lab/chat/new">
              <Plus className="size-4" />
              <span className="hidden sm:block">New Chat</span>
            </Link>
          </Button>
        </div>

        {isLoading && <HistoryLoadingSkeleton />}

        {!isLoading && (error || !sessions) && <HistoryErrorMessage errorMessage={error?.message} />}

        {!isLoading && !isError && sessions.length === 0 && <HistoryNoData />}

        {!isLoading && !isError && sessions.length > 0 && (
          <>
            {sessions.map((session) => (
              <ChatSessionCard key={session.id} session={session} />
            ))}

            <PaginationBlock
              pagination={pagination}
              currentPage={page}
              onPageChange={(newPage) => {
                navigate({
                  search: (prev) => ({ ...prev, page: newPage })
                })
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/lab/history')({
  component: HistoryPage,
  validateSearch: (search: Record<string, unknown>): HistorySearch => {
    return {
      page: Number(search?.page) || 1,
      search: search?.search ? String(search.search) : undefined,
      is_starred: search?.is_starred === 'true' || search?.is_starred === true ? true : undefined
    }
  }
})

const HistoryLoadingSkeleton = () => (
  <div className="w-full space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={`history-skeleton-${i}`} className="p-3 sm:p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="mt-1 h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </Card>
    ))}
  </div>
)

const HistoryErrorMessage = ({ errorMessage }: { errorMessage?: string }) => (
  <Card className="w-full">
    <CardContent className="px-4 py-4 text-center sm:px-6 sm:py-8">
      <p className="text-muted-foreground">{errorMessage || 'Failed to load chat history. Please try again.'}</p>
    </CardContent>
  </Card>
)

const HistoryNoData = () => (
  <Card className="w-full">
    <CardContent className="flex flex-col items-center justify-center px-4 py-4 text-center sm:px-6 sm:py-8">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
        <MessageSquare className="size-10 text-muted-foreground" />
      </div>
      <div className="mb-6 space-y-2">
        <h3 className="font-semibold text-lg tracking-tight sm:text-xl">No chat sessions yet</h3>
        <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          Start a new conversation to get started.
        </p>
      </div>
      <Button asChild>
        <Link to="/lab/chat/new">New Chat</Link>
      </Button>
    </CardContent>
  </Card>
)

const ChatSessionCard = ({ session }: { session: TChatSession }) => {
  const [title, setTitle] = useState(session.title || '')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const updateMutation = useUpdateChatSession()
  const deleteMutation = useDeleteChatSession()

  const handleToggleStar = () => {
    updateMutation.mutate({
      chatSessionId: session.id,
      is_starred: !session.is_starred
    })
  }

  const handleEditSave = () => {
    if (title.trim() && title.trim() !== (session.title || '')) {
      updateMutation.mutate({
        chatSessionId: session.id,
        title: title.trim() || null
      })
    }
    setEditDialogOpen(false)
  }

  const handleEditCancel = () => {
    setTitle(session.title || '')
    setEditDialogOpen(false)
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { chatSessionId: session.id },
      {
        onSuccess: () => setDeleteDialogOpen(false)
      }
    )
  }

  const timeAgo = formatDistanceToNow(new Date(session.last_message_at ?? session.updated_at ?? ''), {
    addSuffix: true
  })

  return (
    <>
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <Link to="/lab/chat/$chatSessionId" params={{ chatSessionId: session.id }} className="flex-1">
            <CardHeader className="gap-1 px-0">
              <CardTitle className="line-clamp-2 flex w-full items-center gap-2 text-sm sm:text-base">
                {session.title || 'Untitled Chat'}
              </CardTitle>
              <CardDescription className="text-2xs capitalize sm:text-xs">
                {timeAgo}
                {session.message_count &&
                  ` • ${session.message_count} ${session.message_count === 1 ? 'message' : 'messages'}`}
              </CardDescription>
            </CardHeader>
          </Link>

          <div className="flex items-center gap-px">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 sm:size-8"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggleStar()
                  }}
                  disabled={updateMutation.isPending}
                >
                  <Star className={cn('size-3 sm:size-4', session.is_starred && 'fill-amber-500 text-amber-500')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{session.is_starred ? 'Unstar chat' : 'Star chat'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 sm:size-8"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTitle(session.title || '')
                    setEditDialogOpen(true)
                  }}
                >
                  <Edit className="size-3 sm:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit chat title</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 sm:size-8"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDeleteDialogOpen(true)
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-3 text-destructive sm:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete chat session</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>

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
            <Button onClick={handleEditSave} disabled={title.trim() === (session.title || '')}>
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
              This will remove <span className="font-semibold text-foreground">{session.title || 'Untitled Chat'}</span>{' '}
              from your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
