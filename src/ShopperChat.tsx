import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useCoordination } from './Coordination'

const time = (value: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))

export default function ShopperChat() {
  const { session, snapshot, chatMessages, chatLoading, chatBusy, chatError, sendChatMessage, deleteChatMessage } = useCoordination()
  const [draft, setDraft] = useState('')
  const messagesPanel = useRef<HTMLDivElement>(null)
  const latestMessageId = chatMessages[chatMessages.length - 1]?.id

  useEffect(() => {
    if (latestMessageId !== undefined && messagesPanel.current) messagesPanel.current.scrollTop = messagesPanel.current.scrollHeight
  }, [latestMessageId])

  if (!session || snapshot?.role !== 'shopper') return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await sendChatMessage(draft)) setDraft('')
  }

  return <section className="shopper-chat coordination-panel" aria-label="Shopper chat">
    <div className="coordination-heading">
      <div><strong>Shopper chat</strong><p>Only signed-in shoppers can read or post here; the list owner cannot see messages. Your Google profile name is shown, and your messages stay until you delete them.</p></div>
    </div>
    <div ref={messagesPanel} className="shopper-chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
      {chatLoading && chatMessages.length === 0 ? <p className="claim-hint">Loading messages…</p> : chatMessages.length === 0 ? <p className="claim-hint">No messages yet. Start the conversation.</p> : chatMessages.map(message => <article className={`shopper-chat-message ${message.mine ? 'is-mine' : ''}`} key={message.id}>
        <div><strong>{message.senderName}</strong><time dateTime={message.createdAt}>{time(message.createdAt)}</time></div>
        <p>{message.message}</p>
        {message.mine && <button className="text-button" type="button" disabled={chatBusy} onClick={() => void deleteChatMessage(message.id)}><Trash2 size={13} /> Delete</button>}
      </article>)}
    </div>
    {chatError && <p className="coordination-error" role="alert">{chatError}</p>}
    <form className="shopper-chat-form" onSubmit={event => void submit(event)}>
      <label className="visually-hidden" htmlFor="shopper-chat-message">Write a message</label>
      <textarea id="shopper-chat-message" rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message…" required />
      <button className="primary-button" type="submit" disabled={chatBusy || !draft.trim()}>{chatBusy ? 'Sending…' : 'Send'} <Send size={15} /></button>
    </form>
  </section>
}
