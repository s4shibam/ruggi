import { FileSearch, Layers, Lock, Sparkles, WandSparkles, Zap } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const FEATURES = [
  {
    icon: WandSparkles,
    title: 'Advanced AI Understanding',
    description: 'Our AI understands context, nuance, and relationships in your documents smartly.'
  },
  {
    icon: FileSearch,
    title: 'Deep Document Analysis',
    description: 'Extract insights from documents, get answers quickly, work efficiently with AI.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast Processing',
    description: 'Upload documents, chat instantly, and enjoy real-time processing for your queries.'
  },
  {
    icon: Layers,
    title: 'Multi-Document Context',
    description: 'Ask questions from several documents at once, connecting ideas with ease.'
  },
  {
    icon: Sparkles,
    title: 'Smart Summaries',
    description: 'AI quickly generates summaries, highlighting key points in every document.'
  },
  {
    icon: Lock,
    title: 'Private by Design',
    description: 'Documents remain confidential, secure, and AI never trains on your data.'
  }
]

export const Features = () => {
  const headingRef = useRef(null)
  const isHeadingInView = useInView(headingRef, { once: true, margin: '-100px' })
  const closingRef = useRef(null)
  const isClosingInView = useInView(closingRef, { once: true, margin: '-100px' })

  return (
    <section className="w-full border-t" id="features">
      <div className="mx-auto max-w-4xl border-x py-20 md:py-28">
        <div ref={headingRef} className="mb-12 text-center md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isHeadingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 font-bold text-3xl tracking-tight md:text-4xl"
          >
            Built for Professionals
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base"
          >
            Every feature designed with one goal: make your work faster, smarter, and more efficient
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-border py-px md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} index={idx} />
          ))}
        </div>

        <div ref={closingRef} className="mt-20 text-center md:mt-28">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base"
          >
            Work smarter and faster with our AI features.
            <br />
            Effortlessly manage all your documents.
          </motion.p>
        </div>
      </div>
    </section>
  )
}

const FeatureCard = ({ feature, index }: { feature: (typeof FEATURES)[0]; index: number }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div
      key={index}
      className="flex cursor-default flex-col gap-2 bg-background from-primary/10 to-transparent p-6 transition-all hover:bg-linear-to-r"
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: -10 }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <feature.icon className="mb-4 size-6 text-foreground" />
      </motion.div>

      <div className="relative">
        <p className="absolute h-6 w-1 -translate-x-6 rounded-r-md bg-primary"></p>
        <motion.h3
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
          transition={{ duration: 0.6, delay: index * 0.08 + 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-2 font-semibold text-base"
        >
          {feature.title}
        </motion.h3>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: index * 0.08 + 0.25, ease: [0.25, 0.4, 0.25, 1] }}
        className="text-muted-foreground text-sm leading-relaxed"
      >
        {feature.description}
      </motion.p>
    </div>
  )
}
