# Merrylist

A shareable, animated Christmas wish list for Austin. Gift content is intentionally kept in `src/data/gifts.ts` so it is easy to edit without touching the UI.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Update the list

Add, remove, or edit objects in `src/data/gifts.ts`. Every gift needs:

- `name`
- `cost`
- `theme`
- `link`
- `description`
- `image`
- `note`
- `tags`

The app includes theme filtering, favorite marks, a share button, detail views, and a short gift-matching quiz for visitors who want help deciding.
