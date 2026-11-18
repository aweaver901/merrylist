# Shared gift coordination setup

The UI and database implementation are prepared. Cross-device coordination requires a connected Supabase project and these setup steps; it is not backed by local browser storage.

## Configure the database

Use an administrator database connection or the Supabase SQL editor to run these files in order:

1. `migrations/202611140001_gift_coordination.sql` (if not already applied)
2. `migrations/202611140002_gift_ideas.sql`
3. `migrations/202611140003_christmas_songs.sql`
4. `migrations/202611150001_owner_gifts.sql`
5. `migrations/202611150002_shopper_chat_and_purchase_names.sql`
6. `migrations/202611170001_gift_editing_and_favorites.sql`
7. `seed.sql` (if not already applied)
8. `setup-owner.sql` (if not already applied)

The owner email has been set to the address Austin provided. Keep this setting server-side. The owner is bound to their stable account ID after email verification, so changing their email later will not reveal purchase statuses. Without owner configuration, all coordination requests fail closed with no gift statuses.

When gifts change, run `npm run sync:catalog` and apply the updated `seed.sql`. It only adds known gift IDs; it does not delete reservations. Removing a gift from the public list does not erase its purchase history.

## Configure Google sign-in — no SMTP or custom domain

The website uses **Sign in with Google**. Supabase creates the website account when Google sign-in succeeds. No email/password registration, confirmation email, password-reset email, or custom SMTP is needed for this flow. Your existing `https://fluffy-alpaca-b0139a.netlify.app` address works.

If your Supabase database is already configured, keep its existing migrations and data. Switching sign-in methods does not require rerunning setup or deleting any data.

For gift suggestions, existing deployments only need to apply the new `migrations/202611140002_gift_ideas.sql` migration once. No new environment variables or email service are required.

Apply `migrations/202611140003_christmas_songs.sql` once to enable the owner-managed music playlist. It seeds the current carols in the database; after signing in as the configured owner, expand the record player and choose **Add a song**. Use a public HTTPS URL to a direct playable audio file and provide its source or attribution link. Spotify and YouTube page URLs are not direct audio files.

Apply `migrations/202611150001_owner_gifts.sql` once to enable direct gift entry. The signed-in owner can add a gift from the **Gift ideas** panel; it appears immediately on the public list and in the quiz, without going through the shopper suggestion review flow.

Apply `migrations/202611170001_gift_editing_and_favorites.sql` once to let the owner edit any published gift and mark public favorites. It also orders shopper chat history by message time; existing chat messages are retained.

1. In Supabase, open **Authentication → Sign In / Providers → Google** (the provider page may be labeled **Providers**). Copy the **Callback URL** shown there. It normally looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
2. Open [Google Cloud Console](https://console.cloud.google.com/) with your Google account. Create or select a project named **Merrylist**.
3. Open **Google Auth Platform** and choose **Get started** if prompted. Enter **Merrylist** as the app name and your own email for support and developer contact. Choose an **External** audience so family and friends can sign in.
4. Under **Data Access**, use only basic identity scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`. No Gmail or Google Drive access is needed. For initial testing, keep the app in Testing and add your account and your testers under **Audience → Test users** if required by the console. Follow Google's publishing requirements before wider release.
5. Open **Clients → Create client**, choose **Web application**, and name it **Merrylist website**.
6. Under **Authorized JavaScript origins**, enter your full Netlify origin, such as `https://fluffy-alpaca-b0139a.netlify.app`, without a path. For local development you can also add `http://localhost:5173` using a development client.
7. Under **Authorized redirect URIs**, paste the **Supabase Callback URL from step 1**. This is the Supabase address, not your Netlify homepage. Click **Create**, then copy the **Client ID** and **Client Secret**.
8. Return to Supabase's **Google** provider settings. Enable Google, enter the Client ID and Client Secret, and save. Leave nonce checks enabled. Do not enable the option that accepts accounts without an email address.
9. In Supabase **Authentication → URL Configuration**, set **Site URL** to `https://fluffy-alpaca-b0139a.netlify.app/`. Add that same URL to **Redirect URLs**. For local development, also allow `http://localhost:5173/`.
10. Disable the **Email** sign-in provider if you previously enabled it for email/password registration. Leave new-user sign-ups enabled so first-time Google visitors can join. The website no longer exposes email/password forms.
11. Configure the frontend variables below, rebuild, and deploy. On the website, click **Sign in with Google**, and select **aweaver901@gmail.com** for the owner account. The panel should say **Your surprises are safe**.
12. Test with a different Google account in a separate browser. That account should see gift availability and be able to claim gifts; the owner account should see no reservation or purchase labels.

The two redirect settings have different purposes:

| Setting | Address |
| --- | --- |
| Google: Authorized redirect URI | Supabase callback: `https://YOUR-PROJECT.supabase.co/auth/v1/callback` |
| Supabase: Site URL / Redirect URLs | Website homepage: `https://fluffy-alpaca-b0139a.netlify.app/` |

The Google Client Secret belongs only in Supabase's Google provider settings. Do not add it to the frontend, Netlify's public `VITE_` variables, Git, or a chat message. This flow requests basic Google identity only; it does not request access to email contents.

## Configure the frontend

Copy `.env.example` to `.env.local` for local development and set:

```text
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<public publishable key>
```

Use only the publishable key. Never put a service-role key, database password, or secret key in a `VITE_` variable. On Netlify, add these two public variables under the site's environment variables, making them available during builds, then trigger a new deploy. This works with a static Vite frontend; the database RPCs enforce permissions server-side.

## Behavior and privacy

- Anyone can browse the wish list. Sign-in is required to see coordination status and to use retailer links once coordination is enabled. The owner retains ordinary retailer links.
- Shoppers see Available, Considering, and Bought; the claimant can change or release their own claim. When marked Bought, other shoppers see the buyer's Google profile name. The owner still sees no purchase status or identity.
- Considering reserves one gift until explicitly released; it does not expire automatically. Bought means the shopper marked it bought, not that a retailer confirmed payment.
- Shopper status subscribes to a row-secured Realtime update and also polls every two seconds while the tab is visible, on focus, and after changes. A newly bought gift is highlighted on shopper pages with an in-page notice. Actual delivery time depends on Supabase Realtime and network latency; polling is the fallback. The UI offers manual refresh and disables actions when the status cannot be checked.
- Signed-in shoppers can use the private group chat. The configured owner account cannot read or post in chat. Messages are stored until their sender deletes them, and chat refreshes every four seconds while visible.
- Chat history is retained without an automatic daily purge, grouped by date, and available by scrolling to earlier messages. Each sender can delete only their own messages.
- Signed-in shoppers can submit gift name, price, category, retailer link, description, personal recommendation, optional HTTPS photo URL, and tags. Suggestions are private to the submitter and owner while pending; submitters can see their own review status.
- The owner sees an in-app pending count and can approve or decline suggestions. The list refreshes every 15 seconds while the owner is signed in, on focus, and on request. No email or browser-notification service is configured.
- Approved ideas become public gift cards, appear in the quiz, and enter the shared coordination catalog. Declined ideas remain private to the submitter. Images use optional HTTPS URLs; uploaded files and image hosting are not part of this feature.
- The signed-in owner can add gifts directly from the Gift ideas panel. These are stored separately from shopper suggestions and immediately appear in the public list, quiz, and coordination catalog.
- The signed-in owner can edit any published gift, including original, approved, and owner-added gifts. Public gift overrides are stored in the database; shoppers and guests see the same updated details.
- The signed-in owner can mark favorites with the heart controls. Favorites are shared publicly and labeled as the list owner's picks; visitors cannot change them.
- The signed-in owner can add songs to the public playlist from the record player. Track metadata and HTTPS audio/source URLs are stored in the private database schema; anonymous visitors can read the playlist only through a narrow public RPC.
- Shoppers can undo their own Considering or Bought claim by marking the gift available again.
- The database serializes changes per gift and checks a revision number. Two shoppers acting on the same old availability cannot both succeed.
- All claim tables live in an unexposed private schema, with row-level security and no browser grants. The browser can call only the narrowly scoped public RPCs.
- Owner RPC responses contain no statuses, buyer identities, timestamps, counts, or revisions. The owner sees all gifts and unchanged quiz candidates; the app does not reveal claims through hidden or removed gifts. Shopper quiz results exclude gifts marked bought.
- This protects surprises in the application for the configured owner account. A database administrator can inspect database records, and a separately registered shopper account is treated as a shopper.

## Validation

```bash
npm run test:coordination
npm run test:browser
npm run test:quiz
npm run build
```

The database tests run the real migration in an embedded PostgreSQL engine with test auth roles. Browser tests use headless Microsoft Edge and mocked Google/Supabase redirects; they cover successful sign-in, cancellation and retry, account switching, and purchase privacy. They do not sign in to real Google accounts or alter a live database. Set up the live project before testing real Google sign-in and two-device coordination. Node 22.18+ is required for the test scripts.

References: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Google audience settings](https://support.google.com/cloud/answer/15549945), [database permissions](https://supabase.com/docs/guides/database/postgres/row-level-security), [database RPCs](https://supabase.com/docs/reference/javascript/rpc).
