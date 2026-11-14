import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, CircleHelp, Copy, Gift as GiftIcon, Heart, Menu, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { gifts, listContent, quizChoices, themes, type Gift, type QuizChoice } from './data/gifts'

type QuizChoiceId = QuizChoice['id']

const personalize = (text: string) => text.replaceAll('{owner}', listContent.owner)

function App() {
  const [activeTheme, setActiveTheme] = useState<(typeof themes)[number]>('All gifts')
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizChoice, setQuizChoice] = useState<QuizChoiceId | null>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.title = personalize(listContent.pageTitle)
    document.querySelector('meta[name="description"]')?.setAttribute('content', personalize(listContent.metaDescription))
  }, [])

  const visibleGifts = useMemo(
    () => activeTheme === 'All gifts' ? gifts : gifts.filter((gift) => gift.theme === activeTheme),
    [activeTheme],
  )

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((favorite) => favorite !== id) : [...current, id])
  }

  const copyList = async () => {
    await navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  const recommendationTheme = quizChoices.find((choice) => choice.id === quizChoice)?.theme
  const recommendation = recommendationTheme ? gifts.find((gift) => gift.theme === recommendationTheme) : undefined
  const heroGift = gifts.find((gift) => gift.id === listContent.hero.imageGiftId) ?? gifts[0]

  return (
    <main className="site-shell">
      <div className="grain" />
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
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-image-wrap"><img src={heroGift?.image} alt={listContent.hero.imageAlt} /></div>
          <div className="hero-sticker"><span>{gifts.length}</span> {listContent.hero.stickerLabel}</div>
          <div className="hero-caption"><span>01</span> {listContent.hero.captionFirst}<br />{listContent.hero.captionSecond}</div>
        </motion.div>
      </section>

      <section className="list-section" id="gifts">
        <div className="section-heading">
          <div><p className="eyebrow left">{listContent.list.eyebrow}</p><h2>{listContent.list.titleFirst}<br /><em>{listContent.list.titleEmphasis}</em></h2></div>
          <p className="section-note">{listContent.list.noteFirst}<br />{listContent.list.noteSecond}</p>
        </div>
        <div className="theme-tabs" role="tablist" aria-label="Filter by theme">
          {themes.map((theme) => <button key={theme} className={activeTheme === theme ? 'active' : ''} onClick={() => setActiveTheme(theme)}>{theme}</button>)}
        </div>
        <motion.div className="gift-grid" layout>
          <AnimatePresence mode="popLayout">
            {visibleGifts.map((gift, index) => <GiftCard key={gift.id} gift={gift} index={index} isFavorite={favorites.includes(gift.id)} onFavorite={() => toggleFavorite(gift.id)} onOpen={() => setSelectedGift(gift)} />)}
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

      <AnimatePresence>{selectedGift && <GiftModal gift={selectedGift} isFavorite={favorites.includes(selectedGift.id)} onFavorite={() => toggleFavorite(selectedGift.id)} onClose={() => setSelectedGift(null)} />}</AnimatePresence>
      <AnimatePresence>{quizOpen && <QuizModal choice={quizChoice} recommendation={recommendation} onChoice={setQuizChoice} onClose={() => { setQuizOpen(false); setQuizChoice(null) }} onOpenGift={(gift) => { setQuizOpen(false); setQuizChoice(null); setSelectedGift(gift) }} />}</AnimatePresence>
    </main>
  )
}

function GiftCard({ gift, index, isFavorite, onFavorite, onOpen }: { gift: Gift; index: number; isFavorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return <motion.article className="gift-card" layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .95 }} transition={{ duration: .35, delay: index * .06 }}>
    <button className="image-button" onClick={onOpen} aria-label={`View ${gift.name}`}><img src={gift.image} alt="" /><span className="view-pill">View <ArrowUpRight size={14} /></span></button>
    <div className="card-meta"><span className="theme-label">{gift.theme}</span><button className={`heart-button ${isFavorite ? 'hearted' : ''}`} onClick={onFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Save as favorite'}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
    <button className="card-title" onClick={onOpen}>{gift.name}</button>
    <p>{gift.description}</p>
    <div className="card-bottom"><span>${gift.cost}</span><span className="tiny-arrow"><ArrowUpRight size={14} /></span></div>
  </motion.article>
}

function GiftModal({ gift, isFavorite, onFavorite, onClose }: { gift: Gift; isFavorite: boolean; onFavorite: () => void; onClose: () => void }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="gift-modal" initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18 }} onClick={(event) => event.stopPropagation()}>
    <button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="modal-image"><img src={gift.image} alt="" /></div><div className="modal-content"><p className="eyebrow left">{gift.theme}</p><h2>{gift.name}</h2><p className="modal-description">{gift.description}</p><p className="modal-note">“{gift.note}”</p><div className="modal-details"><strong>${gift.cost}</strong><span>{gift.tags.join('  ·  ')}</span></div><div className="modal-actions"><a className="primary-button" href={gift.link} target="_blank" rel="noreferrer">See the gift <ArrowUpRight size={16} /></a><button className={`outline-button ${isFavorite ? 'saved' : ''}`} onClick={onFavorite}>{isFavorite ? <Check size={16} /> : <Heart size={16} />} {isFavorite ? 'Saved for later' : 'This one feels right'}</button></div></div>
  </motion.div></motion.div>
}

function QuizModal({ choice, recommendation, onChoice, onClose, onOpenGift }: { choice: QuizChoiceId | null; recommendation: Gift | undefined; onChoice: (choice: QuizChoiceId | null) => void; onClose: () => void; onOpenGift: (gift: Gift) => void }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="quiz-modal" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button>{!recommendation ? <><div className="quiz-icon"><CircleHelp size={25} /></div><p className="eyebrow left">{listContent.quiz.kicker}</p><h2>{listContent.quiz.titleFirst}<br /><em>{listContent.quiz.titleEmphasis}</em></h2><div className="quiz-options">{quizChoices.map((quizChoice) => <button key={quizChoice.id} className={choice === quizChoice.id ? 'selected' : ''} onClick={() => onChoice(quizChoice.id)}>{quizChoice.label}<ChevronRight size={16} /></button>)}</div></> : <><div className="quiz-icon"><Sparkles size={25} /></div><p className="eyebrow left">{listContent.quiz.resultKicker}</p><h2>Go with<br /><em>{recommendation.name}.</em></h2><p className="quiz-result">{recommendation.note}</p><button className="primary-button" onClick={() => onOpenGift(recommendation)}>Tell me more <ArrowUpRight size={16} /></button><button className="reset-button" onClick={() => onChoice(null)}><RotateCcw size={14} /> Start over</button></>}</motion.div></motion.div>
}

export default App
