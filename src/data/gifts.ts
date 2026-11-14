export type GiftTheme = 'Footwear' | 'Food & drink' | 'Gift Card'

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
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/61XSCMaiycL._SL1000_.jpg',
    note: 'A little salty, a little sweet, and a lot of comfort.',
    tags: ['food', 'snack', 'cozy'],
  },
   {
    id: 'amazon-gift-card',
    name: 'Amazon Gift Card',
    cost: 25,
    theme: 'Gift Card',
    link: 'https://www.amazon.com/gp/registry/gift-card/create?ie=UTF8&ref_=ast_sto_dp',
    description: 'A gift card to spend on anything you like from Amazon.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjKOar_t2uJViyX4zQp1Ij_KroDA2EhP8gevQNqcl9v9_nQN4-yvcchnQ&s=10',
    note: 'The perfect way to give the gift of choice.',
    tags: ['gift card', 'flexible'],
  },
  {
    id: 'amc-gift-card',
    name: 'AMC Gift Card',
    cost: 25,
    theme: 'Gift Card',
    link: 'https://www.amctheatres.com/gift-cards',
    description: 'A gift card to spend on anything you like from AMC.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNGqqe8ANXe-BKEi75kl72XaIEKKA6T_VaRuFrg2gFUao4GOlS9NkrEBs&s=10',
    note: 'The perfect way to give the gift of choice.',
    tags: ['gift card', 'flexible'],
  },
{
    id: 'VeraCosy-Mens-Two-Tone-Memory-Slippers',
    name: 'VeraCosy Mens Two-Tone Memory Slippers',
    cost: 35,
    theme: 'Footwear',
    link: 'https://www.amazon.com/VeraCosy-Mens-Two-Tone-Memory-Slippers/dp/B07CLXD2V4/ref=sr_1_51?crid=DRIQS2JTFNXW&dib=eyJ2IjoiMSJ9.YaUqzn5CouRE81vlUjjOv_RnQRNlnmY9QG2Fwb-wl1CFGzJtJl-3d5ZBFBGxBJBwWiM2eVXTpQG13aoAX2oaja6g6pgDYllmWZuMN4EIs8TIbw_q71kVBFPgoZEFsIW5XNDbmk2TwD1gCF85VEcueamJvalf0orwcrUa9tEK7HEXLJsjvySj2bp59AXMGdBVbErUw5ry5EzTbdkfQPOz6cvkxs6auR5LEUUNcjnt4MkG3EwlimoYw5089-zLxjY65eXAsFZqmHiu9kVLoflGK5tRT0ROkviV24tkSqvVd6Y.Ai8coiDdLsb9msANlSVsywhPDNIByK2WCF-AFNAQTrs&dib_tag=se&keywords=gifts+for+me&qid=1794669953&sprefix=gifts+for+me%2Caps%2C170&sr=8-51',
    description: 'Comfortable memory foam slippers for everyday wear.',
    image: 'https://m.media-amazon.com/images/I/81EEfuhlShL._AC_AIweblab1392912,T4_FMavif_SF1042.5,1042.5_PQ65_.jpg?aicid=detailPage-mediaBlock',
    note: 'Soft and supportive, perfect for those chilly evenings.',
    tags: ['footwear', 'comfortable', 'everyday'],
  },

  ]

export const themes: Array<'All gifts' | GiftTheme> = [
  'All gifts',
  'Footwear',
  'Food & drink',
  'Gift Card'
]

export type QuizChoice = {
  id: string
  label: string
  theme: GiftTheme
}

export const quizChoices: QuizChoice[] = [
  { id: 'shoes', label: 'Something to wear on my feet', theme: 'Footwear' },
  { id: 'food', label: 'Something delicious to eat', theme: 'Food & drink' },
  { id: 'gift-card', label: 'A gift card for any occasion', theme: 'Gift Card' },
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
