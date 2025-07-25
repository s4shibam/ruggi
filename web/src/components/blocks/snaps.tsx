import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

import ChatImage from '@/assets/chat.png'
import DocumentImage from '@/assets/document.png'
import HistoryImage from '@/assets/history.png'
import ProfileImage from '@/assets/profile.png'

const PRODUCT_SNAPS = [
  {
    id: 1,
    title: 'Your Own AI Assistant',
    description: 'Personalized AI support for your every task.',
    image: ProfileImage,
    alt: 'Your Personal AI Assistant'
  },
  {
    id: 2,
    title: 'AI-Powered Chat',
    description: 'Chat with your documents instantly.',
    image: ChatImage,
    alt: 'AI-Powered Chat'
  },
  {
    id: 3,
    title: 'Conversation History',
    description: 'Never lose track of important insights.',
    image: HistoryImage,
    alt: 'Conversation History'
  },
  {
    id: 4,
    title: 'Smart Document Management',
    description: 'Upload, organize, and analyze documents effortlessly.',
    image: DocumentImage,
    alt: 'Smart Document Management'
  }
]

export const Snaps = () => {
  const headingRef = useRef(null)
  const isHeadingInView = useInView(headingRef, { once: true, margin: '-100px' })
  const closingRef = useRef(null)
  const isClosingInView = useInView(closingRef, { once: true, margin: '-100px' })

  return (
    <section className="w-full border-t" id="snaps">
      <div className="mx-auto max-w-4xl border-x py-20 md:py-28">
        <div ref={headingRef} className="mb-12 text-center md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isHeadingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 font-bold text-3xl tracking-tight md:text-4xl"
          >
            All You Need, Nothing Extra
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base"
          >
            Powerful features designed for researchers, lawyers, students, and anyone who works with documents
          </motion.p>
        </div>

        <div className="grid auto-rows-[20rem] grid-cols-1 gap-px bg-border py-px md:grid-cols-2">
          {PRODUCT_SNAPS.map((feature, index) => (
            <SnapCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>

        <div ref={closingRef} className="mt-20 text-center md:mt-28">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base"
          >
            Everything you need to transform how you work with documents.
            <br />
            Start chatting with your PDFs, research papers, and documents today.
          </motion.p>
        </div>
      </div>
    </section>
  )
}

const SnapCard = ({ feature, index }: { feature: (typeof PRODUCT_SNAPS)[0]; index: number }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div key={feature.id} className="relative flex flex-col justify-between overflow-hidden bg-white">
      <div className="p-6 pb-4">
        <motion.h3
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-2 font-semibold text-xl"
        >
          {feature.title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 + 0.15, ease: [0.25, 0.4, 0.25, 1] }}
          className="max-w-sm text-muted-foreground text-sm"
        >
          {feature.description}
        </motion.p>
      </div>

      <div className="relative h-fit w-full">
        <div className="absolute top-0 z-10 h-4 w-full bg-linear-to-b from-white to-transparent" />
        <motion.img
          draggable={false}
          src={feature.image}
          alt={feature.alt}
          className="h-auto w-full object-contain object-bottom-right"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.7, delay: index * 0.1 + 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        />
        <div className="absolute bottom-0 z-10 h-16 w-full bg-linear-to-t from-white to-transparent" />
      </div>
    </div>
  )
}
