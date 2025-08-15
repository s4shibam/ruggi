import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { CircleArrowOutUpRight, Edit, FileText, Info, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PaginationBlock } from '@/components/blocks/pagination'
import { DocumentSummaryDialog } from '@/components/document-summary-dialog'
import { DocumentUploadDialog } from '@/components/document-upload-dialog'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DOCUMENT_STATUS, DOCUMENT_STATUS_FILTERS, DOCUMENT_STATUS_VALUES } from '@/constants/common'
import { useDeleteDocument, useGetAllDocuments, useUpdateDocument } from '@/hooks/api/document'
import { useDebounce } from '@/hooks/custom/use-debounce'
import { formatFileSize } from '@/lib/utils'
import type { TDocument, TDocumentStatus } from '@/types/models'

type DocumentsSearch = {
  page?: number
  status?: TDocumentStatus
  search?: string
}

const DocumentsPage = () => {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page = 1, status: statusFilter, search: searchQuery } = Route.useSearch()

  const [searchInput, setSearchInput] = useState(searchQuery || '')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const debouncedSearch = useDebounce(searchInput, 500)

  const { data, isLoading, isError, error, refetch } = useGetAllDocuments({
    page,
    status: statusFilter,
    search: searchQuery
  })

  const updateMutation = useUpdateDocument()

  useEffect(() => {
    setSearchInput(searchQuery || '')
  }, [searchQuery])

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
  }, [debouncedSearch, navigate, searchQuery])

  const documents = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-1 flex-col space-y-4 p-2 sm:p-4">
        <div className="space-y-1">
          <h2 className="font-bold text-xl sm:text-2xl">Documents</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Upload and manage sources for your chats.</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <SearchInput
            type="text"
            placeholder="Search documents..."
            value={searchInput}
            onChangeValue={setSearchInput}
            className="flex-1"
            inputClassName="h-9"
          />

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                const statusValue = DOCUMENT_STATUS_VALUES.includes(value as TDocumentStatus)
                  ? (value as TDocumentStatus)
                  : undefined

                navigate({
                  search: (prev) => ({
                    ...prev,
                    status: statusValue,
                    page: 1
                  })
                })
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-30">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value} className="cursor-pointer">
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setUploadDialogOpen(true)} className="has-[>svg]:px-5">
              <Upload className="size-4" />
              Upload
            </Button>
          </div>
        </div>

        {isLoading && <DocumentLoadingSkeleton />}

        {!isLoading && (error || !documents) && <DocumentErrorMessage errorMessage={error?.message} />}

        {!isLoading && !isError && documents.length === 0 && (
          <DocumentNoData onUploadClick={() => setUploadDialogOpen(true)} />
        )}

        {!isLoading && !isError && documents.length > 0 && (
          <>
            <div className="w-full space-y-4">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onUpdate={(id, updates) => updateMutation.mutate({ documentId: id, ...updates })}
                />
              ))}
            </div>

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

        <DocumentUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} onUploaded={refetch} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/lab/documents')({
  component: DocumentsPage,
  validateSearch: (search: Record<string, unknown>): DocumentsSearch => {
    return {
      page: Number(search?.page) || 1,
      status: DOCUMENT_STATUS_VALUES.includes(search?.status as TDocumentStatus)
        ? (search.status as TDocumentStatus)
        : undefined,
      search: search?.search ? String(search.search) : undefined
    }
  }
})

const DocumentLoadingSkeleton = () => (
  <div className="w-full space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={`document-skeleton-${i}`} className="p-3 sm:p-4">
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

const DocumentErrorMessage = ({ errorMessage }: { errorMessage?: string }) => (
  <Card className="w-full">
    <CardContent className="px-4 py-4 text-center sm:px-6 sm:py-8">
      <p className="text-muted-foreground">{errorMessage || 'Failed to load documents. Please try again.'}</p>
    </CardContent>
  </Card>
)

const DocumentNoData = ({ onUploadClick }: { onUploadClick: () => void }) => (
  <Card className="w-full">
    <CardContent className="flex flex-col items-center justify-center px-4 py-4 text-center sm:px-6 sm:py-8">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
        <FileText className="size-10 text-muted-foreground" />
      </div>
      <div className="mb-6 space-y-2">
        <h3 className="font-semibold text-lg tracking-tight sm:text-xl">No documents yet</h3>
        <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          Upload your first document to get started.
        </p>
      </div>
      <Button size="sm" onClick={onUploadClick}>
        <Upload className="size-4" />
        Upload
      </Button>
    </CardContent>
  </Card>
)

type DocumentCardProps = {
  document: TDocument
  onUpdate: (id: string, updates: { title?: string; description?: string | null }) => void
}

const DocumentCard = ({ document, onUpdate }: DocumentCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [description, setDescription] = useState(document.description ?? '')

  const deleteMutation = useDeleteDocument()

  const handleEditSave = () => {
    const updates: Parameters<DocumentCardProps['onUpdate']>[1] = {}

    if (title.trim() && title !== document.title) {
      updates.title = title.trim()
    }

    const trimmedDescription = description.trim()
    if (trimmedDescription !== (document.description ?? '').trim()) {
      updates.description = trimmedDescription || null
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(document.id, updates)
    }
    setEditDialogOpen(false)
  }

  const handleEditCancel = () => {
    setTitle(document.title)
    setDescription(document.description ?? '')
    setEditDialogOpen(false)
  }

  const getStatusColor = (status: TDocumentStatus): string => {
    const statusColors: Record<TDocumentStatus, string> = {
      [DOCUMENT_STATUS.COMPLETED]: 'text-green-600',
      [DOCUMENT_STATUS.PROCESSING]: 'text-blue-600',
      [DOCUMENT_STATUS.FAILED]: 'text-red-600',
      [DOCUMENT_STATUS.QUEUED]: 'text-amber-600'
    }

    return statusColors[status] ?? 'text-muted-foreground'
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { documentId: document.id },
      {
        onSuccess: () => setDeleteDialogOpen(false)
      }
    )
  }

  return (
    <>
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <CardTitle className="line-clamp-2 flex w-full items-center gap-2 text-sm sm:text-base">
              <span className="max-w-120 truncate">{document.title}</span>
              {document.status === DOCUMENT_STATUS.FAILED && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    This document failed to process. Delete this document and reupload it.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <CardDescription className="mt-1 text-2xs capitalize sm:text-xs">
              Updated {formatDistanceToNow(new Date(document.updated_at ?? ''), { addSuffix: true })}
              {document.size_kb !== null && document.size_kb !== undefined && ` • ${formatFileSize(document.size_kb)}`}
              {document.document_type && (
                <>
                  {' • '}
                  <span className="uppercase">{document.document_type}</span>
                </>
              )}
              {document.chunk_count !== null && document.chunk_count !== undefined && (
                <>
                  {' • '}
                  <span>
                    {document.chunk_count} {document.chunk_count === 1 ? 'chunk' : 'chunks'}
                  </span>
                </>
              )}
              {' • '}
              <span className={getStatusColor(document.status)}>{document.status}</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-px">
            {document.status === 'completed' && document.summary && document.summary.trim().length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 sm:size-8"
                    onClick={() => setSummaryDialogOpen(true)}
                  >
                    <Sparkles className="size-3 text-purple-600 sm:size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View AI summary</TooltipContent>
              </Tooltip>
            )}

            {document.storage_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 sm:size-8"
                    onClick={() => {
                      if (document.storage_url) {
                        window.open(document.storage_url, '_blank', 'noopener,noreferrer')
                      }
                    }}
                  >
                    <CircleArrowOutUpRight className="size-3 sm:size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View document</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 sm:size-8"
                  onClick={() => {
                    setTitle(document.title)
                    setDescription(document.description ?? '')
                    setEditDialogOpen(true)
                  }}
                >
                  <Edit className="size-3 sm:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit document</TooltipContent>
            </Tooltip>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 sm:size-8"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3 text-destructive sm:size-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete document</TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete document?</DialogTitle>
                  <DialogDescription>
                    This will remove <span className="font-semibold text-foreground">{document.title}</span>{' '}
                    permanently.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>Update the name and description of this document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) handleEditSave()
                  if (e.key === 'Escape') handleEditCancel()
                }}
                placeholder="Document name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document (optional)"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={
                !title.trim() ||
                (title.trim() === document.title && description.trim() === (document.description ?? '').trim())
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentSummaryDialog document={document} open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen} />
    </>
  )
}
