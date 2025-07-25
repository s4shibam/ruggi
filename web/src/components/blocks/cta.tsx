import {
  BookOpen,
  ChartLine,
  CodeXml,
  FileText,
  FolderOpen,
  Globe,
  Image,
  Lightbulb,
  MessageCircle,
  MessageSquareDot,
  Search,
  SunMedium,
  WandSparkles
} from 'lucide-react'
import { motion } from 'motion/react'

import Logo from '@/assets/logo.svg'

const iconsBase = [
  FileText,
  WandSparkles,
  Globe,
  FolderOpen,
  SunMedium,
  BookOpen,
  Image,
  MessageCircle,
  ChartLine,
  Lightbulb,
  MessageSquareDot,
  Search,
  CodeXml
]

const icons = Array.from({ length: 5 }).flatMap(() => iconsBase)

export const CTA = () => {
  return (
    <section className="relative w-full overflow-hidden border-t" id="cta">
      <div className="relative mx-auto flex max-w-4xl flex-col gap-4 overflow-hidden border-x bg-secondary px-4 py-28">
        <div className="pointer-events-none absolute left-0 z-10 h-full w-20 bg-linear-to-r from-secondary to-transparent" />

        {[...Array.from({ length: 4 })].map((_, rowIdx) => {
          const localIcons = [...icons.slice(rowIdx * 2), ...icons.slice(0, rowIdx * 2)]
          const isReverse = rowIdx % 2 === 1

          return (
            <motion.div
              key={rowIdx}
              className="flex items-center gap-4"
              animate={{
                x: isReverse ? [-200, 0] : [0, -200]
              }}
              transition={{
                duration: 25,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear'
              }}
            >
              {localIcons.map((Icon, idx) => (
                <div
                  key={idx}
                  className="flex aspect-square size-20 shrink-0 items-center justify-center rounded-2xl border border-border/20 bg-border/10 opacity-25"
                >
                  <Icon className="size-6 shrink-0 text-background" />
                </div>
              ))}

              {localIcons.map((Icon, idx) => (
                <div
                  key={`dup-${idx}`}
                  className="flex aspect-square size-20 shrink-0 items-center justify-center rounded-2xl border border-border/20 bg-border/10 opacity-25"
                >
                  <Icon className="size-6 shrink-0 text-background" />
                </div>
              ))}
            </motion.div>
          )
        })}
        <div className="pointer-events-none absolute right-0 z-10 h-full w-20 bg-linear-to-l from-secondary to-transparent" />

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
          <div className="relative">
            <div className="-z-10 absolute inset-0 size-24 rounded-full bg-accent/70 blur-3xl" />
            <motion.img
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.25, 0.4, 0.25, 1] }}
              src={Logo}
              alt="Ruggi"
              className="relative size-28 drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
