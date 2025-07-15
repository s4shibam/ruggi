import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryClient } from '@/lib/tanstack-query'
import type { TPaginationParams } from '@/types/api'
import type { TChatSession, TChatSessionWithMessages, TDocument } from '@/types/models'
import type { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/tanstack-query'

export type TGetAllChatSessionsArgs = TPaginationParams & {
  search?: string
  is_starred?: boolean
}

export type TGetAllChatSessionsResult = TChatSession[]

export const useGetAllChatSessions = (
  args: TGetAllChatSessionsArgs,
  options?: TQueryOpts<TGetAllChatSessionsResult>
) => {
  return useQuery({
    queryKey: ['useGetAllChatSessions', args],
    queryFn: () => {
      return api.get('/chat/session/', {
        params: args
      }) as TApiPromise<TGetAllChatSessionsResult>
    },
    ...options
  })
}

export type TGetChatSessionArgs = {
  chatSessionId: string
}

export type TGetChatSessionResult = TChatSessionWithMessages

export const useGetChatSession = (args: TGetChatSessionArgs, options?: TQueryOpts<TGetChatSessionResult>) => {
  return useQuery({
    queryKey: ['useGetChatSession', args],
    queryFn: () => {
      return api.get(`/chat/session/${args.chatSessionId}/`) as TApiPromise<TGetChatSessionResult>
    },
    enabled: !!args.chatSessionId && args.chatSessionId !== 'new',
    ...options
  })
}

export type TCreateChatMessageArgs = {
  session_id: string
  content: string
  document_ids?: string[]
}

export type TCreateChatMessageResult = {
  session_id: string
  assistant_message_content: string
  attached_documents?: Pick<TDocument, 'id' | 'title'>[]
}

export const useCreateChatMessage = (options?: TMutationOpts<TCreateChatMessageArgs, TCreateChatMessageResult>) => {
  return useMutation({
    mutationKey: ['useCreateChatMessage'],
    mutationFn: (args: TCreateChatMessageArgs) => {
      return api.post('/chat/message/', args) as TApiPromise<TCreateChatMessageResult>
    },
    ...options
  })
}

export type TUpdateChatSessionArgs = {
  chatSessionId: string
  title?: string | null
  is_starred?: boolean
}

export type TUpdateChatSessionResult = TChatSession

export const useUpdateChatSession = (options?: TMutationOpts<TUpdateChatSessionArgs, TUpdateChatSessionResult>) => {
  return useMutation({
    mutationKey: ['useUpdateChatSession'],
    mutationFn: (args: TUpdateChatSessionArgs) => {
      const { chatSessionId, ...payload } = args
      return api.put(`/chat/session/${chatSessionId}/update/`, payload) as TApiPromise<TUpdateChatSessionResult>
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetAllChatSessions'] })
      queryClient.invalidateQueries({ queryKey: ['useGetChatSession', { chatSessionId: data?.[1].chatSessionId }] })

      options?.onSuccess?.(...data)
    }
  })
}

export type TDeleteChatSessionArgs = {
  chatSessionId: string
}

export const useDeleteChatSession = (options?: TMutationOpts<TDeleteChatSessionArgs>) => {
  return useMutation({
    mutationKey: ['useDeleteChatSession'],
    mutationFn: (args: TDeleteChatSessionArgs) => {
      return api.delete(`/chat/session/${args.chatSessionId}/delete/`) as TApiPromise
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetAllChatSessions'] })
      options?.onSuccess?.(...data)
    }
  })
}

export type TGenerateChatTitleArgs = {
  chatSessionId: string
  content: string
}

export type TGenerateChatTitleResult = {
  title: string
}

export const useGenerateChatTitle = (options?: TMutationOpts<TGenerateChatTitleArgs, TGenerateChatTitleResult>) => {
  return useMutation({
    mutationKey: ['useGenerateChatTitle'],
    mutationFn: (args: TGenerateChatTitleArgs) => {
      return api.post(`/chat/session/${args.chatSessionId}/title/`, {
        content: args.content
      }) as TApiPromise<TGenerateChatTitleResult>
    },
    ...options
  })
}
