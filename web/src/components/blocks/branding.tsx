import { Link } from '@tanstack/react-router'

import Logo from '@/assets/logo.svg'
import { env } from '@/constants/env'
import { cn } from '@/lib/utils'

type BrandingProps = {
  className?: string
  logoClassName?: string
  showText?: boolean
  to?: string
}

export const Branding = ({ className, logoClassName, showText = true, to = '/' }: BrandingProps) => {
  return (
    <Link to={to} className={cn('flex items-center gap-1 p-1', className)}>
      <img src={Logo} alt={env.appSlug} className={cn('size-7 shrink-0 sm:size-8.5', logoClassName)} />
      {showText && (
        <p className={cn('truncate font-bold text-lg capitalize transition-all sm:text-xl')}>{env.appSlug}</p>
      )}
    </Link>
  )
}
