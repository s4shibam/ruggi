import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { TUser } from '@/types/models'

type UserAvatarProps = {
  user?: Pick<TUser, 'full_name' | 'email' | 'avatar'> | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl'
}

const getInitials = (name?: string | null, email?: string): string => {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  }
  return (email?.slice(0, 2) || 'U').toUpperCase()
}

export const UserAvatar = ({ user, size = 'md', className }: UserAvatarProps) => {
  const [hasImageError, setHasImageError] = useState(false)
  const initials = getInitials(user?.full_name, user?.email)

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground ring-1 ring-border',
        sizeClasses[size],
        className
      )}
    >
      {user?.avatar && !hasImageError ? (
        <img
          src={user.avatar}
          alt={user.full_name ? `${user.full_name}'s avatar` : 'User avatar'}
          className="size-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className="font-semibold uppercase leading-none">{initials}</span>
      )}
    </div>
  )
}
