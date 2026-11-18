import type { FormEvent } from 'react'
import { giftThemes, type Gift } from './data/gifts'
import type { GiftSuggestionInput } from './lib/coordination'

export type GiftFormValues = {
  name: string
  cost: string
  theme: Gift['theme']
  link: string
  description: string
  image: string
  note: string
  tags: string
}

export const emptyGiftForm: GiftFormValues = {
  name: '',
  cost: '',
  theme: giftThemes[0],
  link: '',
  description: '',
  image: '',
  note: '',
  tags: '',
}

export function giftFormFromGift(gift: Gift): GiftFormValues {
  return {
    name: gift.name,
    cost: String(gift.cost),
    theme: gift.theme,
    link: gift.link,
    description: gift.description,
    image: gift.image,
    note: gift.note,
    tags: gift.tags.join(', '),
  }
}

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function isGiftImage(value: string) {
  return isHttpsUrl(value) || /^\/gifts\/[A-Za-z0-9._-]+$/.test(value)
}

export function readGiftForm(form: GiftFormValues): { gift?: GiftSuggestionInput; error: string } {
  const name = form.name.trim()
  const cost = Number(form.cost)
  const link = form.link.trim()
  const image = form.image.trim()
  const description = form.description.trim()
  const note = form.note.trim()
  const tags = form.tags.split(',').map(tag => tag.trim()).filter(Boolean)

  if (!name || name.length > 120 || !Number.isFinite(cost) || cost <= 0 || cost > 100000) {
    return { error: 'Enter a gift name and a price greater than $0 and no more than $100,000.' }
  }
  if (!description || description.length > 500 || !note || note.length > 500) {
    return { error: 'Add a description and recommendation note, each no longer than 500 characters.' }
  }
  if (tags.length > 8 || tags.some(tag => tag.length > 50) || tags.join('').length > 400) {
    return { error: 'Add up to eight tags, with no tag longer than 50 characters.' }
  }
  if (!isHttpsUrl(link) || (image && !isGiftImage(image))) {
    return { error: 'Use a valid HTTPS retailer link and an HTTPS photo URL or existing /gifts/ image path.' }
  }
  return {
    gift: {
      name,
      cost,
      theme: form.theme,
      link,
      description,
      image,
      note,
      tags,
    },
    error: '',
  }
}

export default function GiftDetailsForm({ form, setForm, error, busy, action, hint, onSubmit }: {
  form: GiftFormValues
  setForm: (form: GiftFormValues) => void
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
      <label>Category<select value={form.theme} onChange={event => setForm({ ...form, theme: giftThemes.find(theme => theme === event.target.value) ?? giftThemes[0] })}>{giftThemes.map(theme => <option key={theme}>{theme}</option>)}</select></label>
      <label>Retailer link<input required type="url" placeholder="https://" value={form.link} onChange={event => setForm({ ...form, link: event.target.value })} /></label>
      <label className="idea-form-wide">Short description<textarea required maxLength={500} rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label className="idea-form-wide">Why do you recommend it?<textarea required maxLength={500} rows={3} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></label>
      <label className="idea-form-wide">Photo URL or existing image path (optional)<input type="text" placeholder="https:// or /gifts/photo.jpg" value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} /></label>
      <label className="idea-form-wide">Tags (comma-separated, optional)<input maxLength={400} placeholder="useful, cozy, outdoors" value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} /></label>
    </div>
    <p className="claim-hint">{hint}</p>
    {error && <p className="coordination-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : action}</button>
  </form>
}
