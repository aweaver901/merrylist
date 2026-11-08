export type GiftTheme = 'Slow mornings' | 'Good design' | 'Outside time' | 'Little luxuries'

export type Gift = {
  id: string
  name: string
  cost: number
  theme: GiftTheme
  link: string
  description: string
  image: string
  note: string
  tags: string[]
}

// Add or edit gifts here. The rest of the app reads this list automatically.
export const gifts: Gift[] = [
  {
    id: 'coffee-set',
    name: 'Fellow Stagg EKG',
    cost: 185,
    theme: 'Slow mornings',
    link: 'https://fellowproducts.com/products/stagg-ekg-electric-kettle',
    description: 'A beautifully precise kettle for the ritual of making coffee slowly and properly.',
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=85',
    note: 'For the first cup, before the day gets loud.',
    tags: ['coffee', 'daily ritual'],
  },
  {
    id: 'linen-shirt',
    name: 'Linen camp shirt',
    cost: 98,
    theme: 'Good design',
    link: 'https://www.uniqlo.com/us/en/products/E455958-000',
    description: 'An easy, well-cut layer in a natural texture that gets better with every wear.',
    image: 'https://images.unsplash.com/photo-1610652492500-ded49ceeb378?auto=format&fit=crop&w=1200&q=85',
    note: 'The kind of shirt that makes a regular Tuesday feel considered.',
    tags: ['wearable', 'everyday'],
  },
  {
    id: 'camp-chair',
    name: 'Helinox Chair One',
    cost: 110,
    theme: 'Outside time',
    link: 'https://helinox.com/products/chair-one',
    description: 'A light, comfortable camp chair for parks, porches, and last-minute sunsets.',
    image: 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=1200&q=85',
    note: 'For sitting somewhere beautiful with nowhere else to be.',
    tags: ['camping', 'weekends'],
  },
  {
    id: 'headphones',
    name: 'QuietComfort Ultra',
    cost: 379,
    theme: 'Little luxuries',
    link: 'https://www.bose.com/p/headphones/bose-quietcomfort-ultra-headphones/QCUH-HEADPHONEARN.html',
    description: 'A soft little pocket of silence for flights, focused work, or a long walk home.',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
    note: 'A little more quiet is never a bad thing.',
    tags: ['music', 'focus'],
  },
  {
    id: 'book',
    name: 'The Art of Noticing',
    cost: 24,
    theme: 'Slow mornings',
    link: 'https://www.penguinrandomhouse.com/books/608103/the-art-of-noticing-by-rob-walker/',
    description: 'A playful field guide for seeing more of the interesting world hiding in plain sight.',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=85',
    note: 'For a curious brain and a spare patch of afternoon.',
    tags: ['reading', 'curiosity'],
  },
  {
    id: 'record-player',
    name: 'Audio-Technica LP60X',
    cost: 149,
    theme: 'Good design',
    link: 'https://www.audio-technica.com/en-us/at-lp60x',
    description: 'A friendly first turntable for making an ordinary room sound like an occasion.',
    image: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=1200&q=85',
    note: 'Because some albums deserve a little ceremony.',
    tags: ['music', 'home'],
  },
]

export const themes: Array<'All gifts' | GiftTheme> = [
  'All gifts',
  'Slow mornings',
  'Good design',
  'Outside time',
  'Little luxuries',
]
