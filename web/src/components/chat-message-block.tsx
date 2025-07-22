import type { ComponentProps } from 'react'
import { Streamdown } from 'streamdown'

import { cn } from '@/lib/utils'
import type { TChatMessage } from '@/types/models'

type TChatMessageBlockProps = {
  message: TChatMessage
}

export const ChatMessageBlock = ({ message }: TChatMessageBlockProps) => {
  const { role, content } = message

  const streamdownComponents: ComponentProps<typeof Streamdown>['components'] = {
    em: ({ children, ...props }) => (
      <em className="pr-1" {...props}>
        {children}
      </em>
    ),
    i: ({ children, ...props }) => (
      <i className="pr-1" {...props}>
        {children}
      </i>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-2 ml-4 list-disc space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-2 ml-4 list-decimal space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="pl-1" {...props}>
        {children}
      </li>
    )
  }

  if (!content) return null

  return (
    <div className={cn('flex', role === 'user' ? 'justify-end' : 'justify-start')}>
      <Streamdown
        components={streamdownComponents}
        className={cn(
          'wrap-break-word prose min-w-32 max-w-[80%] rounded-xl text-sm',
          role === 'user' ? 'bg-primary/25 px-4 py-2 text-primary-foreground' : 'text-foreground'
        )}
        shikiTheme={['one-light', 'one-dark-pro']}
      >
        {content}
      </Streamdown>
    </div>
  )
}
