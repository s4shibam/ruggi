import { FileText, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ACCEPTED_FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB
} from '@/constants/document'
import { useUploadDocument } from '@/hooks/api/document'
import { cn } from '@/lib/utils'

type DocumentUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded?: () => void
}

export const DocumentUploadDialog = ({ open, onOpenChange, onUploaded }: DocumentUploadDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const uploadMutation = useUploadDocument({
    onSuccess: () => {
      setSelectedFile(null)
      onOpenChange(false)
      onUploaded?.()
    }
  })

  const handleFileSelect = (file?: File) => {
    if (!file) return
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (
      !ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]) &&
      !ALLOWED_FILE_EXTENSIONS.includes(`.${fileExtension}` as (typeof ALLOWED_FILE_EXTENSIONS)[number])
    ) {
      toast.error('Only PDF, TXT, MD, and HTML files are supported')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB`)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    await uploadMutation.mutateAsync({ file: selectedFile })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILE_TYPES,
    multiple: false,
    disabled: uploadMutation.isPending,
    onDrop: (acceptedFiles) => handleFileSelect(acceptedFiles[0])
  })

  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      uploadMutation.reset()
    }
  }, [open, uploadMutation.reset])

  const isUploading = uploadMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Drag-and-drop a file, or browse your files to upload a new document.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps({
              className: cn(
                'relative w-full min-h-[320px] cursor-pointer rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isDragActive && 'border-primary bg-primary/5',
                !isDragActive && uploadMutation.isError && 'border-destructive/50 bg-destructive/5',
                !isDragActive && !uploadMutation.isError && 'border-border bg-muted/10'
              )
            })}
          >
            <input {...getInputProps()} className="hidden" />

            <div className="flex min-h-80 flex-col">
              {!selectedFile && !isUploading ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent/20 ring-1 ring-accent/50">
                    <Upload className="size-8 text-primary" />
                  </div>
                  <div className="mb-2 space-y-1">
                    <h3 className="font-semibold text-lg tracking-tight">Upload Document</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Drag and drop your PDF, TXT, MD, or HTML file here, or click to browse
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    PDF, TXT, MD, and HTML files only • Max {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              ) : null}

              {selectedFile && !isUploading ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <FileText className="size-8 text-primary" />
                  </div>
                  <div className="mb-4 w-full max-w-md space-y-2">
                    <div className="flex items-center justify-between gap-2 rounded-md border bg-background py-1 pr-1 pl-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{selectedFile.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedFile(null)
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUpload()
                      }}
                    >
                      <Upload className="size-4" />
                      Upload Document
                    </Button>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {isUploading && (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <Loader2 className="size-8 animate-spin text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg tracking-tight">Processing Document</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Uploading and extracting content...</p>
                  </div>
                </div>
              )}

              {uploadMutation.isError && (
                <div className="px-6 pt-2 pb-4 text-center">
                  <p className="text-destructive text-sm">
                    {uploadMutation.error?.message || 'Failed to upload document. Please try again.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
