import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'

import { BorderedLayout } from '@/components/layouts/bordered-layout'
import { Button } from '@/components/ui/button'

export const NotFoundPage = () => {
  return (
    <BorderedLayout title="Not Found" subtitle="The page you are looking for does not exist.">
      <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border sm:mb-6 sm:size-20"
          >
            <AlertCircle className="size-8 text-muted-foreground sm:size-10" />
          </motion.div>

          <div className="space-y-2">
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
              className="font-semibold text-lg tracking-tight sm:text-xl"
            >
              Page not found
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-muted-foreground text-xs leading-relaxed sm:text-sm"
            >
              It seems you've stumbled upon a page that doesn't exist <br className="hidden sm:block" />
              or has been moved.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="w-full px-4 sm:w-1/2 sm:px-0"
        >
          <Button asChild className="w-full">
            <Link to="/">
              Return Home
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </BorderedLayout>
  )
}
