import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryClient } from '@/lib/tanstack-query'
import type { TUserWithPersonalization } from '@/types/models'
import type { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/tanstack-query'

export type TGetUserProfileArgs = undefined

export type TGetUserProfileResult = TUserWithPersonalization

export const useGetUserProfile = (args: TGetUserProfileArgs, options?: TQueryOpts<TGetUserProfileResult>) => {
  return useQuery({
    queryKey: ['useGetUserProfile', args],
    queryFn: () => {
      return api.get('/user/') as TApiPromise<TGetUserProfileResult>
    },
    ...options
  })
}

export type TUpdateUserProfileArgs = {
  full_name?: string
  personalization?: {
    style_preferences?: string | null
    occupation?: string | null
    nick_name?: string | null
  }
}

export type TUpdateUserProfileResult = TUserWithPersonalization

export const useUpdateUserProfile = (options?: TMutationOpts<TUpdateUserProfileArgs, TUpdateUserProfileResult>) => {
  return useMutation({
    mutationKey: ['useUpdateUserProfile'],
    mutationFn: (args: TUpdateUserProfileArgs) => {
      return api.put('/user/update/', args) as TApiPromise<TUpdateUserProfileResult>
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetUserProfile'] })
      options?.onSuccess?.(...data)
    }
  })
}

export type TDeleteUserAccountArgs = undefined

export const useDeleteUserAccount = (options?: TMutationOpts<TDeleteUserAccountArgs>) => {
  return useMutation({
    mutationKey: ['useDeleteUserAccount'],
    mutationFn: () => {
      return api.delete('/user/delete/') as TApiPromise
    },
    ...options
  })
}
