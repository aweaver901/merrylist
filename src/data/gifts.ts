export type GiftTheme = 'Footwear' | 'Food & drink' | 'Gift Card' | 'Books' | 'Safety & Security' | 'Car Accessories' | 'Electronics'

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
  {
    id: 'the-book',
    name: 'The Book',
    cost: 119,
    theme: 'Books',
    link: 'https://www.amazon.com/dp/B0CJCKGRW1?ref=nb_sb_ss_w_atc-single-asin_k0_1_8&crid=FYPG1CYYQ5YX&sprefix=the+book',
    description: 'Ultimate Guide to rebuilding a civilization',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/91w+sO9mAjL._SL1500_.jpg',
    note: 'A comprehensive guide to rebuilding society from scratch.',
    tags: ['book', 'guide', 'survival'],
  },
  {
    id: 'alternative-inventions',
    name: 'Alternative Inventions',
    cost: 119,
    theme: 'Books',
    link: 'https://www.amazon.com/Alternative-Inventions-Encyclopedia-Mesmerizing-Illustrations/dp/B0H8XVZRWC/ref=sr_1_49_sspa?crid=A63MZDU7QRMA&dib=eyJ2IjoiMSJ9.P76D6AHeNGTPszJY_v_xMBtaT9fUIk0CmdOFLhNOE2yknSF9ipf33IwBu9pIAwP8ZzkkMIapVtrNstCdTUfbXA.424MvGayk9H_h_AMCtI8wRkE98UxLn5L2PKvwXl9fPI&dib_tag=se&keywords=gifts%2Bfor%2Badult%2Bmen&qid=1794670805&sprefix=gifts%2Bfor%2Badult%2Bmen%2Caps%2C161&sr=8-49-spons&xpid=2uWeAIzqpYxFM&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGZfbmV4dA&th=1',
    description: 'A collection of fascinating alternative inventions.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/81yKK-o8kIL._SL1500_.jpg',
    note: 'Explore the world of creative and unconventional ideas.',
    tags: ['book', 'inventions', 'creativity'],
  },
  {
    id: 'unboxme-socks',
    name: 'Unboxme Socks (Navy)',
    cost:  10,
    theme: 'Footwear',
    link: 'https://www.amazon.com/Unboxme-Socks-Ultra-Soft-Gift-Ready-Charcoal/dp/B0F37LTTSQ/ref=sr_1_72?crid=A63MZDU7QRMA&dib=eyJ2IjoiMSJ9.RrwzJFPZLzOnYzFKGhnWfuS95UFypVny5Lgs_ysMt2OOuZNbuyreJ-9jj-ejwPUlgcwwVjboLdo6ia-9x9Zm_hu3NgtGipNKAfbT09-cBcYCg1zz7VJ56azh2ogXreahgfUagNDNgpmJMks9_JyPyjLET5eDjYJ3C6Sr9XwvtAhhihCrbu6-FweqvVp6hUDDeyEKo0v8Z7h3mV7cbbFd2Fl8tOtYjJPyPeUW6i1LJCBuj5RNHdgjyVzy8BwjV1l8gdslNeswlQEySd79kYW1PYg4WesmDugM8tAtpqwt-2Y.U9omIDeb1ezBxLwOTD5RYuFgxQE-xFpGIFfvl5hLiAQ&dib_tag=se&keywords=gifts%2Bfor%2Badult%2Bmen&qid=1794670805&sprefix=gifts%2Bfor%2Badult%2Bmen%2Caps%2C161&sr=8-72&xpid=2uWeAIzqpYxFM&th=1',
    description: 'Ultra-soft socks for everyday comfort.',
    image: 'https://m.media-amazon.com/images/I/71oXgHouNKL._AC_AIweblab1392912,T4_FMavif_SF1018.5,1273.5_PQ65_.jpg?aicid=detailPage-mediaBlock',
    note: 'Perfect for those chilly evenings.',
    tags: ['footwear', 'socks', 'comfort'],
  },
  {
    id: 'spotminders-tracking',
    name: 'Spotminders Tracking Card (Pro Version PLS)',
    cost: 43,
    theme: 'Safety & Security',
    link: 'https://www.amazon.com/Spotminders-Tracking-Stocking-Christmas-Rechargeable/dp/B0FVFTY4CG/ref=sr_1_118_sspa?crid=A63MZDU7QRMA&dib=eyJ2IjoiMSJ9.U2ui7GrqcgeQ2nvVO_JULDA4HgoOD4o28YuB_ORcagjVGJhMClnnySyllsz2FTERMoe4GW8PWN_mInH3KIEvXh8Q0gedqdFauV5pFVI5qmMaHUqHo9JlR2bFx1CZpbHFmhq6P49HIxA2AYwRraYIDubBboZPrfN-hEXaOBu12GTKygoR1BGqAppnRgWtwm6GLwXcofk8zmEzr4foNBi_k7Hb7F2FKvOsFoRYXkzwmYxdYPEsP8eNWPk4N6Lm0-W5CtjPr9WGXG8S78coWmgBuTvMsj2Z97vOq5nz-DLSY9k.I2DmFZlZNXdzVlq0cPh91v6C68Tj1-hKScElnAED7PA&dib_tag=se&keywords=gifts%2Bfor%2Badult%2Bmen&qid=1794671139&sprefix=gifts%2Bfor%2Badult%2Bmen%2Caps%2C161&sr=8-118-spons&xpid=2uWeAIzqpYxFM&sp_csd=d2lkZ2V0TmFtZT1zcF9tdGY&th=1',
    description: 'A rechargeable tracking card for my wallet.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/813DRoLVTpL._AC_SL1500_.jpg',
    note: 'Keep your wallet safe and track it with this innovative device.',
    tags: ['safety & security', 'tracking'],
  },
  {
    id: 'dashcam-front-and-rear-camera-for-subaru-forester',
    name: 'Dashcam Front and Rear Camera for Subaru Forester',
    cost: 130,
    theme: 'Safety & Security',
    link: 'https://www.amazon.com/BOTSLAB-G980H-STARVIS-Front-Upgraded/dp/B0GX91NBCX/ref=sr_1_1_sspa?crid=24KAATEYFG5Y9&dib=eyJ2IjoiMSJ9.mQ4KlY1fmGzf8yTqiMTzTyA-iJLNzYbgQ4V47qqWG9Dt762e3gLvtdoX9LC0OfYFHpvwwzDhHkZl9JHskjfp1glz_EE9N6dcqheU0FSyGZ8oMEl4K9Oz_8-ASxobdBg8Uvth15QfjUri8SQI2fg4V3sKJ8hse31Kr12XXVGNitRqstCvzw6dpzdPtBueubjselP71Tfs1JbFcMr6b6SabXh_xBPoSpDAq5o_dZm3yjU.lPKZQVc8umgOKw05-LnlbHQ9cKr736RNIw6wqqowUUY&dib_tag=se&keywords=dashcam%2Bfront%2Band%2Brear%2Bcamera%2Bfor%2Bsubaru%2Bforester&nsdOptOutParam=true&qid=1794671466&sprefix=dashcam%2Bfront%2Band%2Brear%2Bcamera%2Bfor%2Bsubaru%2Bforest%2Caps%2C258&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1',
    description: 'A dashcam with front and rear cameras for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Ensure safety and security on the road with this dashcam.',
    tags: ['safety & security', 'dashcam'],
  },
  {
    id: 'amazon-basics-two-port-car-charger-coiled',
    name: 'Amazon Basics Two-Port Car Charger, Coiled',
    cost: 22,
    theme: 'Car Accessories',
    link: 'https://www.amazon.com/Amazon-Basics-Two-Port-Charger-Coiled/dp/B0DB5177N9/ref=sr_1_12_ffob_sspa?af=eyJ2ZWhpY2xlTmFtZSI6IjIwMjUgU3ViYXJ1IEZvcmVzdGVyIiwidmVoaWNsZSI6IjIwMjUtMTMtNTctLS0tLS0tLS0tLS0ifQ%3D%3D&content-id=amzn1.sym.94dca4a3-9a70-41ce-8d29-d35aec04934d%3Aamzn1.sym.94dca4a3-9a70-41ce-8d29-d35aec04934d%3Aamzn1.automotive.PartFinder.VEHICLE_FILTER.all_product_search&crid=39MTNFO9HEN30&dib=eyJ2IjoiMSJ9.P9avpnpRLuwmJBc155C6hKxGy2_F2MjTXZNKrLrmLBE0jQsWYh8QjF8aQQY_R0WkfUHxiB2vF9wtTkRStbySmpI5RdwM-eoXD-yjLneWhlEPD6OQQ6bI-2E8XnoaESYhE1pLUJiF5PRC3TPUM2rdAbBwipuvNBTegiatQS8z8J4F_jz0HxPsL7k2goU8cM6EhdqGyAk7N86TlFA-ZApP6vvN7pYypp7looiVr2qHEof86_eQVi_3S-m06Orno9Y3uow8ZX5OzA0DL5r4BM7usTgHoj8MOi9HmxKtpYwcsDM.HRA5KYm-SdyPH64Ljmh9__vqfESPkUNoYZbtbNQHNcg&dib_tag=se&keywords=car%2Baccessories%2Bfor%2Bmen&pd_rd_r=63fab481-0809-46e2-8079-10656855052c&pd_rd_w=sh4C8&pd_rd_wg=T7qIf&pid=VrL3e8M&qid=1794671821&sprefix=car%2Baccessries%2Bfor%2Bmen%2Caps%2C173&sr=1-12-spons&vehicle=2025-13-57------------&vehicleName=2025%2BSubaru%2BForester&sp_csd=d2lkZ2V0TmFtZT1zcF9tdGY&th=1',
    description: 'A two-port car charger with a coiled design for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Keep your devices charged on the go with this convenient car charger.',
    tags: ['car accessories', 'car charger'],
  },
  {
    id: 'stickios-car-sticker-resistant-waterproof',
    name: 'Stickios Car Sticker, Resistant & Waterproof',
    cost: 10,
    theme: 'Car Accessories',
    link: 'https://www.amazon.com/Stickios-Car-Sticker-Resistant-Waterproof/dp/B09GDTD1VQ/ref=sr_1_76?crid=3O8SFBB5NV3EJ&dib=eyJ2IjoiMSJ9.dU4bzB2Kb2F1poZxXonhr1PpXDl5Akphtu2M4WstatBshFdSIylpMjZzBWE81C-oDVaTAKBlR5iv-LED3UWjsRZ3nk4ORgr018qBokK_qgTe26gsYYXPiUpw6DOOLyR9gAesfZbVGawyH_Kh0Pi3mxvxXWYmJjqN5sJDEfITjgwqA39aq370PuB6Ps8pfpFx76E3jNBrMo5JLibHCc2sUCgt8EMHWMKeQX_ZFJuVgf8u2rK-coBhaa7_uPqxwkI9.Dfy30EHATMpjCdTSQ2MSnchqpGw1Ch1wyt44KfOiWf8&dib_tag=se&keywords=car%2Bback%2Bwindow%2Bdecal&qid=1794672364&s=automotive&sprefix=car%2Bback%2Bwindow%2Bdecal%2Cautomotive%2C129&sr=1-76&xpid=QWBXSFenLh1o7&th=1',
    description: 'A durable and waterproof car sticker for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Add a personal touch to your car with this stylish sticker.',
    tags: ['car accessories', 'car sticker'],
  },
  {
    id: 'back-off-bumper-humper-sticker',
    name: 'Back Off Bumper Humper Sticker',
    cost: 10,
    theme: 'Car Accessories',
    link: 'https://www.amazon.com/Back-Off-Bumper-Humper-Sticker/dp/B0HBSW32BC/ref=sr_1_89_sspa?crid=3O8SFBB5NV3EJ&dib=eyJ2IjoiMSJ9.cC0zNhx3Imy5ikRZmP1jZZcOZWAd2peva8z-FrH6-U9pA_VmmUeHVpcgNKSF2FFfM2vnMju-Fc-Fe56rc0bxDf5omuuWvaSjDa8MNOxpeZtjmz9jPZMcEfkqWvmsDj351avM_M5MUZMdEMkE0kBklvRSv-pqje0u6XbL06DSpvXLpp2oSoZ5pGMbQqTmwQuH7fp0JYmyJvbEUvpVk7WKa4K75XW6HPipiKclBcw3i8i2tyDkO4BtWHOM3QbOX2A9.CG7XlmmlhPBRDFUW0H-Sjjjd5B75-x2pQ2dun0v-xmI&dib_tag=se&keywords=car+back+window+decal&qid=1794672441&s=automotive&sprefix=car+back+window+decal%2Cautomotive%2C129&sr=1-89-spons&xpid=QWBXSFenLh1o7&sp_csd=d2lkZ2V0TmFtZT1zcF9tdGY&psc=1',
    description: 'A humorous bumper sticker for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Add a touch of humor to your car with this funny sticker.',
    tags: ['car accessories', 'bumper sticker'],
  },
  {
    id: 'leniutor-reflective-sticker-waving-window',
    name: 'Leniutor Reflective Sticker, Waving Window Decal',
    cost: 8,
    theme: 'Car Accessories',
    link: 'https://www.amazon.com/Leniutor-Reflective-Sticker-Waving-Window/dp/B09ZTRVMWP/ref=sr_1_128?crid=3O8SFBB5NV3EJ&dib=eyJ2IjoiMSJ9.2LLpAIQmH_mZh23_Tsst2aMp1gxYrZp3WRn2Udll2V4ByYb9tZTlspI8LQ74ApSKXHExkXkiHsmLc5ZnhqautOS8C0VdKhbCPjEMa0QfriY.Gc3DcHBp11SAAeBqRp_wb099ojp7ykz-R6mUBZSTLHE&dib_tag=se&keywords=car%2Bback%2Bwindow%2Bdecal&qid=1794672604&s=automotive&sprefix=car%2Bback%2Bwindow%2Bdecal%2Cautomotive%2C129&sr=1-128&xpid=QWBXSFenLh1o7&th=1',
    description: 'A reflective sticker for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Increase visibility and add a unique touch to your car with this reflective sticker.',
    tags: ['car accessories', 'window decal'],
  },
  {
    id: 'vemfare-waterproof-sticker',
    name: 'Vemfare Waterproof Sticker, 7.87x3.54x5.9x3.14',
    cost: 9,
    theme: 'Car Accessories',
    link: 'https://www.amazon.com/Vemfare-Stickers-Waterproof-7-87x3-54-5-9x3-14/dp/B0HKVWZT62/ref=sxin_9_pa_sp_search_thematic_sspa?content-id=amzn1.sym.d3e12509-1750-404b-a204-c683338aa2ac%3Aamzn1.sym.d3e12509-1750-404b-a204-c683338aa2ac&crid=3O8SFBB5NV3EJ&cv_ct_cx=car%2Bback%2Bwindow%2Bdecal&keywords=car%2Bback%2Bwindow%2Bdecal&pd_rd_i=B0HKVWZT62&pd_rd_r=edc99c41-6fdf-4a6d-8723-e25ff4c81229&pd_rd_w=BRf2N&pd_rd_wg=jfTuP&pf_rd_p=d3e12509-1750-404b-a204-c683338aa2ac&pf_rd_r=A2HXM15WZYDMEBHSE1C7&qid=1794672752&s=automotive&sbo=RZvfv%2F%2FHxDF%2BO5021pAnSA%3D%3D&sprefix=car%2Bback%2Bwindow%2Bdecal%2Cautomotive%2C129&sr=1-170-c4665559-580b-4e9c-a3c3-882a93badabc-spons&xpid=QWBXSFenLh1o7&aref=7x8pqhU34W&sp_csd=d2lkZ2V0TmFtZT1zcF9zZWFyY2hfdGhlbWF0aWM&th=1',
    description: 'A waterproof sticker for my Subaru Forester.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Durably designed to withstand various weather conditions.',
    tags: ['car accessories', 'window decal'],
  },
  {
    id: 'acer-aspire-5-a515-58-58gk-laptop',
    name: 'Acer Aspire 5 A515-58-58GK Laptop',
    cost: 499,
    theme: 'Electronics',
    link: 'https://www.amazon.com/Acer-Aspire-Storage-Display-Windows/dp/B0HJG54TV2/ref=sr_1_1_sspa?crid=1YVMEHIJ1I11C&dib=eyJ2IjoiMSJ9.G1SpoXLdIrw95mBU730VLwkhwPgB_24vejz4bJDrIvW9r0RyAyU6n4e16CLiCEAN-63GPyemReqsQv7ZZrnrAerhU2jkeUJGfB7iqoSjbUIiPIZ_QjgS7eOl2InZUcoIFcJQHowdjGHN4hJPdccux5KEcAvkisOjzNGDoyeX5fliaUPwAqiAiRNFQA6l3ACcO0MaV079pT8qFUVdOBIgb9xuR4lSzhL5knjsGZER1Ik.fq-KhpkAFnWRFqKIKZr5YWecOAan-W4sdpjidxMUPvE&dib_tag=se&keywords=acer+laptop&qid=1794673087&sprefix=acer+laptop%2Caps%2C154&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1',
    description: 'A reliable laptop for everyday use.',
    image: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/71g5k0r8JEL._AC_SL1500_.jpg',
    note: 'Perfect for work, study, and entertainment.',
    tags: ['electronics', 'laptop'],
  },
  // {
  //   id: '',
  //   name: '',
  //   cost: 0,
  //   theme: '',
  //   link: '',
  //   description: '',
  //   image: '',
  //   note: '',
  //   tags: [],
  // },

  ]

export const themes: Array<'All gifts' | GiftTheme> = [
  'All gifts',
  'Footwear',
  'Food & drink',
  'Gift Card',
  'Books',
  'Safety & Security'
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
  { id: 'book', label: 'A book to read', theme: 'Books' },
  { id: 'dashcam', label: 'A dashcam for my car', theme: 'Safety & Security' },
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
