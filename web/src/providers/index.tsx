import type { ReactNode } from 'react'
import { CookiesProvider } from 'react-cookie'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/providers/auth-provider'

import { ChatRedirectionProvider } from './chat-redirection-provider'
import { QueryProvider } from './query-client-provider'

type TProvidersProps = {
  children: ReactNode
}

export const Providers = ({ children }: TProvidersProps) => {
  return (
    <CookiesProvider>
      <QueryProvider>
        <AuthProvider>
          <ChatRedirectionProvider>{children}</ChatRedirectionProvider>
        </AuthProvider>
        <Toaster />
      </QueryProvider>
    </CookiesProvider>
  )
}
