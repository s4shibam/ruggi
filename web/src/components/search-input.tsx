import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchInputProps = {
  value: string
  onChangeValue: (value: string) => void
  onEnter?: () => void
  className?: string
  inputClassName?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onKeyDown'>

export const SearchInput = ({
  value,
  onChangeValue,
  onEnter,
  className,
  inputClassName,
  ...inputProps
}: SearchInputProps) => (
  <div className={cn('relative', className)}>
    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onEnter?.()
        }
      }}
      className={cn('pl-10 text-sm sm:text-base', inputClassName)}
      {...inputProps}
    />
  </div>
)
