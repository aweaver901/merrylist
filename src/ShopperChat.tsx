import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useCoordination } from './Coordination'

const time = (value: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))

export default function ShopperChat() {
  const { session, snapshot, chatMessages, chatLoading, chatBusy, chatError, sendChatMessage, deleteChatMessage } = useCoordination()
  const [draft, setDraft] = useState('')
  const messagesPanel = useRef<HTMLDivElement>(null)
  const followLatestMessage = useRef(true)
  const latestMessageId = chatMessages[chatMessages.length - 1]?.id
  const messageDays = chatMessages.reduce<{ date: string; label: string; messages: typeof chatMessages }[]>((days, message) => {
    const date = new Date(message.createdAt)
    const key = date.toLocaleDateString()
    let label = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (key === today.toLocaleDateString()) label = 'Today'
    else if (key === yesterday.toLocaleDateString()) label = 'Yesterday'
    const currentDay = days[days.length - 1]
    if (currentDay?.date === key) currentDay.messages.push(message)
    else days.push({ date: key, label, messages: [message] })
    return days
  }, [])

  useEffect(() => {
    if (latestMessageId !== undefined && messagesPanel.current && followLatestMessage.current) {
      messagesPanel.current.scrollTop = messagesPanel.current.scrollHeight
    }
  }, [latestMessageId])

  if (!session || snapshot?.role !== 'shopper') return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    followLatestMessage.current = true
    if (await sendChatMessage(draft)) setDraft('')
  }

  const updateScrollPosition = () => {
    const panel = messagesPanel.current
    if (panel) followLatestMessage.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 48
  }

  return <section className="shopper-chat coordination-panel" aria-label="Shopper chat">
    <div className="coordination-heading">
      <div><strong>Shopper chat</strong><p>Only signed-in shoppers can read or post here; the list owner cannot see messages. Messages are kept in dated history until the sender deletes them. Scroll up to read earlier days.</p></div>
    </div>
    <div ref={messagesPanel} className="shopper-chat-messages" role="log" aria-label="Chat messages. Scroll up to read earlier days." aria-live="polite" onScroll={updateScrollPosition}>
      {chatLoading && chatMessages.length === 0 ? <p className="claim-hint">Loading messages…</p> : chatMessages.length === 0 ? <p className="claim-hint">No messages yet. Start the conversation.</p> : messageDays.map(day => <section className="shopper-chat-day" key={day.date}>
        <p className="shopper-chat-day-heading">{day.label}</p>
        {day.messages.map(message => <article className={`shopper-chat-message ${message.mine ? 'is-mine' : ''}`} key={message.id}>
          <div><strong>{message.senderName}</strong><time dateTime={message.createdAt}>{time(message.createdAt)}</time></div>
          <p>{message.message}</p>
          {message.mine && <button className="text-button" type="button" disabled={chatBusy} onClick={() => void deleteChatMessage(message.id)}><Trash2 size={13} /> Delete</button>}
        </article>)}
      </section>)}
    </div>
    {chatError && <p className="coordination-error" role="alert">{chatError}</p>}
    <form className="shopper-chat-form" onSubmit={event => void submit(event)}>
      <label className="visually-hidden" htmlFor="shopper-chat-message">Write a message</label>
      <textarea id="shopper-chat-message" rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message…" required />
      <button className="primary-button" type="submit" disabled={chatBusy || !draft.trim()}>{chatBusy ? 'Sending…' : 'Send'} <Send size={15} /></button>
    </form>
  </section>
}
