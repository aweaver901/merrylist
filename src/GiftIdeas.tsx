import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import { useCoordination } from './Coordination'
import GiftDetailsForm, { emptyGiftForm, readGiftForm, type GiftFormValues } from './GiftDetailsForm'
import GiftImage from './GiftImage'
import type { GiftSuggestion } from './lib/coordination'
import ActionErrorNotice from './ActionErrorNotice'

export default function GiftIdeas() {
  const { session, snapshot, suggestions, suggestionsLoading, suggestionsBusy, suggestionsError, refreshSuggestions, submitSuggestion, reviewSuggestion, addOwnerGift } = useCoordination()
  const [formOpen, setFormOpen] = useState(false)
  const [ownerFormOpen, setOwnerFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [form, setForm] = useState<GiftFormValues>({ ...emptyGiftForm })
  const [ownerForm, setOwnerForm] = useState<GiftFormValues>({ ...emptyGiftForm })
  const [formError, setFormError] = useState('')
  const [ownerFormError, setOwnerFormError] = useState('')
  const [message, setMessage] = useState('')

  if (!session || (snapshot?.role !== 'shopper' && snapshot?.role !== 'owner')) return null

  const isOwner = snapshot.role === 'owner'
  const pending = suggestions.filter(suggestion => suggestion.status === 'pending')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    const result = readGiftForm(form)
    if (!result.gift) {
      setFormError(result.error)
      return
    }
    const success = await submitSuggestion(result.gift)
    if (success) {
      setForm({ ...emptyGiftForm })
      setFormOpen(false)
      setHistoryOpen(true)
      setMessage('Your idea was sent to Austin for review.')
    }
  }

  const addGift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOwnerFormError('')
    setMessage('')
    const result = readGiftForm(ownerForm)
    if (!result.gift) {
      setOwnerFormError(result.error)
      return
    }
    if (await addOwnerGift(result.gift)) {
      setOwnerForm({ ...emptyGiftForm })
      setOwnerFormOpen(false)
      setMessage(`${result.gift.name} was added to the list and quiz.`)
    }
  }

  const review = async (suggestion: GiftSuggestion, status: 'approved' | 'denied') => {
    setMessage('')
    if (await reviewSuggestion(suggestion.id, status)) {
      setMessage(status === 'approved' ? `${suggestion.gift.name} was approved and added to the list.` : `${suggestion.gift.name} was declined.`)
    }
  }

  return <section className="gift-ideas-panel" aria-label="Gift ideas">
    <div className="gift-ideas-heading">
      <div>
        <p className="eyebrow left">{isOwner ? 'A note from your shoppers' : 'Help make the list better'}</p>
        <h3>{isOwner ? 'Gift ideas' : 'Have an idea for Austin?'}</h3>
        <p>{isOwner
          ? pending.length ? `${pending.length} new ${pending.length === 1 ? 'idea is' : 'ideas are'} waiting for your review.` : 'New recommendations will appear here for you to review.'
          : 'Suggest a gift with its details. Austin will review it before it appears on the public list.'}</p>
      </div>
      {isOwner ? <div className="idea-owner-actions">
        <button className="outline-button" onClick={() => { setOwnerFormOpen(open => !open); setOwnerFormError(''); setMessage('') }}>{ownerFormOpen ? 'Close gift form' : 'Add a gift'}</button>
        <span className={`idea-count ${pending.length ? 'has-ideas' : ''}`} role="status">{pending.length} pending</span>
      </div> : <button className="outline-button" onClick={() => { setFormOpen(open => !open); setFormError('') }}>{formOpen ? 'Close form' : 'Suggest a gift'}</button>}
    </div>

    {isOwner && ownerFormOpen && <GiftDetailsForm
      form={ownerForm}
      setForm={value => setOwnerForm(value)}
      error={ownerFormError}
      busy={suggestionsBusy}
      action="Add to list"
      hint="This gift will appear on the public list and in the quiz immediately. Use public HTTPS product and photo links."
      onSubmit={event => void addGift(event)}
    />}

    {isOwner ? <div className="gift-idea-list">
      {suggestionsLoading && <p className="claim-hint">Checking for new gift ideas…</p>}
      {!suggestionsLoading && !suggestionsError && !pending.length && <p className="claim-hint">No gift ideas are waiting right now.</p>}
      {pending.map(suggestion => <SuggestionCard key={suggestion.id} suggestion={suggestion}>
        <div className="idea-actions">
          <button className="primary-button" disabled={suggestionsBusy} onClick={() => void review(suggestion, 'approved')}><Check size={15} /> Approve</button>
          <button className="outline-button" disabled={suggestionsBusy} onClick={() => void review(suggestion, 'denied')}><X size={15} /> Decline</button>
        </div>
      </SuggestionCard>)}
      <button className="text-button idea-refresh" onClick={() => void refreshSuggestions()} disabled={suggestionsLoading}><RefreshCw size={14} /> Refresh ideas</button>
    </div> : <div className="gift-idea-contributor">
      {formOpen && <GiftDetailsForm
        form={form}
        setForm={value => setForm(value)}
        error={formError}
        busy={suggestionsBusy}
        action="Send for review"
        hint="Your suggestion is private until it’s approved. Approved gifts appear on the list and in the quiz. Use public HTTPS product and photo links only."
        onSubmit={event => void submit(event)}
      />}

      <div className="idea-history-heading">
        <button className="text-button" onClick={() => setHistoryOpen(open => !open)} aria-expanded={historyOpen}>
          {historyOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Your suggestions ({suggestions.length})
        </button>
        <button className="text-button" onClick={() => void refreshSuggestions()} disabled={suggestionsLoading}><RefreshCw size={14} /> Refresh</button>
      </div>
      {historyOpen && <div className="gift-idea-list">
        {suggestionsLoading && <p className="claim-hint">Checking your suggestions…</p>}
        {!suggestionsLoading && !suggestionsError && !suggestions.length && <p className="claim-hint">You haven’t sent any gift ideas yet.</p>}
        {suggestions.map(suggestion => <SuggestionCard key={suggestion.id} suggestion={suggestion}>
          <span className={`idea-status idea-status-${suggestion.status}`}>{suggestion.status === 'pending' ? 'Waiting for review' : suggestion.status === 'approved' ? 'Approved' : 'Not added'}</span>
        </SuggestionCard>)}
      </div>}
    </div>}

    {suggestionsError && <ActionErrorNotice key={`gift-ideas:${suggestionsError}`} action="Gift ideas" message={suggestionsError} />}
    {message && <p className="claim-hint" role="status">{message}</p>}
  </section>
}

function SuggestionCard({ suggestion, children }: { suggestion: GiftSuggestion; children: ReactNode }) {
  const { gift } = suggestion
  return <article className="gift-idea-card">
    <div className="idea-image"><GiftImage src={gift.image} alt={gift.name} /></div>
    <div className="idea-details">
      <span className="theme-label">{gift.theme}</span>
      <h4>{gift.name}</h4>
      <p className="idea-description">{gift.description}</p>
      <p className="idea-note">“{gift.note}”</p>
      <div className="idea-meta"><strong>${gift.cost}</strong>{gift.tags.length > 0 && <span>{gift.tags.join(' · ')}</span>}</div>
      <a className="idea-retailer" href={gift.link} target="_blank" rel="noreferrer">Open retailer link ↗</a>
      {children}
    </div>
  </article>
}
