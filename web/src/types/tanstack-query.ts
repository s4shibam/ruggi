import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

import type { TError, TSuccess } from './api'

export type TApiPromise<TData = undefined> = Promise<TSuccess<TData>> | Promise<TError>

export type TQueryOpts<TResponse = undefined> = Omit<
  UseQueryOptions<TSuccess<TResponse>, TError>,
  'queryKey' | 'queryFn'
>

export type TMutationOpts<TVariables = void, TResponse = undefined> = Omit<
  UseMutationOptions<TSuccess<TResponse>, TError, TVariables>,
  'mutationKey' | 'mutationFn'
>
