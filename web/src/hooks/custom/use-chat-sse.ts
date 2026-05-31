import { useCallback, useEffect, useRef, useState } from 'react'

import { env } from '@/constants/env'
import type { TChatSseHandlers, TStreamChatMessageArgs } from '@/types/chat'

const parseSseMessage = (rawMessage: string) => {
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of rawMessage.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue

    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  return {
    eventName,
    data: dataLines.join('\n')
  }
}

const parseJson = (value: string) => {
  if (!value) return {}

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

const dispatchEvent = (rawMessage: string, handlers: TChatSseHandlers) => {
  const { eventName, data } = parseSseMessage(rawMessage)
  const parsedData = parseJson(data)

  if (eventName === 'chunk') {
    const content = typeof parsedData.content === 'string' ? parsedData.content : ''
    if (content) handlers.onChunk?.(content)
    return
  }

  if (eventName === 'tool_start') {
    handlers.onToolStart?.({
      tool_name: typeof parsedData.tool_name === 'string' ? parsedData.tool_name : 'tool',
      message: typeof parsedData.message === 'string' ? parsedData.message : 'Using tool...'
    })
    return
  }

  if (eventName === 'complete') {
    const toolUsage = parsedData.tool_usage

    handlers.onComplete?.({
      session_id: String(parsedData.session_id || ''),
      assistant_message_content: String(parsedData.assistant_message_content || ''),
      attached_documents: Array.isArray(parsedData.attached_documents) ? parsedData.attached_documents : undefined,
      tool_usage:
        toolUsage && typeof toolUsage === 'object' && !Array.isArray(toolUsage)
          ? (toolUsage as Record<string, unknown>)
          : undefined,
      limit_exceeded: Boolean(parsedData.limit_exceeded)
    })
    return
  }

  if (eventName === 'error') {
    handlers.onError?.({
      message: typeof parsedData.message === 'string' ? parsedData.message : 'Something went wrong'
    })
  }
}

const parseErrorMessage = (responseText: string) => {
  try {
    const parsed = JSON.parse(responseText) as { message?: string }
    return parsed.message || responseText
  } catch {
    return responseText
  }
}

export const useChatSse = () => {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsStreaming(false)
  }, [])

  const streamChatMessage = useCallback(async (args: TStreamChatMessageArgs, handlers: TChatSseHandlers = {}) => {
    abortControllerRef.current?.abort()

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setIsStreaming(true)

    try {
      const response = await fetch(`${env.apiUrl}/chat/message/stream/`, {
        method: 'POST',
        credentials: 'include',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(args)
      })

      if (!response.ok || !response.body) {
        const responseText = await response.text()
        throw new Error(parseErrorMessage(responseText) || 'Failed to stream chat response')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split(/\r?\n\r?\n/)
        buffer = messages.pop() || ''

        for (const message of messages) {
          dispatchEvent(message, handlers)
        }
      }

      buffer += decoder.decode()

      if (buffer.trim()) {
        dispatchEvent(buffer, handlers)
      }
    } catch (error) {
      if (abortController.signal.aborted) return

      const message = error instanceof Error ? error.message : 'Failed to stream chat response'
      handlers.onError?.({ message })
      throw error
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
      setIsStreaming(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    isStreaming,
    streamChatMessage,
    cancelStream
  }
}
