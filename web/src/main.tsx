import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'

import { Providers } from './providers'
import { useAuth } from './providers/auth-provider'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: {
    // biome-ignore lint/style/noNonNullAssertion: we'll be passing down the auth state from within a React component
    auth: undefined!
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const AuthAwareApp = () => {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Providers>
      <AuthAwareApp />
    </Providers>
  </StrictMode>
)
