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
      return route.fulfill({ json: { role: email.startsWith('owner') ? 'owner' : 'shopper', gifts: gifts.map(gift => ({ giftId: gift.id, status: gift.id === 'black-slides' ? status : 'available', revision: gift.id === 'black-slides' ? revision : 0, mine: gift.id === 'black-slides' && status !== 'available' && mine })) } })
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
  // Deliberately injected statuses in the mocked owner response must be stripped.
  await expect(page.locator('.claim-badge')).toHaveCount(0)
  await expect(page.locator('.gift-card')).toHaveCount(23)
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
  console.log('Browser checks passed: Google redirect and cancellation, shopper claims, live refresh, offline protection, account switching, owner privacy, and mobile layout.')
} finally {
  await browser?.close()
  server.kill()
}
