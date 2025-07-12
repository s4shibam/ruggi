import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryClient } from '@/lib/tanstack-query'
import type { TUserWithPersonalization } from '@/types/models'
import type { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/tanstack-query'

export type TGetCurrentUserArgs = undefined
export type TGetCurrentUserResult = TUserWithPersonalization

export const useGetCurrentUser = (args: TGetCurrentUserArgs, options?: TQueryOpts<TGetCurrentUserResult>) => {
  return useQuery({
    queryKey: ['useGetCurrentUser', args],
    queryFn: () => api.get('/user/') as TApiPromise<TGetCurrentUserResult>,
    ...options
  })
}

export type TGetGoogleLoginUrlArgs = undefined
export type TGetGoogleLoginUrlResult = {
  auth_url: string
}

export const useGetGoogleLoginUrl = (options?: TMutationOpts<TGetGoogleLoginUrlArgs, TGetGoogleLoginUrlResult>) => {
  return useMutation({
    mutationKey: ['useGetGoogleLoginUrl'],
    mutationFn: () => api.post('/auth/google/login-url/') as TApiPromise<TGetGoogleLoginUrlResult>,
    ...options
  })
}

export type TLogoutArgs = undefined
export type TLogoutResult = undefined

export const useLogout = (options?: TMutationOpts<TLogoutArgs, TLogoutResult>) => {
  return useMutation({
    mutationKey: ['useLogout'],
    mutationFn: () => api.post('/auth/logout/') as TApiPromise<TLogoutResult>,
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetCurrentUser'] })
      queryClient.invalidateQueries({ queryKey: ['useGetUserProfile'] })
      options?.onSuccess?.(...data)
    }
  })
}
