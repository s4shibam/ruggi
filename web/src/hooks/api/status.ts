import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { TApiPromise, TQueryOpts } from '@/types/tanstack-query'

export type TGetStatusArgs = undefined

export type TGetStatusResult = {
  status: 'up' | 'down'
  checks: {
    database: boolean
  }
}

export const useGetStatus = (args?: TGetStatusArgs, options?: TQueryOpts<TGetStatusResult>) => {
  return useQuery({
    queryKey: ['useGetStatus', args],
    queryFn: () => {
      return api.get('/status/') as TApiPromise<TGetStatusResult>
    },
    ...options
  })
}
