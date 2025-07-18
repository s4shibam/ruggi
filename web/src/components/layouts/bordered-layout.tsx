import { Footer } from '@/components/blocks/footer'
import { Nav } from '@/components/blocks/nav'
import { cn } from '@/lib/utils'

interface BorderedLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export const BorderedLayout = ({ children, title, subtitle, className }: BorderedLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Nav />

      {(title || subtitle) && (
        <div className="w-full border-b">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center border-x py-8 text-center sm:py-10">
            {title && <h1 className="font-bold text-2xl tracking-tight sm:text-3xl md:text-4xl">{title}</h1>}
            {subtitle && <p className="mt-2 text-muted-foreground text-xs sm:text-sm">{subtitle}</p>}
          </div>
        </div>
      )}

      <div
        className={cn(
          'mx-auto flex w-full max-w-4xl grow flex-col items-center justify-center border-x bg-radial-[at_bottom] from-primary/10 to-transparent px-4 py-8 sm:px-6 sm:py-12',
          className
        )}
      >
        {children}
      </div>

      <Footer />
    </div>
  )
}
