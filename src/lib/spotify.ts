export type SpotifyPlaylist = { id: string; name: string }

export type SpotifyPlaylistChoice = SpotifyPlaylist & {
  public: boolean
  tracks: number
}

const verifierKey = 'merrylist.spotify.pkce-verifier'
const stateKey = 'merrylist.spotify.oauth-state'
const spotifyIdPattern = /^[A-Za-z0-9]{22}$/

function randomString(length: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

function base64Url(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function createSpotifyAuthorizationUrl(clientId: string, redirectUri: string) {
  const verifier = randomString(64)
  const state = randomString(32)
  const challenge = base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  sessionStorage.setItem(verifierKey, verifier)
  sessionStorage.setItem(stateKey, state)
  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'playlist-read-private playlist-read-collaborative',
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  }).toString()
  return url.toString()
}

export function consumeSpotifyOAuthState(state: string | null) {
  const expectedState = sessionStorage.getItem(stateKey)
  const verifier = sessionStorage.getItem(verifierKey)
  sessionStorage.removeItem(stateKey)
  sessionStorage.removeItem(verifierKey)
  if (!state || !expectedState || state !== expectedState || !verifier) {
    throw new Error('Spotify sign-in could not be verified. Connect your account again.')
  }
  return verifier
}

export async function exchangeSpotifyCode(clientId: string, redirectUri: string, code: string, verifier: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })
  const result: unknown = await response.json()
  if (!response.ok || !isRecord(result) || typeof result.access_token !== 'string' ||
      typeof result.expires_in !== 'number' || !Number.isFinite(result.expires_in)) {
    throw new Error('Spotify sign-in failed while requesting an access token. Please connect again.')
  }
  return { accessToken: result.access_token, expiresIn: result.expires_in }
}

export async function fetchSpotifyPublicPlaylists(accessToken: string): Promise<SpotifyPlaylistChoice[]> {
  const playlists: SpotifyPlaylistChoice[] = []
  for (let offset = 0; ; offset += 50) {
    const url = new URL('https://api.spotify.com/v1/me/playlists')
    url.search = new URLSearchParams({ limit: '50', offset: String(offset) }).toString()
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your Spotify connection expired. Connect your account again.')
      throw new Error('Spotify playlists could not be loaded. Please try again.')
    }
    const result: unknown = await response.json()
    if (!isRecord(result) || !Array.isArray(result.items)) {
      throw new Error('Spotify returned an unexpected playlist list.')
    }
    for (const item of result.items) {
      if (!isRecord(item) || typeof item.id !== 'string' || !spotifyIdPattern.test(item.id) ||
          typeof item.name !== 'string' || !item.name.trim()) {
        continue
      }
      if (item.public === true) {
        const tracks = isRecord(item.tracks) && typeof item.tracks.total === 'number' && Number.isFinite(item.tracks.total)
          ? item.tracks.total
          : 0
        playlists.push({ id: item.id, name: item.name.trim().slice(0, 120), public: true, tracks })
      }
    }
    if (result.next === null) return playlists
    if (typeof result.next !== 'string' || offset >= 100000) {
      throw new Error('Spotify playlist pagination could not be completed.')
    }
  }
}

export function readSpotifyPlaylist(value: unknown): SpotifyPlaylist | null {
  if (value === null) return null
  if (!isRecord(value) || typeof value.id !== 'string' || !spotifyIdPattern.test(value.id) ||
      typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) {
    throw new Error('Invalid Spotify playlist setting.')
  }
  return { id: value.id, name: value.name }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}
