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
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`)
await db.exec(await readFile(new URL('../supabase/migrations/202611140001_gift_coordination.sql', import.meta.url), 'utf8'))
for (const [id, email, confirmed] of [[owner, 'aweaver901@gmail.com', true], [first, 'one@example.com', true], [second, 'two@example.com', true], [unverified, 'unverified@example.com', false]]) {
  await db.query('insert into auth.users values ($1, $2, $3)', [id, email, confirmed ? new Date().toISOString() : null])
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
const denied = async (fn, code) => assert.rejects(fn, error => error.code === code)

// No role configuration must never accidentally expose purchase data.
await asUser(first, async () => assert.deepEqual(await snapshot(), { role: 'unconfigured', gifts: [] }))
await db.exec(await readFile(new URL('../supabase/setup-owner.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611140002_gift_ideas.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611140003_christmas_songs.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/202611150001_owner_gifts.sql', import.meta.url), 'utf8'))
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
  await denied(addChristmasSong, '42501')
  await denied(addOwnerGift, '42501')
})
await asUser(first, async () => {
  await denied(() => db.query('select * from merrylist_private.claims'), '42501')
  await denied(() => db.query("update merrylist_private.settings set owner_email = 'fake@example.com'"), '42501')
  await denied(() => db.query('select merrylist_private.viewer_role()'), '42501')
  await denied(() => db.query('select * from merrylist_private.christmas_songs'), '42501')
  await denied(addChristmasSong, '42501')
  await denied(() => db.query('select * from merrylist_private.owner_gifts'), '42501')
  await denied(addOwnerGift, '42501')
  const before = await snapshot()
  assert.equal(before.role, 'shopper')
  assert.equal(before.gifts.length, 23)
  await change('black-slides', 'considering', 0)
  const claim = (await snapshot()).gifts.find(gift => gift.giftId === 'black-slides')
  assert.deepEqual(claim, { giftId: 'black-slides', status: 'considering', mine: true, revision: 1 })
  assert.ok(!JSON.stringify(await snapshot()).includes('one@example.com'))
})
await asUser(second, async () => {
  const other = (await snapshot()).gifts.find(gift => gift.giftId === 'black-slides')
  assert.equal(other.mine, false)
  assert.equal(other.status, 'considering')
  // A simultaneous stale first claim loses. Even a refreshed visitor cannot steal it.
  await denied(() => change('black-slides', 'bought', 0), '40001')
  await denied(() => change('black-slides', 'bought', 1), '40001')
  await denied(() => change('black-slides', 'available', 1), '40001')
})
await asUser(owner, async () => {
  assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] })
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
  await denied(() => change('not-a-gift', 'bought', 0), '22023')
  await denied(() => change('black-slides', 'nonsense', 5), '22023')
})
await asUser(owner, async () => assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] }))
await asUser(owner, async () => {
  await denied(() => db.query('select * from merrylist_private.owner_gifts'), '42501')
  const ownerGiftId = (await addOwnerGift()).rows[0].id
  assert.match(ownerGiftId, /^[0-9a-f-]{36}$/)
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
console.log('Database checks passed: owner privacy, claims, gift review, direct owner gift publishing, and music management.')
