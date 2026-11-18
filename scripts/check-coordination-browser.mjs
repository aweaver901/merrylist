import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createHash } from 'node:crypto'

const origin = 'http://127.0.0.1:4175'
const source = await readFile(new URL('../src/data/gifts.ts', import.meta.url), 'utf8')
const { gifts } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: new URL('..', import.meta.url), windowsHide: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'https://merrylist-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key', VITE_SPOTIFY_CLIENT_ID: 'test-spotify-client-id' },
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
  const audioRequests = []
  const sampleRate = 8000
  const audioDataLength = sampleRate * 60 * 2
  const wav = Buffer.alloc(44 + audioDataLength)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + audioDataLength, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(audioDataLength, 40)
  await page.route('https://upload.wikimedia.org/**', async route => {
    audioRequests.push(route.request().url())
    await route.fulfill({ contentType: 'audio/wav', body: wav })
  })
  await page.route('https://accounts.spotify.com/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/authorize') {
      expect(url.searchParams.get('client_id')).toBe('test-spotify-client-id')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('redirect_uri')).toBe(origin + '/')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('scope')).toContain('playlist-read-private')
      expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
      spotifyCodeChallenge = url.searchParams.get('code_challenge')
      const callback = new URL(url.searchParams.get('redirect_uri'))
      callback.searchParams.set('code', 'test-authorization-code')
      callback.searchParams.set('state', invalidSpotifyStateOnce ? 'wrong-state' : url.searchParams.get('state'))
      invalidSpotifyStateOnce = false
      spotifyAuthorizeRequests++
      return route.fulfill({ status: 302, headers: { location: callback.toString() } })
    }
    if (url.pathname === '/api/token') {
      spotifyTokenRequests++
      const body = new URLSearchParams(route.request().postData() ?? '')
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('client_id')).toBe('test-spotify-client-id')
      expect(body.get('redirect_uri')).toBe(origin + '/')
      expect(body.get('code_verifier')).toMatch(/^[A-Za-z0-9]{64}$/)
      expect(createHash('sha256').update(body.get('code_verifier')).digest('base64url')).toBe(spotifyCodeChallenge)
      expect(body.has('client_secret')).toBe(false)
      return route.fulfill({ json: { access_token: 'test-spotify-access-token', token_type: 'Bearer', expires_in: 3600 } })
    }
    throw new Error(`Unexpected Spotify Accounts request: ${url}`)
  })
  await page.route('https://api.spotify.com/v1/me/playlists**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer test-spotify-access-token')
    const url = new URL(route.request().url())
    expect(url.searchParams.get('limit')).toBe('50')
    spotifyPlaylistRequests++
    if (url.searchParams.get('offset') === '0') {
      return route.fulfill({ json: {
        items: [
          { id: '1234567890123456789012', name: 'Merry Christmas', public: true, tracks: { total: 12 } },
          { id: 'abcdefghijklmnopqrstuv', name: 'Private playlist', public: false, tracks: { total: 4 } },
        ],
        next: 'https://api.spotify.com/v1/me/playlists?offset=50&limit=50',
      } })
    }
    expect(url.searchParams.get('offset')).toBe('50')
    return route.fulfill({ json: {
      items: [{ id: 'ABCDEFabcdef1234567890', name: 'Another public list', public: true, tracks: { total: 8 } }],
      next: null,
    } })
  })
  await page.route('https://open.spotify.com/embed/iframe-api/v1', async route => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.onSpotifyIframeApiReady({createController(element, options, callback) {
        const iframe = document.createElement('iframe')
        iframe.title = 'Spotify playlist ' + options.uri
        element.append(iframe)
        callback({pause() { window.__spotifyPauseCount = (window.__spotifyPauseCount || 0) + 1 }})
      }})`,
    })
  })
  let email = ''
  let status = 'available'
  let revision = 0
  let mine = true
  let offline = false
  let musicUnavailable = true
  const suggestions = []
  const approvedIdeas = []
  const addedSongs = []
  const chatMessages = []
  const giftOverrides = []
  const ownerFavorites = new Set()
  let spotifyPlaylistSetting = null
  let invalidSpotifyStateOnce = true
  let spotifyAuthorizeRequests = 0
  let spotifyTokenRequests = 0
  let spotifyCodeChallenge = ''
  let spotifyPlaylistRequests = 0
  let spotifyPauseCount = 0
  for (let index = 0; index < 12; index++) {
    chatMessages.push({ id: index + 1, sender: 'history@example.com', senderName: 'History Shopper', message: `Earlier message ${index + 1}`, createdAt: new Date(Date.now() - 86400000).toISOString() })
  }
  let nextIdeaId = 0
  let nextOwnerGiftId = 0
  let nextEmail = 'shopper@example.com'
  let cancelSignIn = true
  let oauthRequests = 0
  let failNextSuggestion = false
  const user = () => ({ id: email.startsWith('owner') ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002', aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: { full_name: email.startsWith('owner') ? 'Owner Example' : 'Shopper Example' } })
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
      return route.fulfill({ json: { role: email.startsWith('owner') ? 'owner' : 'shopper', gifts: [...gifts, ...approvedIdeas].map(gift => {
        const giftStatus = gift.id === 'black-slides' ? status : 'available'
        const giftMine = gift.id === 'black-slides' && giftStatus !== 'available' && mine
        return { giftId: gift.id, status: giftStatus, revision: gift.id === 'black-slides' ? revision : 0, mine: giftMine, buyerName: giftStatus === 'bought' ? (giftMine ? 'Shopper Example' : 'Jordan Shopper') : null }
      }) } })
    }
    if (url.includes('/rpc/approved_gift_ideas')) return route.fulfill({ json: approvedIdeas })
    if (url.includes('/rpc/gift_public_settings')) return route.fulfill({ json: { overrides: giftOverrides, favoriteGiftIds: [...ownerFavorites] } })
    if (url.includes('/rpc/spotify_playlist_setting')) return route.fulfill({ json: spotifyPlaylistSetting })
    if (url.includes('/rpc/set_spotify_playlist')) {
      if (!email.startsWith('owner')) return route.fulfill({ status: 403, json: { message: 'Owner access required' } })
      const input = route.request().postDataJSON()
      spotifyPlaylistSetting = input.p_playlist_id === null ? null : { id: input.p_playlist_id, name: input.p_playlist_name }
      return route.fulfill({ json: null })
    }
    if (url.includes('/rpc/save_gift_details')) {
      if (!email.startsWith('owner')) return route.fulfill({ status: 403, json: { message: 'Owner access required' } })
      const input = route.request().postDataJSON()
      const updatedGift = { id: input.p_gift_id, name: input.p_name, cost: input.p_cost, theme: input.p_theme, link: input.p_link, description: input.p_description, image: input.p_image_url, note: input.p_note, tags: input.p_tags }
      const index = giftOverrides.findIndex(gift => gift.id === input.p_gift_id)
      if (index < 0) giftOverrides.push(updatedGift)
      else giftOverrides[index] = updatedGift
      return route.fulfill({ json: null })
    }
    if (url.includes('/rpc/set_owner_gift_favorite')) {
      if (!email.startsWith('owner')) return route.fulfill({ status: 403, json: { message: 'Owner access required' } })
      const input = route.request().postDataJSON()
      if (input.p_favorite) ownerFavorites.add(input.p_gift_id)
      else ownerFavorites.delete(input.p_gift_id)
      return route.fulfill({ json: null })
    }
    if (url.includes('/rpc/get_chat_messages')) return route.fulfill({ json: chatMessages.map(message => ({ ...message, mine: message.sender === email })) })
    if (url.includes('/rpc/send_chat_message')) {
      const input = route.request().postDataJSON()
      chatMessages.push({ id: chatMessages.length + 1, sender: email, senderName: user().user_metadata.full_name, message: input.p_message, createdAt: new Date().toISOString() })
      return route.fulfill({ json: chatMessages.length })
    }
    if (url.includes('/rpc/delete_chat_message')) {
      const input = route.request().postDataJSON()
      const index = chatMessages.findIndex(message => message.id === input.p_id && message.sender === email)
      if (index < 0) return route.fulfill({ status: 409, json: { message: 'Message not found' } })
      chatMessages.splice(index, 1)
      return route.fulfill({ json: null })
    }
    if (url.includes('/rpc/christmas_songs')) {
      if (musicUnavailable) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      return route.fulfill({ json: addedSongs })
    }
    if (url.includes('/rpc/add_christmas_song')) {
      if (!email.startsWith('owner')) return route.fulfill({ status: 403, json: { message: 'Owner access required' } })
      const input = route.request().postDataJSON()
      const id = `song-${addedSongs.length + 7}`
      addedSongs.push({ id, title: input.p_title, artist: input.p_artist, audioUrl: input.p_audio_url, sourceUrl: input.p_source_url })
      musicUnavailable = false
      return route.fulfill({ json: id })
    }
    if (url.includes('/rpc/add_owner_gift')) {
      if (!email.startsWith('owner')) return route.fulfill({ status: 403, json: { message: 'Owner access required' } })
      const input = route.request().postDataJSON()
      const id = `00000000-0000-0000-0000-${String(++nextOwnerGiftId).padStart(12, '0')}`
      approvedIdeas.push({
        id: `owner-${id}`,
        name: input.p_name,
        cost: input.p_cost,
        theme: input.p_theme,
        link: input.p_link,
        description: input.p_description,
        image: input.p_image_url ?? '',
        note: input.p_note,
        tags: input.p_tags,
      })
      return route.fulfill({ json: id })
    }
    if (url.includes('/rpc/gift_ideas')) {
      const owner = email.startsWith('owner')
      return route.fulfill({ json: { role: owner ? 'owner' : 'shopper', suggestions: suggestions.filter(idea => owner ? idea.status === 'pending' : idea.submitter === email).map(({ submitter, ...idea }) => idea) } })
    }
    if (url.includes('/rpc/submit_gift_idea')) {
      if (failNextSuggestion) {
        failNextSuggestion = false
        return route.fulfill({ status: 400, json: { message: 'Suggestion rejected for the test.' } })
      }
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
  expect(await page.locator('.hero-caption').evaluate(element => getComputedStyle(element).zIndex)).toBe('3')
  const hiddenLabelStyle = await page.locator('.record-player-open .visually-hidden').evaluate(element => {
    const style = getComputedStyle(element)
    return { position: style.position, width: style.width, height: style.height, clip: style.clip }
  })
  expect(hiddenLabelStyle).toMatchObject({ position: 'absolute', width: '1px', height: '1px' })
  expect(hiddenLabelStyle.clip).toContain('0px')
  const viewport = page.viewportSize()
  const dragHandle = page.getByRole('button', { name: /Move record player/ })
  const handleBounds = await dragHandle.boundingBox()
  await page.mouse.move(handleBounds.x + handleBounds.width / 2, handleBounds.y + handleBounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width - 90, viewport.height / 2, { steps: 6 })
  await page.mouse.up()
  const rightDock = await page.locator('.record-player').boundingBox()
  expect(rightDock.x).toBeGreaterThan(viewport.width / 2)
  expect(Math.abs(rightDock.y + rightDock.height / 2 - viewport.height / 2)).toBeLessThan(2)
  await dragHandle.focus()
  await dragHandle.press('ArrowLeft')
  const leftDock = await page.locator('.record-player').boundingBox()
  expect(leftDock.x).toBeLessThan(viewport.width / 2)
  await dragHandle.press('ArrowUp')
  expect((await page.locator('.record-player').boundingBox()).y).toBeLessThan(viewport.height / 2)
  await dragHandle.press('ArrowDown')
  expect((await page.locator('.record-player').boundingBox()).y).toBeGreaterThan(viewport.height / 2)
  await page.getByRole('button', { name: 'Open Christmas record player' }).click()
  const assertPlayerInsideViewport = async () => {
    await page.waitForFunction(() => {
      const bounds = document.querySelector('.record-player')?.getBoundingClientRect()
      return bounds && bounds.left >= 0 && bounds.top >= 0 && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight
    }, null, { timeout: 3000 })
  }
  await assertPlayerInsideViewport()
  await page.setViewportSize({ width: 320, height: 480 })
  await page.getByRole('button', { name: /Move record player/ }).focus()
  await page.getByRole('button', { name: /Move record player/ }).press('ArrowRight')
  await assertPlayerInsideViewport()
  await expect(page.getByRole('button', { name: 'Minimize record player' })).toBeVisible()
  await page.setViewportSize(viewport)
  await assertPlayerInsideViewport()
  await expect(page.getByLabel('Choose a carol').locator('option')).toHaveCount(6)
  await expect(page.locator('.action-error')).toContainText('The online playlist is unavailable')
  await page.getByRole('button', { name: 'Play Christmas music' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Playing · Jingle Bells')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.record-player-status')).toHaveText('Paused · Jingle Bells')
  await page.evaluate(() => { delete document.visibilityState })
  await page.getByRole('button', { name: 'Play Christmas music' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Playing · Jingle Bells')
  expect(audioRequests.some(url => url.includes('Jingle_Bells'))).toBe(true)
  const volumeControl = page.getByRole('slider', { name: 'Music volume' })
  const initialVolume = await volumeControl.inputValue()
  await volumeControl.press('ArrowRight')
  expect(await volumeControl.inputValue()).not.toBe(initialVolume)
  await page.getByLabel('Choose a carol').selectOption('4')
  await expect(page.locator('.record-player-status')).toHaveText('Playing · Silent Night')
  expect(audioRequests.some(url => url.includes('Silent_Night'))).toBe(true)
  await page.getByRole('button', { name: 'Next Christmas song' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Playing · O Christmas Tree')
  expect(audioRequests.some(url => url.includes('O_Christmas_Tree'))).toBe(true)
  await page.getByRole('button', { name: 'Pause Christmas music' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Paused · O Christmas Tree')
  await page.getByRole('button', { name: 'Next Christmas song' }).click()
  await expect(page.locator('.record-player-status')).toHaveText('Paused · Jingle Bells')
  await expect(page.getByRole('button', { name: 'Add a song' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Google sign-in was canceled')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__copiedErrorReport = text } },
    })
  })
  const signInError = page.locator('.action-error').filter({ hasText: 'Google sign-in was canceled' })
  await expect(signInError.locator('code')).toHaveText(/^ML-/)
  await signInError.getByRole('button', { name: 'Copy report for texting' }).click()
  await expect(signInError.getByRole('status')).toContainText('Report copied')
  const copiedErrorReport = await page.evaluate(() => window.__copiedErrorReport)
  expect(copiedErrorReport).toContain('Action: Google sign-in')
  expect(copiedErrorReport).toContain('What happened: Google sign-in was canceled or could not finish.')
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeEnabled()
  expect(page.url()).not.toContain('error_description')
  cancelSignIn = false
  const signIn = async selectedEmail => {
    nextEmail = selectedEmail
    await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  }
  await signIn('shopper@example.com')
  await expect(page.getByText('Up to date', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Shopper chat' })).toBeVisible()
  await expect(page.locator('.shopper-chat-day-heading').filter({ hasText: 'Yesterday' })).toBeVisible()
  await page.getByLabel('Write a message').fill('I can coordinate here.')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('I can coordinate here.')).toBeVisible()
  await expect(page.getByText('Shopper Example', { exact: true })).toBeVisible()
  const chatHistory = page.locator('.shopper-chat-messages')
  await chatHistory.evaluate(element => new Promise(resolve => {
    element.addEventListener('scroll', () => resolve(true), { once: true })
    element.scrollTop = 0
  }))
  chatMessages.push({ id: chatMessages.length + 1, sender: 'another@example.com', senderName: 'Another Shopper', message: 'A new message while you read history.', createdAt: new Date().toISOString() })
  await expect(page.getByText('A new message while you read history.')).toBeVisible({ timeout: 8000 })
  expect(await chatHistory.evaluate(element => element.scrollTop)).toBe(0)
  const openPlayer = page.getByRole('button', { name: 'Open Christmas record player' })
  if (await openPlayer.isVisible()) await openPlayer.click()
  await expect(page.getByRole('button', { name: 'Add a song' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a gift' })).toHaveCount(0)
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
  failNextSuggestion = true
  await page.getByRole('button', { name: 'Suggest a gift' }).click()
  await page.getByLabel('Gift name').fill('A Suggestion That Fails')
  await page.getByLabel('Price (USD)').fill('10')
  await page.getByLabel('Category').selectOption('Books')
  await page.getByLabel('Retailer link').fill('https://example.com/gift')
  await page.getByLabel('Short description').fill('A thoughtful recommendation.')
  await page.getByLabel('Why do you recommend it?').fill('It would be a lovely addition.')
  await page.getByRole('button', { name: 'Send for review' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Your gift idea could not be submitted.' })).toBeVisible()
  await page.getByRole('button', { name: 'Close form' }).click()
  await page.getByRole('button', { name: 'View Draco Slides', exact: true }).click()
  await page.getByRole('button', { name: 'I’m considering this', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('You’re considering this', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'I bought this', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('You bought this', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as available', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('Available to gift', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'I’m considering this', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('You’re considering this', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as available', exact: true }).click()
  await expect(page.locator('.gift-modal').getByText('Available to gift', { exact: true })).toBeVisible()
  // Another visitor's update arrives through the normal refresh mechanism.
  const statusChangedAt = Date.now()
  status = 'considering'; mine = false; revision++
  await expect(page.locator('.gift-modal').getByText('Someone is considering this', { exact: true })).toBeVisible({ timeout: 5000 })
  expect(Date.now() - statusChangedAt).toBeLessThan(4500)
  await expect(page.getByRole('button', { name: 'I bought this', exact: true })).toHaveCount(0)
  await expect(page.locator('.gift-modal').getByRole('link', { name: 'See the gift' })).toHaveCount(0)
  status = 'bought'; revision++
  const boughtChangedAt = Date.now()
  await expect(page.locator('.gift-modal').getByText('Bought by Jordan Shopper', { exact: true })).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.gift-bought-overlay')).toContainText('Bought by Jordan Shopper')
  await expect(page.getByRole('status').filter({ hasText: 'Draco Slides was just marked bought by Jordan Shopper' })).toBeVisible()
  expect(Date.now() - boughtChangedAt).toBeLessThan(4500)
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
  await expect(page.getByRole('region', { name: 'Shopper chat' })).toHaveCount(0)
  const ownerOpenPlayer = page.getByRole('button', { name: 'Open Christmas record player' })
  if (await ownerOpenPlayer.isVisible()) await ownerOpenPlayer.click()
  await expect(page.getByRole('button', { name: 'Add a song' })).toBeVisible()
  await page.getByRole('button', { name: 'Add a song' }).click()
  await page.getByLabel('Song title').fill('A New Carol')
  await page.getByLabel('Artist or performer (optional)').fill('The Merrylist Choir')
  await page.getByLabel('Direct audio file URL').fill('https://upload.wikimedia.org/test/new-carol.mp3')
  await page.getByLabel('Source or attribution URL').fill('https://commons.wikimedia.org/wiki/New_Carol')
  await page.getByRole('button', { name: 'Add to playlist' }).click()
  await expect(page.getByText('A New Carol was added to the playlist.')).toBeVisible()
  await expect(page.getByLabel('Choose a carol').locator('option')).toHaveCount(7)
  await expect(page.getByLabel('Choose a carol')).toContainText('A New Carol')
  await page.getByRole('button', { name: 'Connect Spotify', exact: true }).click()
  await page.getByRole('button', { name: 'Connect Spotify account', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open Christmas record player' })).toBeVisible()
  await page.waitForFunction(() => window.location.search === '')
  expect(new URL(page.url()).search).toBe('')
  await page.getByRole('button', { name: 'Open Christmas record player' }).click()
  await page.getByRole('button', { name: 'Connect Spotify', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'could not be verified' })).toBeVisible()
  await page.getByRole('button', { name: 'Connect Spotify account', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open Christmas record player' })).toBeVisible()
  await page.waitForFunction(() => window.location.search === '')
  expect(spotifyAuthorizeRequests).toBe(2)
  expect(spotifyTokenRequests).toBe(1)
  expect(spotifyPlaylistRequests).toBe(0)
  await page.getByRole('button', { name: 'Open Christmas record player' }).click()
  const spotifyPlaylistSelect = page.getByRole('combobox', { name: 'Spotify playlist' })
  await expect(spotifyPlaylistSelect.locator('option')).toHaveCount(3)
  await expect(spotifyPlaylistSelect).not.toContainText('Private playlist')
  await expect(spotifyPlaylistSelect).toContainText('Merry Christmas')
  await expect(spotifyPlaylistSelect).toContainText('Another public list')
  expect(spotifyPlaylistRequests).toBe(2)
  await spotifyPlaylistSelect.selectOption('1234567890123456789012')
  await page.getByRole('button', { name: 'Use this playlist' }).click()
  await expect(page.getByText('“Merry Christmas” is now the shared Spotify playlist.')).toBeVisible()
  await expect(page.locator('.spotify-embed iframe')).toBeVisible()
  const pausesBeforeHidden = await page.evaluate(() => window.__spotifyPauseCount || 0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => page.evaluate(() => window.__spotifyPauseCount || 0)).toBeGreaterThan(pausesBeforeHidden)
  await page.evaluate(() => { delete document.visibilityState })
  await page.getByRole('button', { name: 'Merrylist Radio' }).click()
  await expect(page.locator('.spotify-embed iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Spotify playlist', exact: true }).click()
  await expect(page.locator('.spotify-embed iframe')).toBeVisible()
  await page.getByRole('button', { name: 'Minimize record player' }).click()
  await expect(page.locator('.idea-count')).toHaveText('2 pending')
  await page.locator('.gift-idea-card').filter({ hasText: 'A Thoughtful Book' }).getByRole('button', { name: 'Approve' }).click()
  await expect(page.locator('.gift-card')).toHaveCount(24)
  await expect(page.getByRole('button', { name: 'A Thoughtful Book', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add a gift' }).click()
  await page.getByLabel('Gift name').fill('A Direct Owner Gift')
  await page.getByLabel('Price (USD)').fill('42')
  await page.getByLabel('Category').selectOption('Other')
  await page.getByLabel('Retailer link').fill('https://example.com/owner-gift')
  await page.getByLabel('Short description').fill('Added directly by the owner.')
  await page.getByLabel('Why do you recommend it?').fill('A wonderful surprise.')
  await page.getByRole('button', { name: 'Add to list' }).click()
  await expect(page.getByText('A Direct Owner Gift was added to the list and quiz.')).toBeVisible()
  await expect(page.locator('.gift-card')).toHaveCount(25)
  await expect(page.getByRole('button', { name: 'A Direct Owner Gift', exact: true })).toBeVisible()
  await page.locator('.gift-idea-card').filter({ hasText: 'A Second Book' }).getByRole('button', { name: 'Decline' }).click()
  await expect(page.locator('.idea-count')).toHaveText('0 pending')
  // Deliberately injected statuses in the mocked owner response must be stripped.
  await expect(page.locator('.claim-badge')).toHaveCount(0)
  await expect(page.locator('.gift-card')).toHaveCount(25)
  await page.getByRole('button', { name: 'View Draco Slides', exact: true }).click()
  await expect(page.locator('.claim-controls')).toHaveCount(0)
  await expect(page.locator('.gift-modal').getByRole('link', { name: 'See the gift' })).toBeVisible()
  await page.locator('.gift-modal').getByRole('button', { name: 'Mark as favorite' }).click()
  await expect(page.getByRole('button', { name: 'Remove Draco Slides from favorites' })).toBeVisible()
  await page.locator('.gift-modal').getByRole('button', { name: 'Edit gift details' }).click()
  await page.getByLabel('Gift name').fill('Updated Draco Slides')
  await page.getByLabel('Price (USD)').fill('101.25')
  await page.getByLabel('Short description').fill('Updated gift details.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('.gift-modal h2')).toHaveText('Updated Draco Slides')
  await expect(page.locator('.gift-modal .modal-details strong')).toHaveText('$101.25')
  await expect(page.locator('.gift-card').filter({ hasText: 'Updated Draco Slides' }).locator('.card-bottom')).toContainText('$101.25')
  await page.locator('.gift-modal').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await signIn('shopper@example.com')
  await expect(page.locator('.gift-card').filter({ hasText: 'Updated Draco Slides' }).locator('.owner-favorite-mark')).toContainText('favorite')
  await expect(page.getByText('I can coordinate here.')).toBeVisible()
  await expect(page.getByText('Earlier message 1', { exact: true })).toBeVisible()
  await expect(page.locator('.shopper-chat-day-heading').filter({ hasText: 'Yesterday' })).toBeVisible()
  const shopperOpenPlayer = page.getByRole('button', { name: 'Open Christmas record player' })
  if (await shopperOpenPlayer.isVisible()) await shopperOpenPlayer.click()
  await expect(page.locator('.spotify-embed iframe')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#gift-coordination').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(failures).toEqual([])
  expect(oauthRequests).toBe(4)
  await context.close()
  console.log('Browser checks passed: Spotify PKCE, playlist pagination and sharing, gift editing and favorites, suggestions and review, music, chat history, claim undo, and mobile layout.')
} finally {
  await browser?.close()
  server.kill()
}
