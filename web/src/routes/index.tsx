import { createFileRoute, redirect } from '@tanstack/react-router'

import { CTA } from '@/components/blocks/cta'
import { FAQs } from '@/components/blocks/faq'
import { Features } from '@/components/blocks/features'
import { Footer } from '@/components/blocks/footer'
import { Hero } from '@/components/blocks/hero'
import { Pricing } from '@/components/blocks/pricing'
import { Snaps } from '@/components/blocks/snaps'
import { Testimonials } from '@/components/blocks/testimonials'
import { LenisProvider } from '@/providers/lenis-provider'

const Index = () => {
  return (
    <LenisProvider>
      <Hero />
      <Snaps />
      <Features />
      <CTA />
      <Pricing />
      <Testimonials />
      <FAQs />
      <Footer />
    </LenisProvider>
  )
}

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return
    }

    if (context.auth.isAuthenticated && context.auth.user) {
      throw redirect({ to: '/lab/chat/new' })
    }
  },
  component: Index
})
