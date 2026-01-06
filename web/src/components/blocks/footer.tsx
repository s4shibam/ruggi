import { Info } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { env } from '@/constants/env'
import { useGetStatus } from '@/hooks/api/status'
import { cn } from '@/lib/utils'

export const Footer = () => {
  const { data: status, isLoading } = useGetStatus()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const getStatusConfig = () => {
    if (isLoading || !status) {
      return {
        dot: 'bg-zinc-400',
        text: 'text-zinc-700',
        label: 'Checking Status'
      }
    }

    if (status.data?.status === 'up') {
      return {
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        label: 'Systems Operational'
      }
    }

    return {
      dot: 'bg-amber-500',
      text: 'text-amber-700',
      label: 'Systems Down'
    }
  }

  const config = getStatusConfig()

  return (
    <section ref={ref} className="w-full border-t" id="footer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className="mx-auto flex max-w-4xl items-center justify-between border-x px-4 py-6"
      >
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-muted-foreground text-sm"
        >
          © {new Date().getFullYear()} {env.appSlug}. <span className="whitespace-nowrap">All rights reserved.</span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut'
            }}
            className={cn('size-2 rounded-full', config.dot)}
          />
          <span className={cn('whitespace-nowrap font-medium text-xs', config.text)}>{config.label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex items-center justify-center transition-colors hover:opacity-80',
                    config.text
                  )}
                  aria-label="Server status information"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[280px] text-center"
                sideOffset={5}
              >
                <p className="text-xs leading-relaxed">
                  Hosted on Render's free tier. Initial requests may experience a brief warm-up period of around 60 seconds as the server spins up from idle.
                </p>
              </TooltipContent>
            </Tooltip>
        </motion.div>
      </motion.div>
    </section>
  )
}
