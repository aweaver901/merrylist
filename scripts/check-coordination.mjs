import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const owner = '00000000-0000-0000-0000-000000000001'
const first = '00000000-0000-0000-0000-000000000002'
const second = '00000000-0000-0000-0000-000000000003'
const unverified = '00000000-0000-0000-0000-000000000004'
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`)
await db.exec(await readFile(new URL('../supabase/migrations/202611140001_gift_coordination.sql', import.meta.url), 'utf8'))
for (const [id, email, confirmed, name] of [[owner, 'aweaver901@gmail.com', true, 'Austin'], [first, 'one@example.com', true, 'First Shopper'], [second, 'two@example.com', true, 'Second Shopper'], [unverified, 'unverified@example.com', false, 'Unverified']]) {
  await db.query('insert into auth.users values ($1, $2, $3, jsonb_build_object(\'full_name\', $4::text))', [id, email, confirmed ? new Date().toISOString() : null, name])
}
await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'))
async function asUser(id, fn) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
  await db.exec(id ? 'set role authenticated' : 'set role anon')
  try { return await fn() } finally { await db.exec('reset role') }
}
const snapshot = async () => (await db.query('select public.gift_coordination() as result')).rows[0].result
const change = (gift, status, revision) => db.query('select public.set_gift_claim($1, $2, $3)', [gift, status, revision])
const giftIdeas = async () => (await db.query('select public.gift_ideas() as result')).rows[0].result
const approvedIdeas = async () => (await db.query('select public.approved_gift_ideas() as result')).rows[0].result
const christmasSongs = async () => (await db.query('select public.christmas_songs() as result')).rows[0].result
const addChristmasSong = (title = 'A new carol', audioUrl = 'https://example.com/new-carol.mp3') => db.query(
  'select public.add_christmas_song($1, $2, $3, $4) as id',
  [title, 'A local choir', audioUrl, 'https://example.com/source'],
)
const addOwnerGift = (name = 'A gift added by the owner', link = 'https://example.com/owner-gift') => db.query(
  'select public.add_owner_gift($1, $2, $3, $4, $5, $6, $7, $8) as id',
  [name, 45, 'Other', link, 'A gift added directly by the owner.', null, 'A thoughtful addition.', ['owner pick']],
)
const submitIdea = (name = 'A thoughtful new gift') => db.query(
  `select public.submit_gift_idea($1, $2, $3, $4, $5, $6, $7, $8) as id`,
  [name, 34.5, 'Books', 'https://example.com/gift', 'A useful book.', null, 'A lovely idea.', ['book', 'thoughtful']],
)
const reviewIdea = (id, status) => db.query('select public.review_gift_idea($1, $2)', [id, status])
const getChatMessages = async () => (await db.query('select public.get_chat_messages() as result')).rows[0].result
const sendChatMessage = message => db.query('select public.send_chat_message($1) as id', [message])
const deleteChatMessage = id => db.query('select public.delete_chat_message($1)', [id])
const getGiftPublicSettings = async () => (await db.query('select public.gift_public_settings() as result')).rows[0].result
const getSpotifyPlaylistSetting = async () => (await db.query('select public.spotify_playlist_setting() as result')).rows[0].result
const setSpotifyPlaylist = (id, name) => db.query('select public.set_spotify_playlist($1, $2)', [id, name])
const saveGiftDetails = (giftId, name = 'Updated gift') => db.query(
  'select public.save_gift_details($1, $2, $3, $4, $5, $6, $7, $8, $9)',
  [giftId, name, 56.75, 'Books', 'https://example.com/updated', 'Updated description.', '/gifts/the-book.jpg', 'Updated note.', ['updated', 'test']],
)
const setOwnerGiftFavorite = (giftId, favorite) => db.query('select public.set_owner_gift_favorite($1, $2)', [giftId, favorite])
const denied = async (fn, code) => assert.rejects(fn, error => error.code === code)
let firstChatMessageId

// No role configuration must never accidentally expose purchase data.
await asUser(first, async () => assert.deepEqual(await snapshot(), { role: 'unconfigured', gifts: [] }))
await db.exec(await readFile(new URL('../supabase/setup-owner.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611140002_gift_ideas.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611140003_christmas_songs.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611150001_owner_gifts.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611150002_shopper_chat_and_purchase_names.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611170001_gift_editing_and_favorites.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611170002_spotify_playlist.sql', import.meta.url), 'utf8'))
await asUser(null, () => denied(snapshot, '42501'))
await asUser(unverified, async () => {
  assert.deepEqual(await snapshot(), { role: 'unverified', gifts: [] })
  await denied(() => change('black-slides', 'bought', 0), '42501')
  await denied(submitIdea, '42501')
  await denied(addChristmasSong, '42501')
  await denied(addOwnerGift, '42501')
})
await asUser(null, async () => {
  const songs = await christmasSongs()
  assert.equal(songs.length, 6)
  assert.equal(songs[0].title, 'Jingle Bells')
  assert.deepEqual(await getGiftPublicSettings(), { overrides: [], favoriteGiftIds: [] })
  assert.equal(await getSpotifyPlaylistSetting(), null)
  await denied(addChristmasSong, '42501')
  await denied(addOwnerGift, '42501')
  await denied(() => setSpotifyPlaylist('1234567890123456789012', 'Public playlist'), '42501')
  await denied(() => saveGiftDetails('black-slides'), '42501')
  await denied(() => setOwnerGiftFavorite('black-slides', true), '42501')
  await denied(getChatMessages, '42501')
  await denied(() => sendChatMessage('No guest messages'), '42501')
})
await asUser(first, async () => {
  await denied(() => db.query('select * from merrylist_private.claims'), '42501')
  await denied(() => db.query("update merrylist_private.settings set owner_email = 'fake@example.com'"), '42501')
  await denied(() => db.query('select merrylist_private.viewer_role()'), '42501')
  await denied(() => db.query('select * from merrylist_private.christmas_songs'), '42501')
  await denied(() => db.query('select * from merrylist_private.gift_overrides'), '42501')
  await denied(() => db.query('select * from merrylist_private.owner_favorite_gifts'), '42501')
  await denied(addChristmasSong, '42501')
  await denied(() => db.query('select * from merrylist_private.owner_gifts'), '42501')
  await denied(addOwnerGift, '42501')
  await denied(() => saveGiftDetails('black-slides'), '42501')
  await denied(() => setOwnerGiftFavorite('black-slides', true), '42501')
  const before = await snapshot()
  assert.equal(before.role, 'shopper')
  assert.equal(before.gifts.length, 23)
  await change('black-slides', 'considering', 0)
  const claim = (await snapshot()).gifts.find(gift => gift.giftId === 'black-slides')
  assert.deepEqual(claim, { giftId: 'black-slides', status: 'considering', mine: true, revision: 1, buyerName: null })
  assert.ok(!JSON.stringify(await snapshot()).includes('one@example.com'))
  const realtimeClaim = (await db.query("select status, buyer_name from public.gift_claim_updates where gift_id = 'black-slides'")).rows[0]
  assert.deepEqual(realtimeClaim, { status: 'considering', buyer_name: null })
  firstChatMessageId = (await sendChatMessage('Hello from the first shopper')).rows[0].id
  const messages = await getChatMessages()
  assert.deepEqual(messages, [{ id: Number(firstChatMessageId), senderName: 'First Shopper', message: 'Hello from the first shopper', createdAt: messages[0].createdAt, mine: true }])
  await denied(() => sendChatMessage('   '), '22023')
  await denied(() => sendChatMessage('x'.repeat(2001)), '22023')
})
await asUser(second, async () => {
  const other = (await snapshot()).gifts.find(gift => gift.giftId === 'black-slides')
  assert.equal(other.mine, false)
  assert.equal(other.status, 'considering')
  assert.equal(other.buyerName, null)
  const messages = await getChatMessages()
  assert.equal(messages[0].senderName, 'First Shopper')
  assert.equal(messages[0].mine, false)
  await denied(() => deleteChatMessage(firstChatMessageId), '40001')
  await sendChatMessage('Hello back')
  // A simultaneous stale first claim loses. Even a refreshed visitor cannot steal it.
  await denied(() => change('black-slides', 'bought', 0), '40001')
  await denied(() => change('black-slides', 'bought', 1), '40001')
  await denied(() => change('black-slides', 'available', 1), '40001')
})
await asUser(owner, async () => {
  assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] })
  await saveGiftDetails('black-slides', 'A Better Book')
  await setOwnerGiftFavorite('black-slides', true)
  let settings = await getGiftPublicSettings()
  assert.deepEqual(settings.favoriteGiftIds, ['black-slides'])
  assert.deepEqual(settings.overrides[0], {
    id: 'black-slides',
    name: 'A Better Book',
    cost: 56.75,
    theme: 'Books',
    link: 'https://example.com/updated',
    description: 'Updated description.',
    image: '/gifts/the-book.jpg',
    note: 'Updated note.',
    tags: ['updated', 'test'],
  })
  await setSpotifyPlaylist('1234567890123456789012', 'Holiday Playlist')
  assert.deepEqual(await getSpotifyPlaylistSetting(), { id: '1234567890123456789012', name: 'Holiday Playlist' })
  await denied(() => setSpotifyPlaylist('invalid-id', 'Not a valid playlist'), '22023')
  await denied(() => setSpotifyPlaylist('1234567890123456789012', ''), '22023')
  await denied(() => saveGiftDetails('not-a-gift'), '22023')
  await denied(() => saveGiftDetails('black-slides', ''), '22023')
  assert.deepEqual((await db.query('select gift_id from public.gift_claim_updates')).rows, [])
  await denied(getChatMessages, '42501')
  await denied(() => sendChatMessage('Owner is excluded'), '42501')
  await denied(() => change('black-slides', 'available', 1), '42501')
  await denied(() => db.query('select * from merrylist_private.claims'), '42501')
  await denied(() => db.query('select * from merrylist_private.gift_ideas'), '42501')
  await denied(() => db.query('select * from merrylist_private.christmas_songs'), '42501')
  await denied(submitIdea, '42501')
  const newSongId = (await addChristmasSong()).rows[0].id
  assert.match(newSongId, /^[0-9a-f-]{36}$/)
  const songs = await christmasSongs()
  assert.equal(songs.length, 7)
  assert.equal(songs[6].title, 'A new carol')
  await denied(() => addChristmasSong('', 'https://example.com/empty.mp3'), '22023')
  await denied(() => addChristmasSong('Unsafe audio', 'javascript:alert(1)'), '22023')
  await denied(addChristmasSong, '23505')
})
await asUser(null, async () => {
  assert.deepEqual(await getSpotifyPlaylistSetting(), { id: '1234567890123456789012', name: 'Holiday Playlist' })
})
await asUser(owner, async () => {
  await setSpotifyPlaylist(null, null)
  assert.equal(await getSpotifyPlaylistSetting(), null)
})
let firstIdeaId
await asUser(first, async () => {
  firstIdeaId = (await submitIdea()).rows[0].id
  const own = await giftIdeas()
  assert.equal(own.role, 'shopper')
  assert.equal(own.suggestions.length, 1)
  assert.equal(own.suggestions[0].status, 'pending')
  assert.ok(!JSON.stringify(own).includes('one@example.com'))
  await denied(() => db.query('select * from merrylist_private.gift_ideas'), '42501')
  await denied(() => reviewIdea(firstIdeaId, 'approved'), '42501')
  await denied(() => submitIdea(''), '22023')
})
await asUser(second, async () => {
  assert.deepEqual(await giftIdeas(), { role: 'shopper', suggestions: [] })
  assert.deepEqual(await approvedIdeas(), [])
})
await asUser(owner, async () => {
  const inbox = await giftIdeas()
  assert.equal(inbox.role, 'owner')
  assert.equal(inbox.suggestions.length, 1)
  assert.equal(inbox.suggestions[0].gift.name, 'A thoughtful new gift')
  await denied(() => reviewIdea(firstIdeaId, 'pending'), '22023')
  await reviewIdea(firstIdeaId, 'approved')
  await saveGiftDetails(`idea-${firstIdeaId}`, 'Updated shopper idea')
  await setOwnerGiftFavorite(`idea-${firstIdeaId}`, true)
  await denied(() => reviewIdea(firstIdeaId, 'denied'), '40001')
  assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] })
})
await asUser(null, async () => {
  const published = await approvedIdeas()
  assert.equal(published.length, 1)
  assert.equal(published[0].id, `idea-${firstIdeaId}`)
  assert.equal(published[0].name, 'A thoughtful new gift')
  await denied(giftIdeas, '42501')
})
await asUser(first, async () => {
  const claimCatalog = (await snapshot()).gifts
  assert.equal(claimCatalog.length, 24)
  assert.ok(claimCatalog.some(gift => gift.giftId === `idea-${firstIdeaId}`))
  assert.equal((await giftIdeas()).suggestions[0].status, 'approved')
})
let secondIdeaId
await asUser(second, async () => { secondIdeaId = (await submitIdea('A second gift idea')).rows[0].id })
await asUser(owner, async () => {
  assert.equal((await giftIdeas()).suggestions.length, 1)
  assert.equal((await giftIdeas()).suggestions[0].gift.name, 'A second gift idea')
  await reviewIdea(secondIdeaId, 'denied')
})
await asUser(second, async () => assert.equal((await giftIdeas()).suggestions[0].status, 'denied'))
await asUser(first, async () => {
  await change('black-slides', 'bought', 1)
  await denied(() => change('black-slides', 'considering', 1), '40001')
  await change('black-slides', 'considering', 2)
  await change('black-slides', 'available', 3)
})
await asUser(second, async () => {
  await change('black-slides', 'bought', 4)
  const boughtClaim = (await snapshot()).gifts.find(gift => gift.giftId === 'black-slides')
  assert.deepEqual(boughtClaim, { giftId: 'black-slides', status: 'bought', mine: true, revision: 5, buyerName: 'Second Shopper' })
  assert.deepEqual((await db.query("select status, buyer_name from public.gift_claim_updates where gift_id = 'black-slides'")).rows[0], { status: 'bought', buyer_name: 'Second Shopper' })
  await denied(() => change('not-a-gift', 'bought', 0), '22023')
  await denied(() => change('black-slides', 'nonsense', 5), '22023')
})
await asUser(first, async () => {
  const messages = await getChatMessages()
  await deleteChatMessage(firstChatMessageId)
  assert.ok(!(await getChatMessages()).some(message => message.id === Number(firstChatMessageId)))
  assert.ok(messages.some(message => message.message === 'Hello from the first shopper'))
})
await asUser(owner, async () => assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] }))
await asUser(owner, async () => {
  await denied(() => db.query('select * from merrylist_private.owner_gifts'), '42501')
  const ownerGiftId = (await addOwnerGift()).rows[0].id
  assert.match(ownerGiftId, /^[0-9a-f-]{36}$/)
  await saveGiftDetails(`owner-${ownerGiftId}`, 'Updated owner gift')
  await setOwnerGiftFavorite(`owner-${ownerGiftId}`, true)
  await denied(() => addOwnerGift('Invalid gift', 'javascript:alert(1)'), '22023')
  const published = await approvedIdeas()
  const addedGift = published.find(gift => gift.id === `owner-${ownerGiftId}`)
  assert.equal(addedGift.name, 'A gift added by the owner')
  assert.equal(addedGift.theme, 'Other')
})
await asUser(null, async () => {
  const published = await approvedIdeas()
  assert.equal(published.length, 2)
  assert.ok(published.some(gift => gift.id.startsWith('owner-')))
  const settings = await getGiftPublicSettings()
  assert.equal(settings.overrides[0].name, 'A Better Book')
  assert.ok(settings.overrides.some(gift => gift.id.startsWith('idea-') && gift.name === 'Updated shopper idea'))
  assert.ok(settings.overrides.some(gift => gift.id.startsWith('owner-') && gift.name === 'Updated owner gift'))
  assert.ok(settings.favoriteGiftIds.includes('idea-' + firstIdeaId))
  assert.ok(settings.favoriteGiftIds.some(id => id.startsWith('owner-')))
})
await asUser(owner, async () => {
  await setOwnerGiftFavorite('black-slides', false)
  const favorites = (await getGiftPublicSettings()).favoriteGiftIds
  assert.equal(favorites.length, 2)
  assert.ok(!favorites.includes('black-slides'))
})
await asUser(first, async () => {
  const gifts = (await snapshot()).gifts
  assert.equal(gifts.length, 25)
  assert.ok(gifts.some(gift => gift.giftId.startsWith('owner-')))
})
// The owner stays protected after changing their email; identity is bound server-side.
await db.query('update auth.users set email = $1 where id = $2', ['owner-new@example.com', owner])
await asUser(owner, async () => assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] }))
await db.close()
console.log('Database checks passed: purchase privacy, secured claim updates, shopper chat, gift review, owner gift publishing, music management, and Spotify playlist permissions.')
