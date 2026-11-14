# Merrylist

A shareable, animated Christmas wish list. All list content—including gifts, page copy, themes, and quiz choices—is kept in `src/data/gifts.ts` so it is easy to edit without touching the UI.

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

The same file also contains `listContent` for the page's text and metadata, plus `themes` and `quizChoices` for filters and the gift-matching quiz.

The app includes theme filtering, favorite marks, a share button, detail views, and a short gift-matching quiz for visitors who want help deciding.
