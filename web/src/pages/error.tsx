import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'

import { BorderedLayout } from '@/components/layouts/bordered-layout'
import { Button } from '@/components/ui/button'

export const ErrorPage = ({ error }: { error?: Error }) => {
  const router = useRouter()

  return (
    <BorderedLayout title="Something went wrong" subtitle="We encountered an unexpected error.">
      <div className="flex flex-col items-center space-y-4 text-center sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="rounded-full bg-destructive/10 p-3 sm:p-4"
        >
          <AlertTriangle className="size-10 text-destructive sm:size-12" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          className="max-w-md space-y-2 px-4"
        >
          <p className="text-muted-foreground text-sm sm:text-base">
            {error?.message || 'An unexpected error occurred. Please try again later.'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex w-full flex-col gap-3 px-4 sm:w-auto sm:flex-row sm:gap-4"
        >
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button onClick={() => router.invalidate()}>Try Again</Button>
          <Button asChild variant="secondary">
            <Link to="/">Return Home</Link>
          </Button>
        </motion.div>
      </div>
    </BorderedLayout>
  )
}
