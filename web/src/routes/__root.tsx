import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import { RouterPending } from '@/components/router-pending'
import { ErrorPage } from '@/pages/error'
import { NotFoundPage } from '@/pages/not-found'
import type { TUserWithPersonalization } from '@/types/models'

type TRouterContext = {
  auth: {
    isLoading: boolean
    isAuthenticated: boolean
    user: TUserWithPersonalization | null
  }
}

export const Route = createRootRouteWithContext<TRouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: RouterPending,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage
})
