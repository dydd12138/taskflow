import apiClient from './client'

export interface Message {
  id: number
  context_type: string
  context_id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls: string | null
  quoted_message_id: number | null
  created_at: string
}

export const conversationsApi = {
  list: async (type: string, id: string): Promise<Message[]> => {
    return (await apiClient.get('/conversations', { params: { type, id } })).data
  },

  clear: async (type: string, id: string): Promise<void> => {
    await apiClient.delete('/conversations', { params: { type, id } })
  },

  chat: async (
    type: string,
    id: string,
    message: string,
    quotedMessageId: number | null,
    signal: AbortSignal,
    onChunk: (chunk: string) => void,
    onToolCalls: (toolCalls: any[]) => void,
    onDone: () => void,
    onError: (msg: string) => void,
  ): Promise<void> => {
    const response = await fetch('/api/conversations/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type, id, message,
        quoted_message_id: quotedMessageId,
      }),
      signal,
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let doneCalled = false
    const safeOnDone = () => { if (!doneCalled) { doneCalled = true; onDone() } }

    const processLine = (line: string) => {
      if (!line.startsWith('data: ')) return
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'text') onChunk(data.content)
        else if (data.type === 'tool_calls') onToolCalls(data.content)
        else if (data.type === 'done') safeOnDone()
        else if (data.type === 'error') { onError(data.content); safeOnDone() }
      } catch { /* skip malformed */ }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) processLine(line)
    }
    // Flush any remaining data in buffer
    if (buf.trim()) processLine(buf.trim())
    // Guarantee onDone is always called so loading is never stuck
    safeOnDone()
  },
}
