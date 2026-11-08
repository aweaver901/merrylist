import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, CircleHelp, Copy, Gift as GiftIcon, Heart, Menu, RotateCcw, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { gifts, themes, type Gift, type GiftTheme } from './data/gifts'

type QuizChoice = 'slow' | 'outside' | 'design' | 'luxury'

const quizLabels: Record<QuizChoice, string> = {
  slow: 'A quiet, cozy morning',
  outside: 'A little adventure outside',
  design: 'Something beautiful and useful',
  luxury: 'A pocket of calm and comfort',
}

const quizTheme: Record<QuizChoice, GiftTheme> = {
  slow: 'Slow mornings',
  outside: 'Outside time',
  design: 'Good design',
  luxury: 'Little luxuries',
}

function App() {
  const [activeTheme, setActiveTheme] = useState<(typeof themes)[number]>('All gifts')
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizChoice, setQuizChoice] = useState<QuizChoice | null>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const recommendation = quizChoice ? gifts.find((gift) => gift.theme === quizTheme[quizChoice]) : undefined

  return (
    <main className="site-shell">
      <div className="grain" />
      <nav className="topbar">
        <a className="wordmark" href="#top" aria-label="Merrylist home">
          <span className="wordmark-star">✳</span> merrylist
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
          <p className="eyebrow"><span /> Austin's Christmas list <span /></p>
          <h1>A few things<br /><em>worth wishing for.</em></h1>
          <p className="hero-intro">A carefully gathered collection of things I’d love to unwrap, use, wear, or wander with. Pick what feels most like me.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#gifts">Explore the list <ArrowUpRight size={17} /></a>
            <button className="text-button" onClick={() => setQuizOpen(true)}><Sparkles size={16} /> Help me choose</button>
          </div>
        </motion.div>
        <motion.div className="hero-art" initial={{ opacity: 0, scale: .94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: .9, delay: .15 }}>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-image-wrap"><img src={gifts[2].image} alt="A quiet campsite by the water" /></div>
          <div className="hero-sticker"><span>6</span> thoughtful<br />possibilities</div>
          <div className="hero-caption"><span>01</span> somewhere between<br />wanting &amp; needing</div>
        </motion.div>
      </section>

      <section className="list-section" id="gifts">
        <div className="section-heading">
          <div><p className="eyebrow left">The good stuff</p><h2>Choose your<br /><em>own adventure.</em></h2></div>
          <p className="section-note">No pressure, no wrong answers.<br />Just things I’d be genuinely happy to see.</p>
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
        <div><p className="eyebrow left">Still deciding?</p><h2>Make it a little<br /><em>more personal.</em></h2></div>
        <p>Answer three tiny questions and I’ll point you toward the gift that feels the most Austin.</p>
        <button className="outline-button" onClick={() => setQuizOpen(true)}>Find my match <ChevronRight size={17} /></button>
      </section>

      <footer><span>Made with hope, lists &amp; a little holiday magic.</span><span className="footer-mark">a / '26</span></footer>

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

function QuizModal({ choice, recommendation, onChoice, onClose, onOpenGift }: { choice: QuizChoice | null; recommendation: Gift | undefined; onChoice: (choice: QuizChoice | null) => void; onClose: () => void; onOpenGift: (gift: Gift) => void }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="quiz-modal" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button>{!recommendation ? <><div className="quiz-icon"><CircleHelp size={25} /></div><p className="eyebrow left">The highly scientific method</p><h2>What kind of gift<br /><em>feels most like you?</em></h2><div className="quiz-options">{(Object.keys(quizLabels) as QuizChoice[]).map((key) => <button key={key} className={choice === key ? 'selected' : ''} onClick={() => onChoice(key)}>{quizLabels[key]}<ChevronRight size={16} /></button>)}</div></> : <><div className="quiz-icon"><Sparkles size={25} /></div><p className="eyebrow left">Your very good match</p><h2>Go with<br /><em>{recommendation.name}.</em></h2><p className="quiz-result">{recommendation.note}</p><button className="primary-button" onClick={() => onOpenGift(recommendation)}>Tell me more <ArrowUpRight size={16} /></button><button className="reset-button" onClick={() => onChoice(null)}><RotateCcw size={14} /> Start over</button></>}</motion.div></motion.div>
}

export default App
