import { FileText, Info, Loader2, Paperclip, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DocumentPickerDialog } from '@/components/document-picker-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { TDocument } from '@/types/models'

export type TChatInputProps = {
  className?: string
  isPending?: boolean
  documents?: TDocument[]
  isDocumentsLoading?: boolean
  placeholder?: string
  disabled?: boolean
  initialMessage?: string
  initialSelectedDocuments?: Pick<TDocument, 'id' | 'title'>[]
  onSend: (data: { content: string; documents?: Pick<TDocument, 'id' | 'title'>[] }) => void | Promise<void>
}

export const ChatInput = ({
  className,
  isPending = false,
  documents = [],
  isDocumentsLoading = false,
  placeholder = 'Type your message... (Press Shift + Enter for new line)',
  disabled = false,
  initialMessage = '',
  initialSelectedDocuments,
  onSend
}: TChatInputProps) => {
  const [message, setMessage] = useState(initialMessage)
  const [selectedDocuments, setSelectedDocuments] = useState<Pick<TDocument, 'id' | 'title'>[]>(
    initialSelectedDocuments || []
  )
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)

  useEffect(() => {
    if (initialSelectedDocuments) {
      setSelectedDocuments(initialSelectedDocuments)
    }
  }, [initialSelectedDocuments])

  const handleSendMessage = async () => {
    const content = message.trim()
    if (!content && selectedDocuments.length === 0) return

    try {
      await onSend({
        content: content || 'View attached documents',
        documents: selectedDocuments
      })

      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleDocument = (doc: Pick<TDocument, 'id' | 'title'>) => {
    setSelectedDocuments((prev) =>
      prev.some((selectedDoc) => selectedDoc.id === doc.id)
        ? prev.filter((selectedDoc) => selectedDoc.id !== doc.id)
        : [...prev, doc]
    )
  }

  const isDisabled = disabled || isPending
  const canSend = message.trim() || selectedDocuments.length > 0

  return (
    <>
      <DocumentPickerDialog
        open={showDocumentPicker}
        onOpenChange={setShowDocumentPicker}
        documents={documents}
        selectedDocuments={selectedDocuments}
        onToggleDocument={toggleDocument}
      />

      <div
        className={cn('relative w-full overflow-hidden rounded-2xl border bg-background', className)}
        id="chat-input"
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="max-h-32 min-h-20 resize-none border-0 p-3 focus-visible:ring-0 focus-visible:ring-offset-0 sm:max-h-48 sm:min-h-24"
          disabled={isDisabled}
        />

        {selectedDocuments.length > 0 && (
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5">
            <Info className="size-3 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">
              Chat is limited to {selectedDocuments.length} attached document
              {selectedDocuments.length !== 1 ? 's' : ''}.{' '}
              <button
                type="button"
                onClick={() => setSelectedDocuments([])}
                className="font-medium underline underline-offset-2 hover:text-foreground"
                disabled={isDisabled}
              >
                Remove all
              </button>{' '}
              to search all documents.
            </p>
          </div>
        )}

        <div className="flex h-12 items-center divide-x border-t bg-muted/10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocumentPicker(!showDocumentPicker)}
            className="m-2 h-8 shrink-0 gap-2 rounded-bl-xl has-[>svg]:px-4"
            disabled={isDisabled || isDocumentsLoading}
          >
            {isDocumentsLoading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            <span className="text-xs">Attach</span>
          </Button>

          <div className="flex size-full items-center gap-1.5 overflow-x-auto border-x px-2">
            {selectedDocuments.map((doc) => (
              <Tooltip key={doc.id}>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-8 max-w-32 shrink-0 cursor-default items-center gap-1 rounded-md border bg-background px-2 text-muted-foreground text-xs">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleDocument(doc)}
                      className="shrink-0 transition-colors hover:text-destructive"
                      aria-label="Remove document"
                      disabled={isDisabled}
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{doc.title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSendMessage}
                disabled={!canSend || isDisabled}
                size="sm"
                className="m-2 h-8 shrink-0 gap-2 rounded-br-xl has-[>svg]:px-4"
              >
                <span className="text-xs">Send</span>
                <Send className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!canSend ? 'Type a message or attach a document to send' : 'Send message (Enter)'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  )
}
