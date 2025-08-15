import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/lab/chat/')({
  beforeLoad: async () => {
    throw redirect({ to: '/lab/chat/new' })
  },
  component: () => null
})
