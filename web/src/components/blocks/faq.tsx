import { Link } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'

import { Button } from '../ui/button'

const FAQ_LIST = [
  {
    question: 'How does Ruggi work?',
    answer:
      'Upload your documents (PDFs, TXT, MD, etc.), and our AI processes them to understand the content. Then simply ask questions in natural language, and get accurate answers extracted from your documents.'
  },
  {
    question: 'Is my data secure and private?',
    answer:
      'Absolutely. Your documents are stored securely. We never use your data to train our AI models, and you can delete your documents at any time. Your privacy is our top priority.'
  },
  {
    question: 'What types of documents can I upload?',
    answer:
      'Ruggi supports PDFs, Markdown documents (.md), text files, and more. We process everything from research papers and legal contracts to reports and presentations.'
  },
  {
    question: 'Can I ask questions across multiple documents?',
    answer:
      'Yes! One of Ruggi most powerful features is the ability to query multiple documents simultaneously. This lets you connect insights and find relationships across different sources.'
  },
  {
    question: 'How accurate are the AI responses?',
    answer:
      'Our AI is highly accurate and provides responses based directly on your document content. It includes citations so you can verify information. However, we always recommend reviewing important information yourself.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your Pro subscription at any time. Your access will continue until the end of your billing period, and you can always resubscribe later.'
  }
]

export const FAQs = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const headingRef = useRef(null)
  const isHeadingInView = useInView(headingRef, { once: true, margin: '-100px' })
  const closingRef = useRef(null)
  const isClosingInView = useInView(closingRef, { once: true, margin: '-100px' })

  return (
    <section className="w-full border-t" id="faq">
      <div className="mx-auto max-w-4xl border-x py-20 md:py-28">
        <div ref={headingRef} className="mb-12 text-center md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isHeadingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 font-bold text-3xl tracking-tight md:text-4xl"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base"
          >
            Everything you need to know about Ruggi
          </motion.p>
        </div>

        <div className="flex w-full flex-col gap-px bg-border py-px">
          {FAQ_LIST.map((faq, idx) => (
            <FAQItem
              key={idx}
              faq={faq}
              index={idx}
              isOpen={openIndex === idx}
              onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
            />
          ))}
        </div>

        <div ref={closingRef} className="mt-20 text-center md:mt-28">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base"
          >
            If you have any questions, please don't hesitate to contact us.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild className="mt-4 h-12 rounded-full">
              <Link to="/auth/signin">Get Started</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const FAQItem = ({
  faq,
  index,
  isOpen,
  onToggle
}: {
  faq: (typeof FAQ_LIST)[0]
  index: number
  isOpen: boolean
  onToggle: () => void
}) => {
  return (
    <div key={index} className="overflow-hidden bg-background transition-all duration-300">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[5rem_1fr_5rem] items-center divide-x transition-all hover:bg-input/30"
      >
        <div className="h-full p-4 sm:p-6">{index + 1}.</div>
        <div className="p-4 text-left font-semibold text-sm sm:p-6 sm:text-base">{faq.question}</div>

        <div className="grid place-items-center">
          <motion.div
            animate={{
              backgroundColor: isOpen ? 'rgb(9 9 11)' : 'rgb(244 244 245)',
              scale: isOpen ? 1.1 : 1
            }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full p-2 sm:size-8"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.div
                  key="minus"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Minus className="size-4 text-background" />
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="size-4 text-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="grid grid-cols-[5rem_1fr_5rem] divide-x overflow-hidden"
      >
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -10
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="border-t"
        />
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -10
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="border-t p-4 text-left text-muted-foreground text-xs leading-relaxed sm:p-6 sm:text-sm"
        >
          {faq.answer}
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -10
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="border-t"
        />
      </motion.div>
    </div>
  )
}
