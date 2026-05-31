import type { TDocument } from '@/types/models'

export type TChatSseToolStartData = {
  tool_name: string
  message: string
}

export type TChatSseCompleteData = {
  session_id: string
  assistant_message_content: string
  attached_documents?: Pick<TDocument, 'id' | 'title' | 'description'>[]
  tool_usage?: Record<string, unknown> | null
  limit_exceeded?: boolean
}

export type TChatSseErrorData = {
  message: string
}

export type TChatSseHandlers = {
  onChunk?: (content: string) => void
  onToolStart?: (data: TChatSseToolStartData) => void
  onComplete?: (data: TChatSseCompleteData) => void
  onError?: (data: TChatSseErrorData) => void
}

export type TStreamChatMessageArgs = {
  session_id: string
  content: string
  document_ids?: string[]
}
