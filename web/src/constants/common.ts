import type { TDocumentStatus } from '@/types/models'

export const DOCUMENT_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

export const DOCUMENT_STATUS_VALUES: TDocumentStatus[] = Object.values(DOCUMENT_STATUS)

export const DOCUMENT_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: DOCUMENT_STATUS.COMPLETED, label: 'Completed' },
  { value: DOCUMENT_STATUS.PROCESSING, label: 'Processing' },
  { value: DOCUMENT_STATUS.QUEUED, label: 'Queued' },
  { value: DOCUMENT_STATUS.FAILED, label: 'Failed' }
] as const

export const COOKIE_KEYS = {
  NEW_CHAT_MESSAGE: 'new-chat-message',
  NEW_CHAT_DOCUMENTS: 'new-chat-documents'
} as const
