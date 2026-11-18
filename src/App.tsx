import AccountPanel from './AccountPanel'
import { GiftBoughtOverlay, GiftClaimBadge, GiftClaimControls, GiftPurchaseLink, useCoordination } from './Coordination'
import ChristmasRecordPlayer from './ChristmasRecordPlayer'
import GiftIdeas from './GiftIdeas'
import ShopperChat from './ShopperChat'
import GiftDetailsForm, { giftFormFromGift, readGiftForm, type GiftFormValues } from './GiftDetailsForm'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, Copy, Heart, Menu, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { gifts, listContent, themes, type Gift } from './data/gifts'
import { applyGiftOverrides } from './lib/coordination'

import QuizModal from './QuizModal'
import GiftImage from './GiftImage'

const personalize = (text: string) => text.replaceAll('{owner}', listContent.owner)

function App() {
  const { approvedIdeas, favoriteGiftIds, giftOverrides, giftSettingsBusy, giftSettingsError, session, snapshot, stale, setOwnerGiftFavorite, saveGiftDetails } = useCoordination()
  const allGifts = useMemo(() => applyGiftOverrides([...gifts, ...approvedIdeas], giftOverrides), [approvedIdeas, giftOverrides])
  const [activeTheme, setActiveTheme] = useState<(typeof themes)[number]>('All gifts')
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)
  const [quizOpen, setQuizOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [purchaseNotices, setPurchaseNotices] = useState<{ id: string; text: string }[]>([])
  const observedClaims = useRef<{ account: string | null; initialized: boolean; claims: Map<string, { status: string; buyerName: string | null }> }>({ account: null, initialized: false, claims: new Map() })

  useEffect(() => {
    if (!session || snapshot?.role !== 'shopper' || stale) {
      observedClaims.current = { account: session?.user.id ?? null, initialized: false, claims: new Map() }
      return
    }
    const account = session.user.id
    const currentClaims = new Map(snapshot.gifts.map(claim => [claim.giftId, { status: claim.status, buyerName: claim.buyerName }]))
    const previous = observedClaims.current
    if (previous.account === account && previous.initialized) {
      const newNotices = snapshot.gifts.flatMap(claim => {
        const old = previous.claims.get(claim.giftId)
        if (claim.status !== 'bought' || claim.mine || (old?.status === 'bought' && old.buyerName === claim.buyerName)) return []
        const gift = allGifts.find(item => item.id === claim.giftId)
        if (!gift) return []
        return [{ id: `${claim.giftId}-${claim.buyerName ?? 'shopper'}-${Date.now()}`, text: `${gift.name} was just marked bought by ${claim.buyerName ?? 'a shopper'}.` }]
      })
      if (newNotices.length) {
        setPurchaseNotices(current => [...current, ...newNotices].slice(-3))
        window.setTimeout(() => setPurchaseNotices(current => current.filter(notice => !newNotices.some(next => next.id === notice.id))), 8000)
      }
    }
    observedClaims.current = { account, initialized: true, claims: currentClaims }
  }, [allGifts, session, snapshot, stale])

  useEffect(() => {
    document.title = personalize(listContent.pageTitle)
    document.querySelector('meta[name="description"]')?.setAttribute('content', personalize(listContent.metaDescription))
  }, [])

  const visibleGifts = useMemo(
    () => activeTheme === 'All gifts' ? allGifts : allGifts.filter((gift) => gift.theme === activeTheme),
    [activeTheme, allGifts],
  )

  const selectedGiftDetails = selectedGift ? allGifts.find(gift => gift.id === selectedGift.id) ?? selectedGift : null
  const toggleFavorite = (id: string) => {
    void setOwnerGiftFavorite(id, !favoriteGiftIds.includes(id))
  }

  const copyList = async () => {
    await navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  const heroGift = gifts.find((gift) => gift.id === listContent.hero.imageGiftId) ?? gifts[0]

  return (
    <main className="site-shell">
      <div className="grain" />
      {purchaseNotices.length > 0 && <div className="purchase-notifications" role="region" aria-label="Gift purchase updates" aria-live="polite">
        {purchaseNotices.map(notice => <p role="status" key={notice.id}>{notice.text}</p>)}
      </div>}
      <nav className="topbar">
        <a className="wordmark" href="#top" aria-label="Merrylist home">
          <span className="wordmark-star">✳</span> {listContent.brand}
        </a>
        <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          <a href="#gifts" onClick={() => setMenuOpen(false)}>The list</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <button className="share-button" onClick={copyList}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Share list'}
          </button>
        </div>
        <button className="icon-button menu-button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <section className="hero" id="top">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
          <p className="eyebrow"><span /> {personalize(listContent.hero.eyebrow)} <span /></p>
          <h1>{listContent.hero.titleFirst}<br /><em>{listContent.hero.titleEmphasis}</em></h1>
          <p className="hero-intro">{listContent.hero.introduction}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#gifts">Explore the list <ArrowUpRight size={17} /></a>
            <button className="text-button" onClick={() => setQuizOpen(true)}><Sparkles size={16} /> Help me choose</button>
          </div>
        </motion.div>
        <motion.div className="hero-art" initial={{ opacity: 0, scale: .94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: .9, delay: .15 }}>
          <svg className="holiday-sprig" viewBox="0 0 220 130" aria-hidden="true">
            <path className="sprig-stem" d="M12 112C58 96 121 62 208 17" />
            <path className="sprig-leaf" d="M43 98C22 104 13 92 16 77c14-1 26 6 29 18Zm35-20C57 80 50 67 55 53c15 2 25 12 26 23Zm40-22c-20-2-26-16-18-29 15 4 22 15 21 27Zm39-21c-16-7-17-21-5-31 13 7 17 18 10 29Z" />
            <path className="sprig-leaf" d="M58 91c15-17 30-15 38-3-9 12-22 16-36 7Zm40-22c16-16 30-12 36 0-10 11-24 13-37 4Zm39-22c16-14 29-8 33 5-11 9-24 9-36-1Z" />
            <path className="sprig-vein" d="m22 83 21 15m15-42 23 22m20-50 20 25M61 95l34-7m3-19 35-4m3-18 33-5" />
            <circle className="sprig-berry" cx="73" cy="106" r="5" />
            <circle className="sprig-berry" cx="84" cy="108" r="4" />
            <circle className="sprig-berry" cx="78" cy="116" r="4" />
          </svg>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-image-wrap"><GiftImage src={heroGift?.image ?? ''} alt={listContent.hero.imageAlt} eager /></div>
          <div className="hero-sticker"><span>{allGifts.length}</span> {listContent.hero.stickerLabel}</div>
          <div className="hero-caption"><span>01</span> {listContent.hero.captionFirst}<br />{listContent.hero.captionSecond}</div>
        </motion.div>
      </section>

      <section className="list-section" id="gifts">
        <div className="section-heading">
          <div><p className="eyebrow left">{listContent.list.eyebrow}</p><h2>{listContent.list.titleFirst}<br /><em>{listContent.list.titleEmphasis}</em></h2></div>
          <p className="section-note">{listContent.list.noteFirst}<br />{listContent.list.noteSecond}</p>
        </div>
        <AccountPanel />
        <GiftIdeas />
        <ShopperChat />
        {giftSettingsError && <p className="coordination-error" role="alert">{giftSettingsError}</p>}
        <div className="theme-tabs" role="tablist" aria-label="Filter by theme">
          {themes.map((theme) => <button key={theme} className={activeTheme === theme ? 'active' : ''} onClick={() => setActiveTheme(theme)}>{theme}</button>)}
        </div>
        <motion.div className="gift-grid" layout>
          <AnimatePresence mode="popLayout">
            {visibleGifts.map((gift, index) => <GiftCard key={gift.id} gift={gift} index={index} isOwner={snapshot?.role === 'owner'} favoriteBusy={giftSettingsBusy} isFavorite={favoriteGiftIds.includes(gift.id)} onFavorite={() => toggleFavorite(gift.id)} onOpen={() => setSelectedGift(gift)} />)}
          </AnimatePresence>
        </motion.div>
      </section>

      <section className="choose-section" id="how-it-works">
        <div className="choose-star"><Sparkles size={24} /></div>
        <div><p className="eyebrow left">{listContent.choose.eyebrow}</p><h2>{listContent.choose.titleFirst}<br /><em>{listContent.choose.titleEmphasis}</em></h2></div>
        <p>{personalize(listContent.choose.description)}</p>
        <button className="outline-button" onClick={() => setQuizOpen(true)}>Find my match <ChevronRight size={17} /></button>
      </section>

      <footer><span>{listContent.footer}</span><span className="footer-mark">{listContent.footerMark}</span></footer>

      <ChristmasRecordPlayer />
      <AnimatePresence>{selectedGiftDetails && <GiftModal
        key={selectedGiftDetails.id}
        gift={selectedGiftDetails}
        isOwner={snapshot?.role === 'owner'}
        favoriteBusy={giftSettingsBusy}
        isFavorite={favoriteGiftIds.includes(selectedGiftDetails.id)}
        onFavorite={() => toggleFavorite(selectedGiftDetails.id)}
        onSave={saveGiftDetails}
        onClose={() => setSelectedGift(null)}
      />}</AnimatePresence>
      <AnimatePresence>{quizOpen && <QuizModal gifts={allGifts} onClose={() => { setQuizOpen(false) }} onOpenGift={(gift) => { setQuizOpen(false); setSelectedGift(gift) }} />}</AnimatePresence>
    </main>
  )
}

function GiftCard({ gift, index, isOwner, favoriteBusy, isFavorite, onFavorite, onOpen }: { gift: Gift; index: number; isOwner: boolean; favoriteBusy: boolean; isFavorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return <motion.article className="gift-card" layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .95 }} transition={{ duration: .35, delay: index * .06 }}>
    <button className="image-button" onClick={onOpen} aria-label={`View ${gift.name}`}><GiftImage src={gift.image} alt={gift.name} /><GiftBoughtOverlay giftId={gift.id} /><span className="view-pill">View <ArrowUpRight size={14} /></span></button>
    <div className="card-meta"><span className="theme-label">{gift.theme}</span>{isOwner
      ? <button className={`heart-button ${isFavorite ? 'hearted' : ''}`} disabled={favoriteBusy} onClick={onFavorite} aria-label={isFavorite ? `Remove ${gift.name} from favorites` : `Mark ${gift.name} as a favorite`}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button>
      : isFavorite && <span className="owner-favorite-mark"><Heart size={14} fill="currentColor" /> {listContent.owner}’s favorite</span>}</div>
    <GiftClaimBadge giftId={gift.id} />
    <button className="card-title" onClick={onOpen}>{gift.name}</button>
    <p>{gift.description}</p>
    <div className="card-bottom"><span>${gift.cost}</span><span className="tiny-arrow"><ArrowUpRight size={14} /></span></div>
  </motion.article>
}

function GiftModal({ gift, isOwner, favoriteBusy, isFavorite, onFavorite, onSave, onClose }: { gift: Gift; isOwner: boolean; favoriteBusy: boolean; isFavorite: boolean; onFavorite: () => void; onSave: (gift: Gift) => Promise<{ ok: boolean; error?: string }>; onClose: () => void }) {
  const { giftSettingsBusy, giftSettingsError } = useCoordination()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<GiftFormValues>(() => giftFormFromGift(gift))
  const [formError, setFormError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    setForm(giftFormFromGift(gift))
    setEditing(false)
    setFormError('')
    setSavedMessage('')
  }, [gift.id])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSavedMessage('')
    const result = readGiftForm(form)
    if (!result.gift) {
      setFormError(result.error)
      return
    }
    const saved = await onSave({ ...result.gift, id: gift.id })
    if (saved.ok) {
      setEditing(false)
      setSavedMessage('Gift details saved.')
    } else {
      setFormError(saved.error ?? 'The gift was not saved. Check the error and try again.')
    }
  }

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className={`gift-modal ${editing ? 'gift-modal-editing' : ''}`} initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18 }} onClick={event => event.stopPropagation()}>
    <button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="modal-image"><GiftImage src={gift.image} alt={gift.name} /></div><div className="modal-content">
      {editing ? <>
        <p className="eyebrow left">Update the list</p>
        <h2>Edit gift</h2>
        <GiftDetailsForm
          form={form}
          setForm={setForm}
          error={formError || giftSettingsError}
          busy={giftSettingsBusy}
          action="Save changes"
          hint="Changes appear on the list and quiz for everyone. Use HTTPS retailer/photo links or keep the current local gift image."
          onSubmit={event => void save(event)}
        />
        {savedMessage && <p className="claim-hint" role="status">{savedMessage}</p>}
        <button className="text-button" type="button" onClick={() => { setEditing(false); setForm(giftFormFromGift(gift)); setFormError('') }}>Cancel editing</button>
      </> : <>
        <p className="eyebrow left">{gift.theme}</p>
        <h2>{gift.name}</h2>
        {isFavorite && <p className="owner-favorite-callout"><Heart size={15} fill="currentColor" /> {listContent.owner}’s favorite</p>}
        <p className="modal-description">{gift.description}</p>
        <p className="modal-note">“{gift.note}”</p>
        <div className="modal-details"><strong>${gift.cost}</strong><span>{gift.tags.join('  ·  ')}</span></div>
        <div className="modal-actions">
          <GiftPurchaseLink giftId={gift.id} href={gift.link} />
          {isOwner && <button className={`outline-button ${isFavorite ? 'saved' : ''}`} disabled={favoriteBusy} onClick={onFavorite}>{isFavorite ? <Check size={16} /> : <Heart size={16} />} {isFavorite ? 'Remove favorite' : 'Mark as favorite'}</button>}
          {isOwner && <button className="outline-button" onClick={() => { setEditing(true); setFormError('') }}>Edit gift details</button>}
        </div>
        <GiftClaimControls giftId={gift.id} />
      </>}
    </div>
  </motion.div></motion.div>
}

export default App
