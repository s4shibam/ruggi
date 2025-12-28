import { Link } from '@tanstack/react-router'
import { FileText, Info, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { TDocument } from '@/types/models'

import { Label } from './ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

type TDocumentPickerDialogProps = {
  open: boolean
  documents: TDocument[]
  selectedDocuments: Pick<TDocument, 'id' | 'title'>[]
  onOpenChange: (open: boolean) => void
  onToggleDocument: (doc: Pick<TDocument, 'id' | 'title'>) => void
}

export const DocumentPickerDialog = ({
  open,
  documents,
  selectedDocuments,
  onOpenChange,
  onToggleDocument
}: TDocumentPickerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Attach Documents</span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 shrink-0 cursor-pointer text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-sm space-y-1">
                  <p className="font-medium text-background text-sm">How it works</p>
                  <p className="text-background text-xs">
                    When documents are attached, search will be limited to those specific documents only. To search
                    across all your documents, remove the attachments before sending your message.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
          <DialogDescription>
            Select specific documents to focus your search, or leave empty to search all documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <div className="mb-4 space-y-1">
                <h3 className="font-semibold text-lg tracking-tight">No documents available</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upload documents to use them in your conversations.
                </p>
              </div>

              <Button asChild>
                <Link to="/lab/documents">
                  <Upload className="size-4" />
                  Upload Documents
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm">Available Documents</p>
                  {selectedDocuments.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {selectedDocuments.length} of {documents.length} selected
                    </p>
                  )}
                </div>
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-2">
                    {documents.map((doc) => {
                      const isSelected = selectedDocuments.some((selectedDoc) => selectedDoc.id === doc.id)
                      return (
                        <Label
                          key={doc.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-accent hover:bg-accent/25',
                            isSelected && 'border-primary bg-primary/5'
                          )}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => onToggleDocument(doc)} />

                          <div className="flex flex-1 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-sm">{doc.title}</span>
                          </div>
                        </Label>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  {selectedDocuments.length > 0 ? (
                    <>
                      <p className="font-medium text-foreground text-sm">
                        {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} attached
                      </p>
                      <p className="text-muted-foreground text-xs">Search will be limited to these documents only</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No documents attached - will search all documents</p>
                  )}
                </div>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
