import GiftImage from './GiftImage'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ChevronRight, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { listContent, quizQuestions, type Gift } from './data/gifts'
import { excludeBoughtGifts, matchGifts } from './data/quiz'
import { useCoordination } from './Coordination'

const personalize = (text: string) => text.replaceAll('{owner}', listContent.owner)
const price = (cost: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cost)

export default function QuizModal({ gifts, onClose, onOpenGift }: { gifts: Gift[]; onClose: () => void; onOpenGift: (gift: Gift) => void }) {
  const [answers, setAnswers] = useState<string[]>([])
  const [step, setStep] = useState(0)
  const [resultIndex, setResultIndex] = useState(0)
  const dialog = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const reducedMotion = useReducedMotion()
  const { snapshot } = useCoordination()
  const complete = step === quizQuestions.length
  const question = quizQuestions[step]
  const quizGifts = snapshot?.role === 'shopper' ? excludeBoughtGifts(gifts, snapshot.gifts) : gifts
  const matches = complete ? matchGifts(answers, quizGifts) : []
  const safeResultIndex = matches.length ? resultIndex % matches.length : 0
  const match = matches[safeResultIndex]

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]') ?? [])
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previousFocus?.focus() }
  }, [])

  useEffect(() => { heading.current?.focus() }, [step, resultIndex])

  const choose = (id: string) => { setAnswers(current => [...current.slice(0, step), id]); setResultIndex(0); setStep(step + 1) }
  const restart = () => { setAnswers([]); setStep(0); setResultIndex(0) }

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div ref={dialog} className="quiz-modal interactive-quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title" initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} onClick={event => event.stopPropagation()}>
      <button className="close-button" onClick={onClose} aria-label="Close gift quiz"><X size={19} /></button>
      <p className="eyebrow left">{complete ? 'Your holiday shortlist' : `Question ${step + 1} of ${quizQuestions.length}`}</p>
      <div className="quiz-progress" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={quizQuestions.length} aria-valuenow={step}>
        {quizQuestions.map((_, index) => <span key={index} className={index < step ? 'done' : index === step ? 'current' : ''} />)}
      </div>
      <AnimatePresence initial={false}>
        <motion.div key={complete ? `result-${resultIndex}` : step} initial={{ opacity: 0, x: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
          {!complete ? <>
            <h2 id="quiz-title" ref={heading} tabIndex={-1}>{question.title}</h2>
            <p className="quiz-subtitle">{personalize(question.subtitle)}</p>
            <div className="quiz-options">{question.options.map(option => <button key={option.id} onClick={() => choose(option.id)} aria-pressed={answers[step] === option.id}>
              <span className="quiz-emoji" aria-hidden="true">{option.emoji}</span><span className="quiz-option-copy"><strong>{option.label}</strong><small>{option.detail}</small></span><ChevronRight size={17} aria-hidden="true" />
            </button>)}</div>
          </> : match ? <>
            <div className="quiz-match-label"><Sparkles size={16} /> {safeResultIndex === 0 ? 'Your best match' : `Another great option · ${safeResultIndex + 1} of ${matches.length}`}</div>
            <h2 id="quiz-title" ref={heading} tabIndex={-1}>{match.gift.name}</h2>
            <div className="quiz-result-card"><GiftImage src={match.gift.image} alt={match.gift.name} eager /><div><span className="theme-label">{match.gift.theme}</span><strong>{price(match.gift.cost)}</strong><p>{match.gift.description}</p></div></div>
            <ul className="quiz-reasons"><li>{answers[0] === 'any' ? 'Picked from the full wish list.' : 'Within your selected budget.'}</li>{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
            {match.reasons.length === 0 && <p className="quiz-subtitle">Your style picks are a little outside this budget. Here’s an affordable idea from {listContent.owner}’s list.</p>}
            <button className="primary-button" onClick={() => onOpenGift(match.gift)}>See gift details <ArrowUpRight size={16} /></button>
            {matches.length > 1 && <button className="quiz-alternative text-button" onClick={() => setResultIndex((safeResultIndex + 1) % matches.length)}>Show me another idea <ChevronRight size={16} /></button>}
          </> : <><h2 id="quiz-title" ref={heading} tabIndex={-1}>The elves came up empty.</h2><p className="quiz-subtitle">No available gifts fit this budget right now. Go back to try a different amount.</p></>}
        </motion.div>
      </AnimatePresence>
      <div className="quiz-footer">{step > 0 && <button className="text-button" onClick={() => { setStep(step - 1); setResultIndex(0) }}>{complete ? 'Edit answers' : 'Back'}</button>}<span>{complete ? 'Chosen from the actual wish list' : 'Three little choices. One thoughtful gift.'}</span>{step > 0 && <button className="quiz-restart" onClick={restart} aria-label="Restart quiz"><RotateCcw size={16} /></button>}</div>
    </motion.div>
  </motion.div>
}
