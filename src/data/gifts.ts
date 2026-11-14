export type GiftTheme = 'Slow mornings' | 'Good design' | 'Outside time' | 'Little luxuries' | 'Footwear' | 'Food & drink'

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
    id: 'black-slides',
    name: 'Draco Slides',
    cost: 99,
    theme: 'Footwear',
    link: 'https://www.amazon.com/Reflective-DracoSlides-Adjustable-Resistant-Footwear/dp/B0DNGQC25J?ref_=ast_sto_dp&th=1&psc=1',
    description: 'A simple, comfortable slide that’s easy to wear around the house or on a quick errand.',
    image: 'https://m.media-amazon.com/images/I/71ytw8CqMkL._AC_AIweblab1392912,T4_FMavif_SF1042.5,1042.5_PQ65_.jpg?aicid=detailPage-mediaBlock',
    note: 'The kind of footwear that makes a regular Tuesday feel considered.',
    tags: ['wearable', 'everyday'],
  },
  {
    id: 'food-soft-pretzels',
    name: 'Soft Pretzels',
    cost: 89.47,
    theme: 'Food & drink',
    link: 'https://www.amazon.com/Snack-Super-Soft-Pretzel-case/dp/B00B042C8S/ref=sr_1_23?crid=2HBN5OMO0GX0F&dib=eyJ2IjoiMSJ9.bzYS9FGEGnSecXgWKMqWGfG9fJVQgSqf2ht_byuhVh_YL-76vbQS9PSmto3WfSlDQNSgyNsqLug5t5FLDzJ_y-RH3C9mLGJrLYisU0JJnOngellF0waWRH7P9anK2C7Rk8ikaImGl9lUh6FCYF2ZcACfLdIp2lUgggt973UZo93Md6bKCqLD3Llzd2CP5rF6tdJl1-aLMCvkTI7Sm6GP2cXz2vWQezZvPniNVqj570hqf7y7pgImllnJgHNiLj9EgVv8v3zH6AhDUJhLY6WxmB2mC5n-XmNK3DQvTWyEPHA.fxcl6GswbWQVzSgvHKmrWrNoF8-4IRxKnCbt24xO4AA&dib_tag=se&keywords=soft+pretzels&qid=1794669281&sprefix=soft+pretzels%2Caps%2C163&sr=8-23',
    description: 'A box of soft pretzels for a cozy night in, a quick snack, or a little something to share.',
    image: 'https://m.media-amazon.com/images/G/01/apparel/rcxgs/tile._CB483369110_.gif',
    note: 'A little salty, a little sweet, and a lot of comfort.',
    tags: ['food', 'snack', 'cozy'],
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
  'Footwear',
  'Food & drink',
]

export type QuizChoice = {
  id: string
  label: string
  theme: GiftTheme
}

export const quizChoices: QuizChoice[] = [
  { id: 'slow', label: 'A quiet, cozy morning', theme: 'Slow mornings' },
  { id: 'outside', label: 'A little adventure outside', theme: 'Outside time' },
  { id: 'design', label: 'Something beautiful and useful', theme: 'Good design' },
  { id: 'luxury', label: 'A pocket of calm and comfort', theme: 'Little luxuries' },
  { id: 'shoes', label: 'Something to wear on my feet', theme: 'Footwear' },
  { id: 'food', label: 'Something delicious to eat', theme: 'Food & drink' },
]

// Keep the list's owner-specific words and page details here with the gifts.
export const listContent = {
  owner: 'Austin',
  brand: 'merrylist',
  pageTitle: "{owner}'s Merrylist",
  metaDescription: "{owner}'s Christmas wish list — choose something that feels like me.",
  hero: {
    eyebrow: "{owner}'s Christmas list",
    titleFirst: 'A few things',
    titleEmphasis: 'worth wishing for.',
    introduction: 'A carefully gathered collection of things I’d love to unwrap, use, wear, or wander with. Pick what feels most like me.',
    imageGiftId: 'camp-chair',
    imageAlt: 'A quiet campsite by the water',
    stickerLabel: 'thoughtful possibilities',
    captionFirst: 'somewhere between',
    captionSecond: 'wanting & needing',
  },
  list: {
    eyebrow: 'The good stuff',
    titleFirst: 'Choose your',
    titleEmphasis: 'own adventure.',
    noteFirst: 'No pressure, no wrong answers.',
    noteSecond: 'Just things I’d be genuinely happy to see.',
  },
  choose: {
    eyebrow: 'Still deciding?',
    titleFirst: 'Make it a little',
    titleEmphasis: 'more personal.',
    description: 'Answer three tiny questions and I’ll point you toward the gift that feels most like {owner}.',
  },
  footer: 'Made with hope, lists & a little holiday magic.',
  footerMark: "a / '26",
  quiz: {
    kicker: 'The highly scientific method',
    titleFirst: 'What kind of gift',
    titleEmphasis: 'feels most like you?',
    resultKicker: 'Your very good match',
  },
}
