import { gifts, quizQuestions } from './gifts'

export function matchGifts(answers: string[]) {
  const options = quizQuestions.map((question, index) => question.options.find(option => option.id === answers[index]))
  const budget = options[0]?.maxCost ?? Infinity
  return gifts.filter(gift => gift.cost <= budget).map(gift => {
    const reasons = options.slice(1).flatMap((option, index) => option?.themes?.includes(gift.theme)
      ? [index === 0 ? `Fits your “${option.label.toLowerCase()}” gifting style.` : `Made for “${option.label.toLowerCase()}.”`] : [])
    return { gift, reasons, score: reasons.length }
  }).sort((a, b) => b.score - a.score || a.gift.cost - b.gift.cost || a.gift.id.localeCompare(b.gift.id))
}
