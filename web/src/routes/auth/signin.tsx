import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import GoogleIcon from '@/assets/google.svg'
import { BorderedLayout } from '@/components/layouts/bordered-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/auth-provider'

type SignInSearch = {
  redirect?: string
}

const SignInPage = () => {
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/signin' }) as SignInSearch
  const { loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      let redirectTo = search.redirect || '/lab/chat/new'

      try {
        const url = new URL(redirectTo, window.location.origin)
        redirectTo = url.pathname + url.search
      } catch {
        // Ignore invalid URLs
      }

      navigate({ to: redirectTo as '/lab/chat/new' })
    }
  }, [isAuthenticated, authLoading, navigate, search.redirect])

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await loginWithGoogle()
    } catch (err: unknown) {
      console.error('Google login failed:', err)
      setError('Failed to start Google login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    toast.info('Feature not available', {
      description: 'Please use Google Sign In instead.'
    })
  }

  return (
    <BorderedLayout title="Sign In" subtitle="Hi, Welcome to Ruggi">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-card-foreground sm:p-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="********" required />
              </div>
              <Button type="submit" className="mt-2 w-full">
                Sign In
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading || authLoading}
            >
              <img src={GoogleIcon} alt="G" className="size-5" aria-hidden="true" />
              Sign In with Google
            </Button>

            {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">{error}</div>}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </BorderedLayout>
  )
}

export const Route = createFileRoute('/auth/signin')({
  component: SignInPage,
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    return {
      redirect: (search.redirect as string) || undefined
    }
  }
})
