import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, RotateCw } from 'lucide-react'

import { BorderedLayout } from '@/components/layouts/bordered-layout'
import { Button } from '@/components/ui/button'

type ErrorSearchParams = {
  reason?: string
}

const AuthErrorPage = () => {
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/error' }) as ErrorSearchParams
  const reason = search.reason || 'unknown'

  const getErrorMessage = (errorReason: string): string => {
    const errorMessages: Record<string, string> = {
      no_code: 'We didn’t receive the necessary authorization from Google.',
      token_exchange_failed: 'We couldn’t verify your credentials with Google.',
      no_access_token: 'Google didn’t provide an access token.',
      userinfo_failed: 'We couldn’t retrieve your profile information.',
      no_email: 'Your Google account doesn’t share an email address.',
      access_denied: 'It looks like you canceled the sign-in request.',
      unknown: 'An unexpected error occurred during authentication.'
    }

    return errorMessages[errorReason] || 'An unexpected error occurred.'
  }

  return (
    <BorderedLayout title="Authentication Issue" subtitle="We couldn't sign you in securely.">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/5 ring-1 ring-destructive/20 sm:mb-6 sm:size-20">
            <AlertCircle className="size-8 text-destructive sm:size-10" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg tracking-tight sm:text-xl">Something went wrong</h3>
            <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">{getErrorMessage(reason)}</p>
            <p className="text-muted-foreground text-xs sm:text-sm">Please try signing in again.</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate({ to: '/auth/signin' })} className="flex-1">
            <RotateCw className="size-4" />
            Try Again
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Return Home
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </BorderedLayout>
  )
}

export const Route = createFileRoute('/auth/error')({
  component: AuthErrorPage,
  validateSearch: (search: Record<string, unknown>): ErrorSearchParams => {
    return {
      reason: (search.reason as string) || 'unknown'
    }
  }
})
