import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { api } from '@/lib/api'
import { queryClient } from '@/lib/tanstack-query'
import type { TPaginationParams } from '@/types/api'
import type { TDocument, TDocumentStatus, TDocumentWithChunks } from '@/types/models'
import type { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/tanstack-query'

export type TGetAllDocumentsArgs = TPaginationParams & {
  status?: TDocumentStatus
  search?: string
}

export type TGetAllDocumentsResult = TDocument[]

export const useGetAllDocuments = (args: TGetAllDocumentsArgs, options?: TQueryOpts<TGetAllDocumentsResult>) => {
  return useQuery({
    queryKey: ['useGetAllDocuments', args],
    queryFn: () => {
      return api.get('/document/', {
        params: args
      }) as TApiPromise<TGetAllDocumentsResult>
    },
    ...options
  })
}

export type TGetDocumentArgs = {
  documentId: string
}

export type TGetDocumentResult = TDocumentWithChunks

export const useGetDocument = (args: TGetDocumentArgs, options?: TQueryOpts<TGetDocumentResult>) => {
  return useQuery({
    queryKey: ['useGetDocument', args],
    queryFn: () => {
      return api.get(`/document/${args.documentId}`) as TApiPromise<TGetDocumentResult>
    },
    enabled: !!args.documentId,
    ...options
  })
}

export type TUploadDocumentArgs = {
  file: File
}

export type TUploadDocumentResult = TDocumentWithChunks
export type TPresignedUploadResult = {
  upload_url: string
  storage_url: string
  key: string
  content_type: string
}

export const useUploadDocument = (options?: TMutationOpts<TUploadDocumentArgs, TUploadDocumentResult>) => {
  return useMutation({
    mutationKey: ['useUploadDocument'],
    mutationFn: async (args: TUploadDocumentArgs) => {
      const { file } = args
      const presignResponse = (await api.post('/document/upload/presign/', {
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size
      })) as Awaited<TApiPromise<TPresignedUploadResult>>

      if (!('data' in presignResponse)) {
        return Promise.reject(presignResponse.message)
      }

      const presignData = presignResponse.data

      if (!presignData?.upload_url || !presignData?.storage_url) {
        return Promise.reject('Failed to get upload URL')
      }

      const uploadResponse = await axios.put(presignData.upload_url, file, {
        headers: {
          'Content-Type': presignData.content_type || file.type || 'application/octet-stream'
        }
      })

      if (uploadResponse.status !== 200) {
        return Promise.reject('Failed to upload file to storage')
      }

      return api.post('/document/upload/complete/', {
        file_name: file.name,
        file_size: file.size,
        storage_url: presignData.storage_url
      }) as TApiPromise<TUploadDocumentResult>
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetAllDocuments'] })
      options?.onSuccess?.(...data)
    }
  })
}

export type TUpdateDocumentArgs = {
  documentId: string
  title?: string
  description?: string | null
}

export type TUpdateDocumentResult = TDocument

export const useUpdateDocument = (options?: TMutationOpts<TUpdateDocumentArgs, TUpdateDocumentResult>) => {
  return useMutation({
    mutationKey: ['useUpdateDocument'],
    mutationFn: (args: TUpdateDocumentArgs) => {
      const { documentId, ...payload } = args

      return api.put(`/document/${documentId}/update/`, payload) as TApiPromise<TUpdateDocumentResult>
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetDocument'] })
      queryClient.invalidateQueries({ queryKey: ['useGetAllDocuments'] })
      options?.onSuccess?.(...data)
    }
  })
}

export type TDeleteDocumentArgs = {
  documentId: string
}

export const useDeleteDocument = (options?: TMutationOpts<TDeleteDocumentArgs>) => {
  return useMutation({
    mutationKey: ['useDeleteDocument'],
    mutationFn: (args: TDeleteDocumentArgs) => {
      return api.delete(`/document/${args.documentId}/delete/`) as TApiPromise
    },
    ...options,
    onSuccess: (...data) => {
      queryClient.invalidateQueries({ queryKey: ['useGetAllDocuments'] })
      options?.onSuccess?.(...data)
    }
  })
}
