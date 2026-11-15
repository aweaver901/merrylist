import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

const origin = 'http://127.0.0.1:4175'
const source = await readFile(new URL('../src/data/gifts.ts', import.meta.url), 'utf8')
const { gifts } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: new URL('..', import.meta.url), windowsHide: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'https://merrylist-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key' },
  stdio: 'ignore',
})
let browser
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(origin)).ok) break } catch {}
    if (attempt === 59) throw new Error('Test server did not start')
    await delay(250)
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', error => failures.push(error.message))
  let email = ''
  let status = 'available'
  let revision = 0
  let mine = true
  let offline = false
  const suggestions = []
  const approvedIdeas = []
  let nextIdeaId = 0
  let nextEmail = 'shopper@example.com'
  let cancelSignIn = true
  let oauthRequests = 0
  const user = () => ({ id: email.startsWith('owner') ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002', aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {} })
  await page.route('https://merrylist-test.supabase.co/**', async route => {
    const url = route.request().url()
    if (url.includes('/authorize')) {
      const authorizeUrl = new URL(url)
      expect(authorizeUrl.searchParams.get('provider')).toBe('google')
      expect(authorizeUrl.searchParams.get('redirect_to')).toBe(origin + '/')
      expect(authorizeUrl.searchParams.get('prompt')).toBe('select_account')
      oauthRequests++
      if (cancelSignIn) return route.fulfill({ status: 302, headers: { location: origin + '/#error=access_denied&error_description=User+cancelled' } })
      email = nextEmail
      const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user().id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-signature'].join('.')
      const hash = new URLSearchParams({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: '3600' })
      return route.fulfill({ status: 302, headers: { location: origin + '/#' + hash } })
    }
    if (url.includes('/logout')) return route.fulfill({ status: 204 })
    if (url.includes('/user')) return route.fulfill({ json: user() })
    if (url.includes('/rpc/gift_coordination')) {
      if (offline) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      return route.fulfill({ json: { role: email.startsWith('owner') ? 'owner' : 'shopper', gifts: [...gifts, ...approvedIdeas].map(gift => ({ giftId: gift.id, status: gift.id === 'black-slides' ? status : 'available', revision: gift.id === 'black-slides' ? revision : 0, mine: gift.id === 'black-slides' && status !== 'available' && mine })) } })
    }
    if (url.includes('/rpc/approved_gift_ideas')) return route.fulfill({ json: approvedIdeas })
    if (url.includes('/rpc/gift_ideas')) {
      const owner = email.startsWith('owner')
      return route.fulfill({ json: { role: owner ? 'owner' : 'shopper', suggestions: suggestions.filter(idea => owner ? idea.status === 'pending' : idea.submitter === email).map(({ submitter, ...idea }) => idea) } })
    }
    if (url.includes('/rpc/submit_gift_idea')) {
      const input = route.request().postDataJSON()
      const id = `00000000-0000-0000-0000-${String(++nextIdeaId).padStart(12, '0')}`
      suggestions.push({
        id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        submitter: email,
        gift: { id: `idea-${id}`, name: input.p_name, cost: input.p_cost, theme: input.p_theme, link: input.p_link, description: input.p_description, image: input.p_image_url, note: input.p_note, tags: input.p_tags },
      })
      return route.fulfill({ json: id })
    }
    if (url.includes('/rpc/review_gift_idea')) {
      const input = route.request().postDataJSON()
      const idea = suggestions.find(candidate => candidate.id === input.p_id)
      if (!idea || idea.status !== 'pending') return route.fulfill({ status: 409, json: { message: 'No longer pending', code: '40001' } })
      idea.status = input.p_status
      if (idea.status === 'approved') approvedIdeas.push(idea.gift)
      return route.fulfill({ json: null })
    }
    if (url.includes('/rpc/set_gift_claim')) {
      const input = route.request().postDataJSON()
      if (input.p_revision !== revision || !mine) return route.fulfill({ status: 409, json: { message: 'Changed', code: '40001' } })
      status = input.p_status; revision++
      return route.fulfill({ json: null })
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  await page.goto(origin)
  await expect(page.locator('.gift-card')).toHaveCount(23)
  await expect(page.locator('.claim-badge')).toHaveCount(0)
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Christmas record player' }).click()
  await expect(page.getByLabel('Choose a carol').locator('option')).toHaveCount(8)
  await page.getByRole('button', { name: 'Play Christmas music' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Playing · Jingle Bells')
  const volumeControl = page.getByRole('slider', { name: 'Music volume' })
  const initialVolume = await volumeControl.inputValue()
  await volumeControl.press('ArrowRight')
  expect(await volumeControl.inputValue()).not.toBe(initialVolume)
  await page.getByLabel('Choose a carol').selectOption('4')
  await expect(page.locator('.record-player-status')).toHaveText('Playing · Silent Night')
  await page.getByRole('button', { name: 'Next Christmas song' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Playing · O Christmas Tree')
  await page.getByRole('button', { name: 'Pause Christmas music' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Paused · O Christmas Tree')
  await page.getByRole('button', { name: 'Next Christmas song' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Paused · The First Noel')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Google sign-in was canceled')
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeEnabled()
  expect(page.url()).not.toContain('error_description')
  cancelSignIn = false
  const signIn = async selectedEmail => {
    nextEmail = selectedEmail
    await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  }
  await signIn('shopper@example.com')
  await expect(page.getByText('Up to date', { exact: true })).toBeVisible()
  await expect(page.locator('.claim-available')).toHaveCount(23)
  const suggestGift = async (name, price) => {
    await page.getByRole('button', { name: 'Suggest a gift' }).click()
    await page.getByLabel('Gift name').fill(name)
    await page.getByLabel('Price (USD)').fill(String(price))
    await page.getByLabel('Category').selectOption('Books')
    await page.getByLabel('Retailer link').fill('https://example.com/gift')
    await page.getByLabel('Short description').fill('A thoughtful recommendation.')
    await page.getByLabel('Why do you recommend it?').fill('It would be a lovely addition.')
    await page.getByLabel('Tags (comma-separated, optional)').fill('thoughtful, books')
    await page.getByRole('button', { name: 'Send for review' }).click()
    await expect(page.getByText('Your idea was sent to Austin for review.')).toBeVisible()
  }
  await suggestGift('A Thoughtful Book', 34.5)
  await suggestGift('A Second Book', 25)
  await expect(page.getByText('Your suggestions (2)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View Draco Slides', exact: true }).click()
  await page.getByRole('button', { name: 'I’m considering this', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('You’re considering this', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'I bought this', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('You bought this', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Release my claim', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('Available to gift', { exact: true })).toBeVisible()
  // Another visitor's update arrives through the normal refresh mechanism.
  status = 'considering'; mine = false; revision++
  await expect(page.locator('.gift-modal').getByText('Someone is considering this', { exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('button', { name: 'I bought this', exact: true })).toHaveCount(0)
  await expect(page.locator('.gift-modal').getByRole('link', { name: 'See the gift' })).toHaveCount(0)
  await page.locator('.gift-modal').getByRole('button', { name: 'Close', exact: true }).click()
  // Offline state must not imply that a gift is free to claim.
  offline = true
  await page.getByRole('button', { name: 'Refresh status' }).click()
  await expect(page.getByText('Connection needs attention', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View Draco Slides', exact: true }).click()
  await expect(page.getByRole('button', { name: 'I bought this', exact: true })).toHaveCount(0)
  await page.locator('.gift-modal').getByRole('button', { name: 'Close', exact: true }).click()
  offline = false
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.locator('.claim-badge')).toHaveCount(0)
  await signIn('owner@example.com')
  await expect(page.getByText('Your surprises are safe', { exact: true })).toBeVisible()
  await expect(page.locator('.idea-count')).toHaveText('2 pending')
  await page.locator('.gift-idea-card').filter({ hasText: 'A Thoughtful Book' }).getByRole('button', { name: 'Approve' }).click()
  await expect(page.locator('.gift-card')).toHaveCount(24)
  await expect(page.getByRole('button', { name: 'A Thoughtful Book', exact: true })).toBeVisible()
  await page.locator('.gift-idea-card').filter({ hasText: 'A Second Book' }).getByRole('button', { name: 'Decline' }).click()
  await expect(page.locator('.idea-count')).toHaveText('0 pending')
  // Deliberately injected statuses in the mocked owner response must be stripped.
  await expect(page.locator('.claim-badge')).toHaveCount(0)
  await expect(page.locator('.gift-card')).toHaveCount(24)
  await page.getByRole('button', { name: 'View Draco Slides', exact: true }).click()
  await expect(page.locator('.claim-controls')).toHaveCount(0)
  await expect(page.locator('.gift-modal').getByRole('link', { name: 'See the gift' })).toBeVisible()
  await page.locator('.gift-modal').getByRole('button', { name: 'Close', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#gift-coordination').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(failures).toEqual([])
  expect(oauthRequests).toBe(3)
  await context.close()
  console.log('Browser checks passed: Christmas audio controls, Google sign-in, gift idea review/publication, shopper claims, offline protection, owner privacy, and mobile layout.')
} finally {
  await browser?.close()
  server.kill()
}
