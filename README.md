# Merrylist

A shareable, animated Christmas wish list. The curated gift catalog, page copy, themes, and quiz choices live in `src/data/gifts.ts`; shopper-submitted gift ideas are stored privately in Supabase until approved.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Update the list

Make list changes in `src/data/gifts.ts` only. Edit the `gifts` array to add, remove, or update gifts. Every gift needs:

- `name`
- `cost`
- `theme`
- `link`
- `description`
- `image`
- `note`
- `tags`

The same file also contains `listContent` for the page's text and metadata, plus `themes` and `quizQuestions` for filters and the gift-matching quiz.

The app includes theme filtering, favorite marks, a share button, detail views, and a short gift-matching quiz for visitors who want help deciding. Signed-in shoppers can suggest a gift for review. The owner gets an in-app pending count and can approve or decline suggestions; approved gifts join the public list and quiz.

The quiz asks about budget, gifting style, and an ideal day. It filters out gifts above the chosen budget, then ranks gifts by how many preference answers match their theme, with lower prices breaking ties. Results explain the match and let visitors browse alternatives, edit answers, or restart. Quiz copy and theme mappings live in `src/data/gifts.ts`; matching logic lives in `src/data/quiz.ts`.

Run `node scripts/check-quiz.cjs` with Node 22.18+ to check all answer combinations, budget limits, and ranking. Run `npm run build` to validate the production build.

Gift photos are stored in `public/gifts/` and referenced from `src/data/gifts.ts`. When changing a product, replace its photo with the matching product image. The shared `GiftImage` component provides lazy loading and a friendly fallback if a photo cannot load. The checks also verify that every gift has a local image asset.

Shared gift reservations use Google sign-in, Considering/Bought statuses, and owner privacy enforced by database permissions. No SMTP service or custom domain is required. See [Supabase setup](supabase/README.md) for the Google configuration steps, owner setup, and validation commands. Without that configuration, the site continues to work as a public wish list and shared reservations remain unavailable.
