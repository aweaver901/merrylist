import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Disc3, GripVertical, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useCoordination } from './Coordination'
import type { ChristmasSongInput } from './lib/coordination'
import SpotifyPlaylistEmbed from './SpotifyPlaylistEmbed'
import SpotifyPlaylistManager from './SpotifyPlaylistManager'
import { consumeSpotifyOAuthState, createSpotifyAuthorizationUrl, exchangeSpotifyCode } from './lib/spotify'
import ActionErrorNotice from './ActionErrorNotice'

const emptySongForm: ChristmasSongInput = { title: '', artist: '', audioUrl: '', sourceUrl: '' }
const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? ''

function RecordDisc({ playing = false }: { playing?: boolean }) {
  return <span className={`record-disc ${playing ? 'is-playing' : ''}`} aria-hidden="true"><span className="record-disc-label" /></span>
}

export default function ChristmasRecordPlayer() {
  const { configured, session, snapshot, christmasSongs, musicLoading, musicError, musicBusy, addChristmasSong, spotifyPlaylist } = useCoordination()
  const [expanded, setExpanded] = useState(false)
  const reducedMotion = useReducedMotion()
  const [dockEdge, setDockEdge] = useState<'left' | 'right' | 'top' | 'bottom'>('bottom')
  const [edgeOffset, setEdgeOffset] = useState(180)
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [musicMode, setMusicMode] = useState<'spotify' | 'radio'>('radio')
  const [spotifySession, setSpotifySession] = useState<{ accessToken: string; expiresAt: number } | null>(null)
  const [spotifyAuthError, setSpotifyAuthError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(.38)
  const [error, setError] = useState('')
  const [songFormOpen, setSongFormOpen] = useState(false)
  const [songForm, setSongForm] = useState(emptySongForm)
  const [songFormError, setSongFormError] = useState('')
  const [songMessage, setSongMessage] = useState('')
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const activeTrackIndex = useRef<number | null>(null)
  const songsRef = useRef(christmasSongs)
  const generation = useRef(0)
  const playingRef = useRef(false)
  const playTrackRef = useRef<(index: number) => Promise<void>>(async () => {})
  const playerElement = useRef<HTMLElement>(null)
  const dragOffset = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const spotifyOAuthProcessed = useRef(false)
  songsRef.current = christmasSongs
  const isOwner = Boolean(session && snapshot?.role === 'owner')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')
    if ((!code && !oauthError) || spotifyOAuthProcessed.current) return

    spotifyOAuthProcessed.current = true
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`)
    const finishAuthorization = async () => {
      try {
        const verifier = consumeSpotifyOAuthState(params.get('state'))
        if (oauthError) {
          throw new Error(oauthError === 'access_denied' ? 'Spotify connection was canceled.' : 'Spotify could not authorize this connection.')
        }
        if (!spotifyClientId || !code) throw new Error('Spotify sign-in could not be completed. Connect your account again.')
        const token = await exchangeSpotifyCode(spotifyClientId, `${window.location.origin}/`, code, verifier)
        setSpotifySession({ accessToken: token.accessToken, expiresAt: Date.now() + token.expiresIn * 1000 })
        setSpotifyAuthError('')
      } catch (failure) {
        setSpotifyAuthError(failure instanceof Error ? failure.message : 'Spotify sign-in failed. Please try again.')
      }
    }
    void finishAuthorization()
  }, [])

  useEffect(() => {
    if (!spotifySession) return
    const timeout = window.setTimeout(() => setSpotifySession(null), Math.max(0, spotifySession.expiresAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [spotifySession])

  const connectSpotify = async () => {
    setSpotifyAuthError('')
    if (!spotifyClientId) {
      setSpotifyAuthError('Add VITE_SPOTIFY_CLIENT_ID to the site environment before connecting Spotify.')
      return
    }
    try {
      const authorizationUrl = await createSpotifyAuthorizationUrl(spotifyClientId, `${window.location.origin}/`)
      window.location.assign(authorizationUrl)
    } catch {
      setSpotifyAuthError('Spotify sign-in needs a secure browser connection. Use the deployed HTTPS site or localhost.')
    }
  }

  useEffect(() => {
    setMusicMode(spotifyPlaylist ? 'spotify' : 'radio')
  }, [spotifyPlaylist?.id])

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = playerElement.current?.getBoundingClientRect()
    if (!bounds) return
    event.preventDefault()
    dragOffset.current = { pointerId: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    setDragPosition({ left: bounds.left, top: bounds.top })
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const offset = dragOffset.current
    const player = playerElement.current
    if (!offset || offset.pointerId !== event.pointerId || !player) return
    const left = Math.max(8, Math.min(window.innerWidth - player.offsetWidth - 8, event.clientX - offset.x))
    const top = Math.max(8, Math.min(window.innerHeight - player.offsetHeight - 8, event.clientY - offset.y))
    setDragPosition({ left, top })
  }

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const offset = dragOffset.current
    const player = playerElement.current
    if (!offset || offset.pointerId !== event.pointerId || !player) return
    const left = Math.max(8, Math.min(window.innerWidth - player.offsetWidth - 8, event.clientX - offset.x))
    const top = Math.max(8, Math.min(window.innerHeight - player.offsetHeight - 8, event.clientY - offset.y))
    const distances = [
      { edge: 'left' as const, distance: left },
      { edge: 'right' as const, distance: window.innerWidth - left - player.offsetWidth },
      { edge: 'top' as const, distance: top },
      { edge: 'bottom' as const, distance: window.innerHeight - top - player.offsetHeight },
    ]
    const nearest = distances.reduce((best, candidate) => candidate.distance < best.distance ? candidate : best)
    setDockEdge(nearest.edge)
    setEdgeOffset(nearest.edge === 'left' || nearest.edge === 'right' ? top + player.offsetHeight / 2 : left + player.offsetWidth / 2)
    dragOffset.current = null
    setDragPosition(null)
    setDragging(false)
  }

  const moveByKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const edges = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' } as const
    const nextEdge = edges[event.key as keyof typeof edges]
    if (!nextEdge) return
    const currentLength = dockEdge === 'left' || dockEdge === 'right' ? window.innerHeight : window.innerWidth
    const nextLength = nextEdge === 'left' || nextEdge === 'right' ? window.innerHeight : window.innerWidth
    setEdgeOffset(edgeOffset / currentLength * nextLength)
    setDockEdge(nextEdge)
    event.preventDefault()
  }

  useEffect(() => {
    const syncPosition = () => {
      const player = playerElement.current
      if (!player || dragging || dragPosition) return
      const horizontalEdge = dockEdge === 'top' || dockEdge === 'bottom'
      const extent = horizontalEdge ? player.offsetWidth : player.offsetHeight
      const available = horizontalEdge ? window.innerWidth : window.innerHeight
      const minimum = Math.min(extent / 2 + 12, available / 2)
      setEdgeOffset(current => Math.max(minimum, Math.min(available - minimum, current)))
    }
    syncPosition()
    window.addEventListener('resize', syncPosition)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncPosition)
    if (observer && playerElement.current) observer.observe(playerElement.current)
    return () => {
      window.removeEventListener('resize', syncPosition)
      observer?.disconnect()
    }
  }, [dockEdge, dragPosition, dragging, expanded])

  const dockStyle = dragPosition
    ? { left: dragPosition.left, top: dragPosition.top, right: 'auto', bottom: 'auto', transform: 'none' }
    : dockEdge === 'left'
      ? { left: 12, top: edgeOffset, right: 'auto', bottom: 'auto', transform: 'translateY(-50%)' }
      : dockEdge === 'right'
        ? { left: 'auto', top: edgeOffset, right: 12, bottom: 'auto', transform: 'translateY(-50%)' }
        : dockEdge === 'top'
          ? { left: edgeOffset, top: 12, right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' }
          : { left: edgeOffset, top: 'auto', right: 'auto', bottom: 12, transform: 'translateX(-50%)' }
  const openIcon = dockEdge === 'left' ? <ChevronRight size={17} /> : dockEdge === 'right' ? <ChevronLeft size={17} /> : dockEdge === 'top' ? <ChevronDown size={17} /> : <ChevronUp size={17} />
  const pauseWhenLeaving = useCallback(() => {
    const audio = audioElement.current
    if (!audio || !playingRef.current) return
    generation.current++
    audio.pause()
    playingRef.current = false
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    if (musicMode === 'spotify') pauseWhenLeaving()
  }, [musicMode, pauseWhenLeaving])

  const playTrack = useCallback(async (index: number) => {
    const token = ++generation.current
    const audio = audioElement.current
    const song = christmasSongs[index]
    if (!audio) {
      setError('The music player is not ready yet. Try again in a moment.')
      return
    }
    if (!song) {
      setError('There are no songs in the playlist yet.')
      return
    }

    audio.pause()
    audio.src = song.audioUrl
    audio.volume = volume
    audio.currentTime = 0
    activeTrackIndex.current = index
    setError('')

    try {
      await audio.play()
      if (token !== generation.current) return
      playingRef.current = true
      setTrackIndex(index)
      setIsPlaying(true)
    } catch {
      if (token !== generation.current) return
      playingRef.current = false
      setIsPlaying(false)
      setError('This recording could not play. Check your connection and try again.')
    }
  }, [christmasSongs, volume])
  playTrackRef.current = playTrack

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = volume
    audioElement.current = audio
    const handleEnded = () => {
      if (playingRef.current && activeTrackIndex.current !== null) {
        const songs = songsRef.current
        if (songs.length) void playTrackRef.current((activeTrackIndex.current + 1) % songs.length)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pauseWhenLeaving()
    }
    audio.addEventListener('ended', handleEnded)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', pauseWhenLeaving)
    window.addEventListener('blur', pauseWhenLeaving)
    return () => {
      generation.current++
      playingRef.current = false
      audio.removeEventListener('ended', handleEnded)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', pauseWhenLeaving)
      window.removeEventListener('blur', pauseWhenLeaving)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioElement.current = null
    }
  }, [pauseWhenLeaving])

  useEffect(() => {
    if (audioElement.current) audioElement.current.volume = volume
  }, [volume])

  const togglePlayback = async () => {
    setError('')
    const audio = audioElement.current
    if (!audio) return
    if (playingRef.current) {
      generation.current++
      audio.pause()
      playingRef.current = false
      setIsPlaying(false)
      return
    }
    if (activeTrackIndex.current === trackIndex && audio.src) {
      const token = ++generation.current
      try {
        await audio.play()
        if (token !== generation.current) return
        playingRef.current = true
        setIsPlaying(true)
      } catch {
        if (token !== generation.current) return
        setError('This recording could not play. Check your connection and try again.')
      }
      return
    }
    await playTrack(trackIndex)
  }

  const selectTrack = (index: number) => {
    if (!christmasSongs[index]) return
    if (playingRef.current) {
      void playTrack(index)
      return
    }
    generation.current++
    audioElement.current?.pause()
    activeTrackIndex.current = null
    playingRef.current = false
    setIsPlaying(false)
    setTrackIndex(index)
    setError('')
  }

  const moveTrack = (offset: number) => {
    if (christmasSongs.length) selectTrack((trackIndex + offset + christmasSongs.length) % christmasSongs.length)
  }
  const song = christmasSongs[trackIndex] ?? null
  const songCount = christmasSongs.length

  const submitSong = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSongFormError('')
    setSongMessage('')
    const input = {
      title: songForm.title.trim(),
      artist: songForm.artist.trim(),
      audioUrl: songForm.audioUrl.trim(),
      sourceUrl: songForm.sourceUrl.trim(),
    }
    if (!input.title || input.title.length > 120 || input.artist.length > 160) {
      setSongFormError('Add a title (up to 120 characters) and an artist of no more than 160 characters.')
      return
    }
    if (!isHttpsUrl(input.audioUrl) || !isHttpsUrl(input.sourceUrl)) {
      setSongFormError('Use valid HTTPS links for both the direct audio file and its source.')
      return
    }
    if (await addChristmasSong(input)) {
      setSongForm(emptySongForm)
      setSongFormOpen(false)
      setSongMessage(`${input.title} was added to the playlist.`)
    }
  }

  return <aside
    ref={playerElement}
    className={`record-player record-player-edge-${dockEdge} ${expanded ? 'record-player-expanded' : 'record-player-collapsed'} ${dragging ? 'is-dragging' : ''}`}
    style={dockStyle}
    aria-label="Christmas record player"
  >
    <AnimatePresence initial={false} mode="wait">
    {expanded ? <motion.div
      key="expanded"
      className="record-player-panel"
      initial={{ opacity: 0, x: reducedMotion ? 0 : dockEdge === 'left' ? -14 : dockEdge === 'right' ? 14 : 0, y: reducedMotion ? 0 : dockEdge === 'top' ? -14 : dockEdge === 'bottom' ? 14 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: reducedMotion ? 0 : dockEdge === 'left' ? -14 : dockEdge === 'right' ? 14 : 0, y: reducedMotion ? 0 : dockEdge === 'top' ? -14 : dockEdge === 'bottom' ? 14 : 0 }}
      transition={{ duration: reducedMotion ? 0 : .18 }}
    >
      <header className="record-player-header">
        <div><p className="record-player-kicker"><Disc3 size={14} /> MERRYLIST MUSIC</p><span>{musicMode === 'spotify' ? spotifyPlaylist?.name : 'Real recordings · public-domain carols'}</span></div>
        <div className="record-player-header-actions">
          <button className="record-player-icon-button record-player-drag-handle" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveByKeyboard} aria-label="Move record player; drag to any screen edge or use arrow keys"><GripVertical size={17} /></button>
          <button className="record-player-icon-button" onClick={() => setExpanded(false)} aria-label="Minimize record player"><ChevronDown size={18} /></button>
        </div>
      </header>
      {spotifyPlaylist && <div className="record-player-modes" role="group" aria-label="Music source">
        <button type="button" className={musicMode === 'spotify' ? 'active' : ''} aria-pressed={musicMode === 'spotify'} onClick={() => setMusicMode('spotify')}>Spotify playlist</button>
        <button type="button" className={musicMode === 'radio' ? 'active' : ''} aria-pressed={musicMode === 'radio'} onClick={() => setMusicMode('radio')}>Merrylist Radio</button>
      </div>}
      {musicMode === 'spotify' && spotifyPlaylist
        ? <SpotifyPlaylistEmbed key={spotifyPlaylist.id} playlistId={spotifyPlaylist.id} playlistName={spotifyPlaylist.name} />
        : <>
      <div className="record-player-now">
        <RecordDisc playing={isPlaying} />
        <div>
          <span>{song ? `NOW PLAYING · ${String(trackIndex + 1).padStart(2, '0')} / ${String(songCount).padStart(2, '0')}` : 'MERRYLIST RADIO'}</span>
          <strong>{song?.title ?? (musicLoading ? 'Loading playlist…' : 'No songs available')}</strong>
          {song && <small><a href={song.sourceUrl} target="_blank" rel="noreferrer">Recording: {song.artist || 'Source and recording details'}</a></small>}
        </div>
      </div>
      <label className="record-player-track">Choose a carol
        <select value={trackIndex} disabled={!song} onChange={event => selectTrack(Number(event.target.value))}>
          {christmasSongs.map((track, index) => <option value={index} key={track.title}>{track.title}</option>)}
          {!song && <option value={trackIndex}>{musicLoading ? 'Loading playlist…' : 'No songs available'}</option>}
        </select>
      </label>
      <div className="record-player-controls">
        <button className="record-player-icon-button" disabled={!song || songCount < 2} onClick={() => moveTrack(-1)} aria-label="Previous Christmas song"><SkipBack size={18} /></button>
        <button className="record-player-play" disabled={!song} onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause Christmas music' : 'Play Christmas music'}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
        <button className="record-player-icon-button" disabled={!song || songCount < 2} onClick={() => moveTrack(1)} aria-label="Next Christmas song"><SkipForward size={18} /></button>
        <label className="record-player-volume"><Volume2 size={16} /><span className="visually-hidden">Music volume</span><input aria-label="Music volume" type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))} /><small>{Math.round(volume * 100)}%</small></label>
      </div>
      <p className="record-player-status" role="status" aria-live="polite">{song ? `${isPlaying ? 'Playing' : 'Paused'} · ${song.title}` : musicLoading ? 'Loading playlist…' : configured ? 'No songs in the playlist.' : 'Music library is not configured.'}</p>
      {error && <ActionErrorNotice key={`radio:${error}`} action="Merrylist Radio" message={error} />}
      {musicError && <ActionErrorNotice key={`music-library:${musicError}`} action="Merrylist music library" message={musicError} />}
      </>}
      {isOwner && <section className="record-player-manager">
        <SpotifyPlaylistManager
          spotifySession={spotifySession}
          spotifySetupError={spotifyAuthError}
          spotifyClientIdConfigured={Boolean(spotifyClientId)}
          onConnect={() => void connectSpotify()}
          onSessionExpired={() => setSpotifySession(null)}
        />
        <button className="text-button" type="button" aria-expanded={songFormOpen} onClick={() => { setSongFormOpen(open => !open); setSongFormError(''); setSongMessage('') }}>
          {songFormOpen ? 'Close song form' : 'Add a song'}
        </button>
        {songFormOpen && <form className="gift-idea-form record-player-song-form" onSubmit={event => void submitSong(event)}>
          <div className="record-player-song-fields">
            <label>Song title<input required maxLength={120} value={songForm.title} onChange={event => setSongForm({ ...songForm, title: event.target.value })} /></label>
            <label>Artist or performer (optional)<input maxLength={160} value={songForm.artist} onChange={event => setSongForm({ ...songForm, artist: event.target.value })} /></label>
            <label>Direct audio file URL<input required type="url" placeholder="https://" value={songForm.audioUrl} onChange={event => setSongForm({ ...songForm, audioUrl: event.target.value })} /></label>
            <label>Source or attribution URL<input required type="url" placeholder="https://" value={songForm.sourceUrl} onChange={event => setSongForm({ ...songForm, sourceUrl: event.target.value })} /></label>
          </div>
          <p className="claim-hint">Use a public HTTPS link to an audio file you have permission to share. Spotify and YouTube page links are not playable audio files.</p>
          {songFormError && <p className="coordination-error" role="alert">{songFormError}</p>}
          <button className="primary-button" type="submit" disabled={musicBusy}>{musicBusy ? 'Adding song…' : 'Add to playlist'}</button>
        </form>}
      </section>}
      {songMessage && <p className="claim-hint" role="status">{songMessage}</p>}
    </motion.div> : <motion.div
      key="collapsed"
      className="record-player-mini"
      initial={{ opacity: 0, scale: reducedMotion ? 1 : .9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : .9 }}
      transition={{ duration: reducedMotion ? 0 : .15 }}
    >
      <button className="record-player-open" onClick={() => setExpanded(true)} aria-label="Open Christmas record player">
        <RecordDisc playing={isPlaying} /><span className="visually-hidden">Open holiday record player</span>{openIcon}
      </button>
      <button className="record-player-icon-button record-player-drag-handle" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveByKeyboard} aria-label="Move record player; drag to any screen edge or use arrow keys"><GripVertical size={17} /></button>
    </motion.div>}
    </AnimatePresence>
  </aside>
}

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
