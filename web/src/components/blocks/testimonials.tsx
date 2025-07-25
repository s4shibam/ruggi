import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const testimonials = [
  {
    name: 'Marcus Thompson',
    role: 'Corporate Lawyer',
    content:
      'As a lawyer dealing with hundreds of pages of contracts daily, Ruggi is a game-changer. It finds relevant clauses instantly and helps me identify potential issues.'
  },
  {
    name: 'Dr. Aisha Roy',
    role: 'Clinical Psychologist',
    content:
      'Keeping up with the latest research is crucial in my field. Ruggi helps me stay current by quickly extracting key findings from new publications, allowing me to focus more on my patients.'
  },
  {
    name: 'Sarah Chen',
    role: 'Medical Researcher',
    content: 'Incredible tool! Saves me so much time daily.'
  },
  {
    name: 'Tom Bradford',
    role: 'Patent Attorney',
    content:
      'Patent documents are notoriously complex and filled with technical jargon that can be difficult to parse quickly. Ruggi helps me navigate them efficiently and compare multiple patents side-by-side, highlighting the key differences and potential infringements. It has become an absolutely essential part of my daily practice.'
  },
  {
    name: 'James Park',
    role: 'Financial Analyst',
    content: 'Ruggi is fast and precise. Makes my work much easier.'
  },
  {
    name: 'Sarah Jenkins',
    role: 'Content Strategist',
    content:
      "Ruggi has transformed how I review research papers. I can query hundreds of studies simultaneously and get precise answers with citations. It's cut my literature review time by 70%."
  },
  {
    name: 'Prof. Emily Rodriguez',
    role: 'University Professor',
    content:
      "I use Ruggi to prepare lectures and answer student questions. It's like having a research assistant available 24/7. The summaries are worth the subscription."
  },
  {
    name: 'David Wilson',
    role: 'Investment Banker',
    content:
      'In the fast-paced world of financial services, being able to quickly digest and synthesize information from multiple sources is a competitive advantage. Ruggi provides that edge by allowing our team to upload vast amounts of data and query it in plain English. The time saved on manual data extraction alone has paid for the tool many times over, and the quality of our insights has significantly improved.'
  }
]

export const Testimonials = () => {
  const headingRef = useRef(null)
  const isHeadingInView = useInView(headingRef, { once: true, margin: '-100px' })
  const closingRef = useRef(null)
  const isClosingInView = useInView(closingRef, { once: true, margin: '-100px' })

  return (
    <section className="w-full border-t" id="testimonials">
      <div className="mx-auto max-w-4xl border-x py-20 md:py-28">
        <div ref={headingRef} className="mb-12 text-center md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isHeadingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-4 font-bold text-3xl tracking-tight md:text-4xl"
          >
            Trusted by Professionals
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isHeadingInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base"
          >
            See what people who work with documents every day are saying about Ruggi
          </motion.p>
        </div>

        <div className="relative columns-1 gap-0 border-y sm:columns-2 md:columns-3">
          <div className="absolute top-0 z-10 h-32 w-full bg-linear-to-b from-background to-transparent" />
          <div className="absolute bottom-0 z-10 h-32 w-full bg-linear-to-t from-background to-transparent" />
          {testimonials.map((testimonial, idx) => (
            <TestimonialCard key={idx} testimonial={testimonial} index={idx} />
          ))}
        </div>

        <div ref={closingRef} className="mt-20 text-center md:mt-28">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isClosingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base"
          >
            Ruggi is trusted by professionals who work with documents every day.
            <br />
            Start using it today and see for yourself.
          </motion.p>
        </div>
      </div>
    </section>
  )
}

const TestimonialCard = ({ testimonial, index }: { testimonial: (typeof testimonials)[0]; index: number }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <div className="break-inside-avoid bg-background px-6 py-8 transition-all duration-300 hover:bg-muted/25">
      <motion.p
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
        className="mb-6 flex-1 text-muted-foreground text-sm leading-relaxed"
      >
        {testimonial.content}
      </motion.p>
      <div className="flex items-center gap-3">
        <img
          src={`https://api.dicebear.com/9.x/notionists/svg?seed=${testimonial.name}`}
          alt={testimonial.name}
          className="size-10 shrink-0 rounded-full bg-muted"
        />
        <div>
          <div className="font-semibold text-sm">{testimonial.name}</div>
          <div className="text-muted-foreground text-xs">{testimonial.role}</div>
        </div>
      </div>
    </div>
  )
}
