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
const denied = async (fn, code) => assert.rejects(fn, error => error.code === code)

// No role configuration must never accidentally expose purchase data.
await asUser(first, async () => assert.deepEqual(await snapshot(), { role: 'unconfigured', gifts: [] }))
await db.exec(await readFile(new URL('../supabase/setup-owner.sql', import.meta.url), 'utf8'))
await asUser(null, () => denied(snapshot, '42501'))
await asUser(unverified, async () => {
  assert.deepEqual(await snapshot(), { role: 'unverified', gifts: [] })
  await denied(() => change('black-slides', 'bought', 0), '42501')
})
await asUser(first, async () => {
  await denied(() => db.query('select * from merrylist_private.claims'), '42501')
  await denied(() => db.query("update merrylist_private.settings set owner_email = 'fake@example.com'"), '42501')
  await denied(() => db.query('select merrylist_private.viewer_role()'), '42501')
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
})
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
// The owner stays protected after changing their email; identity is bound server-side.
await db.query('update auth.users set email = $1 where id = $2', ['owner-new@example.com', owner])
await asUser(owner, async () => assert.deepEqual(await snapshot(), { role: 'owner', gifts: [] }))
await db.close()
console.log('Database checks passed: owner privacy, unverified/anonymous denial, claim ownership, stale conflicts, purchase/release, and owner email changes.')
