import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/lab/')({
  beforeLoad: () => {
    throw redirect({
      to: '/lab/chat/new'
    })
  },
  component: () => null
})
