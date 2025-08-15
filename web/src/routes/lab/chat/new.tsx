import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ChatInput, type TChatInputProps } from '@/components/chat-input'
import { DOCUMENT_STATUS } from '@/constants/common'
import { useGetAllDocuments } from '@/hooks/api/document'
import { getTimeBasedGreeting } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useChatRedirection } from '@/providers/chat-redirection-provider'

const NewChatPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { setIntermediateChatMessage } = useChatRedirection()

  const { data: documentsData, isLoading: isDocumentsLoading } = useGetAllDocuments({
    status: DOCUMENT_STATUS.COMPLETED
  })

  const documents = documentsData?.data || []
  const displayName = user?.personalization?.nick_name ?? user?.full_name?.split(' ')[0] ?? 'there'
  const greeting = `${getTimeBasedGreeting()}, ${displayName}!`

  const handleSendMessage = async ({ content, documents }: Parameters<TChatInputProps['onSend']>[0]) => {
    const newSessionId = crypto.randomUUID()

    setIntermediateChatMessage({
      session_id: newSessionId,
      content,
      attached_documents: documents?.map((doc) => ({ id: doc.id, title: doc.title }))
    })

    navigate({
      to: '/lab/chat/$chatSessionId',
      params: { chatSessionId: newSessionId }
    })
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-1 flex-col items-center justify-center p-4 md:p-6">
      <div className="mb-10 text-center">
        <h2 className="bg-linear-to-r from-primary via-secondary to-secondary bg-clip-text font-bold text-3xl text-transparent">
          {greeting}
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">Ask questions or attach documents to get started.</p>
      </div>

      <ChatInput onSend={handleSendMessage} documents={documents} isDocumentsLoading={isDocumentsLoading} />
    </div>
  )
}

export const Route = createFileRoute('/lab/chat/new')({
  component: NewChatPage
})
