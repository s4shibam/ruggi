import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

import { useGetCurrentUser, useGetGoogleLoginUrl, useLogout } from '@/hooks/api/auth'
import { queryClient } from '@/lib/tanstack-query'
import type { TUserWithPersonalization } from '@/types/models'

type TAuthContextType = {
  isLoading: boolean
  isAuthenticated: boolean
  user: TUserWithPersonalization | null
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

type TAuthProviderProps = {
  children: ReactNode
}

const AuthContext = createContext<TAuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: TAuthProviderProps) => {
  const [user, setUser] = useState<TUserWithPersonalization | null>(null)
  const {
    data: currentUserResponse,
    isLoading: isUserLoading,
    error: currentUserError
  } = useGetCurrentUser(undefined, { retry: false })
  const googleLoginMutation = useGetGoogleLoginUrl()
  const logoutMutation = useLogout({
    onSuccess: () => {
      queryClient.clear()
    }
  })

  useEffect(() => {
    if (currentUserResponse?.data) {
      setUser(currentUserResponse.data)
    } else if (currentUserResponse) {
      setUser(null)
    }
  }, [currentUserResponse])

  useEffect(() => {
    if (currentUserError) {
      setUser(null)
    }
  }, [currentUserError])

  const loginWithGoogle = async () => {
    try {
      const response = await googleLoginMutation.mutateAsync(undefined)
      const authUrl = response.data?.auth_url || ''

      if (!authUrl) {
        throw new Error('Google login URL not available')
      }

      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to start Google login:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync(undefined)
      setUser(null)
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Logout failed:', error)
      setUser(null)
      window.location.href = '/auth/signin'
    } finally {
      queryClient.clear()
    }
  }

  const isLoading = isUserLoading || googleLoginMutation.isPending || logoutMutation.isPending

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
