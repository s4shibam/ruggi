import { Loader2 } from 'lucide-react'

export const RouterPending = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="mb-3 size-8 animate-spin text-primary" aria-label="Loading" />
      <span className="text-muted-foreground text-sm">Loading...</span>
    </div>
  )
}
