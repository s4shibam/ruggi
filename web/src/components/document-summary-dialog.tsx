import { FileText, Sparkles } from 'lucide-react'
import { Streamdown } from 'streamdown'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TDocument } from '@/types/models'

type DocumentSummaryDialogProps = {
  document: TDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DocumentSummaryDialog = ({ document, open, onOpenChange }: DocumentSummaryDialogProps) => {
  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            <span className="line-clamp-1">{document.title}</span>
          </DialogTitle>
          <DialogDescription>AI-generated document analysis</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {document.source_name && (
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <FileText className="size-3.5" />
                  <span>Original source: {document.source_name}</span>
                </div>
              </div>
            )}

            {document.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Description</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{document.description}</p>
              </div>
            )}

            {document.summary && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Summary</h3>
                <div className="prose prose-sm max-w-none text-sm">
                  <Streamdown>{document.summary}</Streamdown>
                </div>
              </div>
            )}

            {!document.description && !document.summary && (
              <p className="text-center text-muted-foreground text-sm">No analysis available for this document.</p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
