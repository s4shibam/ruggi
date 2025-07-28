import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useState } from 'react'

import type { TChatMessage, TDocument } from '@/types/models'

type TIntermediateChatMessage = Pick<TChatMessage, 'session_id' | 'content'> & {
  attached_documents?: Pick<TDocument, 'id' | 'title'>[]
}

type TChatRedirectionContext = {
  intermediateChatMessage: TIntermediateChatMessage | null
  setIntermediateChatMessage: Dispatch<SetStateAction<TIntermediateChatMessage | null>>
}

const ChatRedirectionContext = createContext<TChatRedirectionContext | undefined>(undefined)

export const ChatRedirectionProvider = ({ children }: { children: ReactNode }) => {
  const [intermediateChatMessage, setIntermediateChatMessage] = useState<TIntermediateChatMessage | null>(null)

  return (
    <ChatRedirectionContext.Provider
      value={{
        intermediateChatMessage,
        setIntermediateChatMessage
      }}
    >
      {children}
    </ChatRedirectionContext.Provider>
  )
}

export const useChatRedirection = () => {
  const context = useContext(ChatRedirectionContext)
  if (!context) {
    throw new Error('useChatRedirection must be used within a ChatRedirectionProvider')
  }
  return context
}
