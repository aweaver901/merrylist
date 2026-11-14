# Visitor experience ideas

The quiz already helps visitors choose. These additions would make browsing more playful while helping people make a decision.

| Priority | Feature | Visitor experience | Work involved |
| --- | --- | --- | --- |
| 1 | My shortlist | Hearts survive a return visit; a Saved view gathers favorites with a running total. | Browser storage, saved filter, clear/remove controls. |
| 2 | Surprise me | A wrapped present reveals a random gift within the current budget, with an option to roll again. | Reuse gift details and filters; respect reduced motion. |
| 3 | Shop my budget | Quick price filters and price sorting make browsing comfortable. Show every populated category. | Local filtering; useful empty states. |
| 4 | Gift face-off | Pick two gifts and compare price, Austin’s note, and why each would be useful. | A two-item comparison tray and accessible comparison dialog. |
| 5 | A note from Austin | Personal notes, preferred sizes/colors, and a few owner-selected top picks make the list feel personal. | Add optional data fields; owner supplies preferences. |
| 6 | Secret Santa reservation | Privately mark a gift as claimed so another visitor avoids buying the same thing. | Shared backend, reservation management, and a privacy decision about what Austin can see. Browser storage alone cannot coordinate visitors. |

Start with shortlist, surprise picker, and budget browsing. Keep celebration effects brief, optional, and compatible with reduced-motion settings. Avoid timers or purchase-pressure messages.

# Image audit

Checked all 23 original image URLs. Eight returned HTTP 404: the dashcam, charger, four decals/stickers, swim trunks, and beach towel. Both glove entries and the cookbook reused a hoodie photo. Other linked product pages also supplied more appropriate photos for the laptop and alternative-inventions book.

Recovered photos from the linked product pages, visually inspected a contact sheet, and saved all 23 gift images locally in `public/gifts/`. The hero now references an existing gift with matching alternative text. Gift cards, detail views, and quiz results use a shared fallback component; product cards and detail images fit the entire product without cropping.

Some retail pages intermittently returned bot-check pages or access errors, so successful image verification does not establish checkout availability or current product pricing. This audit did not change product names, prices, or purchasing links.
