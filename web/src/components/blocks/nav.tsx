import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'

import { Branding } from '@/components/blocks/branding'

import { Button } from '../ui/button'

export const Nav = () => {
  return (
    <div className="h-16 w-full border-b">
      <div className="mx-auto flex size-full max-w-4xl items-center justify-between border-x px-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <Branding />
        </motion.div>
        <div className="flex items-center gap-3 pr-2 text-sm sm:gap-6">
          <motion.a
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            href="#features"
            className="hidden font-medium text-foreground transition-colors hover:text-muted-foreground sm:block"
          >
            Features
          </motion.a>
          <motion.a
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            href="#pricing"
            className="hidden font-medium text-foreground transition-colors hover:text-muted-foreground sm:block"
          >
            Pricing
          </motion.a>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild className="rounded-full" variant="secondary">
              <Link to="/auth/signin">Sign In</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
