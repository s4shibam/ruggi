import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PRICING_PLANS = [
  {
    name: 'Free',
    description: 'Perfect for trying out Ruggi',
    monthlyPrice: 0,
    yearlyPrice: 0,
    buttonVariant: 'subtle',
    buttonText: 'Get Started Free',
    features: ['10 documents', '50 chat messages', 'Basic AI responses']
  },
  {
    name: 'Pro',
    description: 'For professionals who need more',
    monthlyPrice: 10,
    yearlyPrice: 9,
    buttonVariant: 'default',
    buttonText: 'Get Started',
    features: ['75 documents per month', '750 chat messages per month', 'Advanced AI responses'],
    popular: true
  }
]

export const Pricing = () => {
  const [isYearly, setIsYearly] = useState(true)
  const headingRef = useRef(null)
  const isHeadingInView = useInView(headingRef, { once: true, margin: '-100px' })
  const closingRef = useRef(null)
  const isClosingInView = useInView(closingRef, { once: true, margin: '-100px' })

  return (
    <section className="w-full border-t" id="pricing">
      <div className="mx-auto max-w-4xl border-x py-20 md:py-28">
        <div ref={headingRef} className="mb-12 text-center md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isHeadingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 font-bold text-3xl tracking-tight md:text-4xl"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto mb-8 max-w-xl text-base text-muted-foreground"
          >
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative inline-flex items-center gap-3 rounded-full border bg-muted p-1"
          >
            <motion.div
              className="absolute inset-y-1 rounded-full bg-foreground"
              initial={false}
              animate={{
                left: isYearly ? 'calc(50% + 6px)' : '4px'
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30
              }}
              style={{
                width: 'calc(50% - 10px)'
              }}
            />
            <motion.button
              type="button"
              onClick={() => setIsYearly(false)}
              className={cn(
                'relative z-10 rounded-full px-6 py-2 font-medium text-sm transition-colors',
                !isYearly ? 'text-background' : 'text-muted-foreground hover:text-foreground'
              )}
              whileTap={{ scale: 0.95 }}
            >
              Monthly
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setIsYearly(true)}
              className={cn(
                'relative z-10 rounded-full px-6 py-2 font-medium text-sm transition-colors',
                isYearly ? 'text-background' : 'text-muted-foreground hover:text-foreground'
              )}
              whileTap={{ scale: 0.95 }}
            >
              Yearly
            </motion.button>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-border py-px md:grid-cols-2">
          {PRICING_PLANS.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} isYearly={isYearly} />
          ))}
        </div>

        <div ref={closingRef} className="mt-20 text-center md:mt-28">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base"
          >
            Upgrade, downgrade, or cancel your plan anytime.
            <br />
            Enjoy full control and transparent pricing.
          </motion.p>
        </div>
      </div>
    </section>
  )
}

const PricingCard = ({
  plan,
  index,
  isYearly
}: {
  plan: (typeof PRICING_PLANS)[0]
  index: number
  isYearly: boolean
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div
      key={plan.name}
      className={cn(
        'relative flex flex-col gap-4 bg-white pt-8',
        plan.popular && 'bg-radial-[at_top] from-accent/50 to-white'
      )}
    >
      <div className="mb-6 px-8">
        <motion.h3
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-2 font-bold text-2xl"
        >
          {plan.name}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 + 0.15, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-muted-foreground text-sm"
        >
          {plan.description}
        </motion.p>
      </div>

      <div className="mb-6 px-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={isYearly ? 'yearly' : 'monthly'}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="font-bold text-5xl"
          >
            ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
            <span className="font-normal text-base text-muted-foreground">/month</span>
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="space-y-3 px-8">
        {plan.features.map((feature, idx) => (
          <motion.div
            key={idx}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 + idx * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <Check className="mt-0.5 size-5 shrink-0 text-foreground" />
            <span className="text-sm">{feature}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto">
        <Button
          asChild
          variant={plan.buttonVariant as ButtonProps['variant']}
          className="mt-8 h-14 w-full rounded-none border-0 border-t"
        >
          <Link to="/auth/signin">{plan.buttonText}</Link>
        </Button>
      </div>
    </div>
  )
}
