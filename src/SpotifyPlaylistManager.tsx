import { useCallback, useEffect, useRef, useState } from 'react'
import { useCoordination } from './Coordination'
import { fetchSpotifyPublicPlaylists, type SpotifyPlaylistChoice } from './lib/spotify'
import ActionErrorNotice from './ActionErrorNotice'

type SpotifySession = { accessToken: string; expiresAt: number }

export default function SpotifyPlaylistManager({ spotifySession, spotifySetupError, spotifyClientIdConfigured, onConnect, onSessionExpired }: {
  spotifySession: SpotifySession | null
  spotifySetupError: string
  spotifyClientIdConfigured: boolean
  onConnect: () => void
  onSessionExpired: () => void
}) {
  const { spotifyPlaylist, spotifyPlaylistBusy, spotifyPlaylistError, setSpotifyPlaylist } = useCoordination()
  const [open, setOpen] = useState(Boolean(spotifySession))
  const [playlists, setPlaylists] = useState<SpotifyPlaylistChoice[]>([])
  const [selectedId, setSelectedId] = useState(spotifyPlaylist?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const requestedToken = useRef<string | null>(null)

  useEffect(() => setSelectedId(spotifyPlaylist?.id ?? ''), [spotifyPlaylist?.id])
  useEffect(() => {
    if (!spotifySession) return
    setOpen(true)
    setMessage('Spotify is connected temporarily so you can choose a playlist.')
  }, [spotifySession])

  const loadPlaylists = useCallback(async (accessToken: string) => {
    setLoading(true)
    setError('')
    try {
      const next = await fetchSpotifyPublicPlaylists(accessToken)
      setPlaylists(next)
      setSelectedId(current => current || spotifyPlaylist?.id || '')
      if (!next.length) setMessage('No public playlists were found. Make a playlist public in Spotify, then reconnect.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Spotify playlists could not be loaded.')
      if (failure instanceof Error && failure.message.includes('connection expired')) onSessionExpired()
    } finally {
      setLoading(false)
    }
  }, [spotifyPlaylist?.id])

  useEffect(() => {
    if (!spotifySession) {
      requestedToken.current = null
      return
    }
    if (requestedToken.current === spotifySession.accessToken) return
    requestedToken.current = spotifySession.accessToken
    void loadPlaylists(spotifySession.accessToken)
  }, [spotifySession, loadPlaylists])

  const saveSelection = async () => {
    const selected = playlists.find(playlist => playlist.id === selectedId)
    if (!selected || !selected.public) {
      setError('Choose a public Spotify playlist first.')
      return
    }
    setError('')
    setMessage('')
    if (await setSpotifyPlaylist({ id: selected.id, name: selected.name })) {
      setMessage(`“${selected.name}” is now the shared Spotify playlist.`)
    }
  }

  const clearSelection = async () => {
    setError('')
    setMessage('')
    if (await setSpotifyPlaylist(null)) {
      setSelectedId('')
      setMessage('The Spotify playlist was removed. Merrylist Radio is still available.')
    }
  }

  return <section className="record-player-manager spotify-playlist-manager">
    <button className="text-button" type="button" aria-expanded={open} onClick={() => { setOpen(value => !value); setError(''); setMessage('') }}>
      {open ? 'Close Spotify settings' : spotifyPlaylist ? 'Change Spotify playlist' : 'Connect Spotify'}
    </button>
    {open && <div className="spotify-playlist-settings">
      {!spotifyClientIdConfigured && <p className="claim-hint">Spotify setup is needed first: add the app’s client ID to the site environment.</p>}
      {!spotifySession ? <button className="outline-button" type="button" disabled={!spotifyClientIdConfigured} onClick={onConnect}>
        {spotifyPlaylist ? 'Reconnect to choose a playlist' : 'Connect Spotify account'}
      </button> : <>
        <button className="outline-button" type="button" disabled={loading} onClick={() => void loadPlaylists(spotifySession.accessToken)}>Reload Spotify playlists</button>
        {loading && <p className="claim-hint" role="status">Loading your Spotify playlists…</p>}
        <label>Choose a public playlist
          <select aria-label="Spotify playlist" value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || playlists.length === 0}>
            <option value="">Select a playlist</option>
            {playlists.map(playlist => <option value={playlist.id} key={playlist.id}>{playlist.name} · {playlist.tracks} tracks</option>)}
          </select>
        </label>
        <button className="primary-button" type="button" disabled={loading || spotifyPlaylistBusy || !selectedId} onClick={() => void saveSelection()}>
          {spotifyPlaylistBusy ? 'Saving playlist…' : 'Use this playlist'}
        </button>
        {spotifyPlaylist && <button className="text-button" type="button" disabled={spotifyPlaylistBusy} onClick={() => void clearSelection()}>Remove Spotify playlist</button>}
        {!loading && playlists.length === 0 && <p className="claim-hint">Only public playlists can be shared here.</p>}
      </>}
      <p className="claim-hint">Your Spotify login is used only to list playlists and is not saved. Friends play the selected public playlist in Spotify’s embedded player.</p>
      {error && <ActionErrorNotice key={`spotify-playlists:${error}`} action="Spotify playlists" message={error} />}
      {spotifySetupError && <ActionErrorNotice key={`spotify-connection:${spotifySetupError}`} action="Spotify connection" message={spotifySetupError} />}
      {spotifyPlaylistError && <ActionErrorNotice key={`spotify-setting:${spotifyPlaylistError}`} action="Spotify playlist setting" message={spotifyPlaylistError} />}
      {message && <p className="claim-hint" role="status">{message}</p>}
    </div>}
  </section>
}
