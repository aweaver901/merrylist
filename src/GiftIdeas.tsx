import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import { useCoordination } from './Coordination'
import { giftThemes, type GiftTheme } from './data/gifts'
import GiftImage from './GiftImage'
import type { GiftSuggestion, GiftSuggestionInput } from './lib/coordination'

type FormValues = {
  name: string
  cost: string
  theme: GiftTheme
  link: string
  description: string
  image: string
  note: string
  tags: string
}

const initialForm: FormValues = {
  name: '',
  cost: '',
  theme: giftThemes[0],
  link: '',
  description: '',
  image: '',
  note: '',
  tags: '',
}

export default function GiftIdeas() {
  const { session, snapshot, suggestions, suggestionsLoading, suggestionsBusy, suggestionsError, refreshSuggestions, submitSuggestion, reviewSuggestion, addOwnerGift } = useCoordination()
  const [formOpen, setFormOpen] = useState(false)
  const [ownerFormOpen, setOwnerFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [form, setForm] = useState<FormValues>(initialForm)
  const [ownerForm, setOwnerForm] = useState<FormValues>(initialForm)
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
      setForm(initialForm)
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
      setOwnerForm(initialForm)
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

    {isOwner && ownerFormOpen && <GiftEntryForm
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
      {formOpen && <GiftEntryForm
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

    {(suggestionsError || message) && <p className={suggestionsError ? 'coordination-error' : 'claim-hint'} role={suggestionsError ? 'alert' : 'status'}>{suggestionsError || message}</p>}
  </section>
}

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function readGiftForm(form: FormValues): { gift?: GiftSuggestionInput; error: string } {
  const cost = Number(form.cost)
  const tags = form.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  if (!Number.isFinite(cost) || cost <= 0 || cost > 100000) {
    return { error: 'Enter a price greater than $0 and no more than $100,000.' }
  }
  if (tags.length > 8 || tags.some(tag => tag.length > 50)) {
    return { error: 'Add up to eight tags, with no tag longer than 50 characters.' }
  }
  if (!isHttpsUrl(form.link) || (form.image && !isHttpsUrl(form.image))) {
    return { error: 'Use a valid HTTPS retailer link and, if provided, a valid HTTPS photo URL.' }
  }
  return {
    gift: {
      name: form.name.trim(),
      cost,
      theme: form.theme,
      link: form.link.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      note: form.note.trim(),
      tags,
    },
    error: '',
  }
}

function GiftEntryForm({ form, setForm, error, busy, action, hint, onSubmit }: {
  form: FormValues
  setForm: (form: FormValues) => void
  error: string
  busy: boolean
  action: string
  hint: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <form className="gift-idea-form" onSubmit={onSubmit}>
    <div className="gift-idea-form-grid">
      <label>Gift name<input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>Price (USD)<input required type="number" min="0.01" max="100000" step="0.01" value={form.cost} onChange={event => setForm({ ...form, cost: event.target.value })} /></label>
      <label>Category<select value={form.theme} onChange={event => setForm({ ...form, theme: giftThemes.find(theme => theme === event.target.value) ?? giftThemes[0]})}>{giftThemes.map(theme => <option key={theme}>{theme}</option>)}</select></label>
      <label>Retailer link<input required type="url" placeholder="https://" value={form.link} onChange={event => setForm({ ...form, link: event.target.value })} /></label>
      <label className="idea-form-wide">Short description<textarea required maxLength={500} rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label className="idea-form-wide">Why do you recommend it?<textarea required maxLength={500} rows={3} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></label>
      <label className="idea-form-wide">Photo URL (optional)<input type="url" placeholder="https://" value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} /></label>
      <label className="idea-form-wide">Tags (comma-separated, optional)<input maxLength={400} placeholder="useful, cozy, outdoors" value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} /></label>
    </div>
    <p className="claim-hint">{hint}</p>
    {error && <p className="coordination-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving gift…' : action}</button>
  </form>
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
