export type TUser = {
  id: string
  email: string
  full_name: string
  avatar: string | null
  created_at?: string
  updated_at?: string
  personalization?: TUserPersonalization | null
}

export type TUserPersonalization = {
  id?: string
  user_id?: string
  style_preferences: string | null
  occupation: string | null
  nick_name: string | null
  created_at?: string
  updated_at?: string
}

export type TDocumentStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type TDocumentSource = 'upload' | 'url' | 'internal'

export type TDocument = {
  id: string
  owner_id?: string
  title: string
  source: TDocumentSource
  source_name: string | null
  description: string | null
  storage_url: string | null
  document_type: string | null
  size_kb: number | null
  status: TDocumentStatus
  summary?: string | null
  chunk_count?: number
  created_at?: string
  updated_at?: string
}

export type TDocumentChunk = {
  id: string
  document_id?: string
  order: number
  text: string
  embedding?: number[]
  created_at?: string
  updated_at?: string
}

export type TChatSession = {
  id: string
  user_id?: string
  title: string | null
  is_starred: boolean
  attached_documents?: Pick<TDocument, 'id' | 'title' | 'description'>[]
  message_count?: number
  created_at?: string
  updated_at?: string
  last_message_at?: string | null
}

export type TChatMessageRole = 'user' | 'assistant'

export type TChatMessage = {
  id: string
  session_id?: string
  role: TChatMessageRole
  content: string
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type TUserWithPersonalization = TUser & {
  personalization?: TUserPersonalization
}

export type TDocumentWithChunks = TDocument & {
  chunks?: TDocumentChunk[]
}

export type TChatSessionWithMessages = TChatSession & {
  messages?: TChatMessage[]
}

export type TCreateDocumentRequest = {
  title: string
  source: TDocumentSource
  source_name?: string
}

export type TCreateChatSessionRequest = {
  title?: string
}

export type TSendMessageRequest = {
  session_id: string
  content: string
  document_ids?: string[]
}

export type TSendMessageResponse = {
  user_message: TChatMessage
  assistant_message: TChatMessage
  retrieved_chunks?: string[]
}
