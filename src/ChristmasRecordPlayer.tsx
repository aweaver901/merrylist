import { ChevronDown, Disc3, GripVertical, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { christmasSongs } from './data/christmasSongs'

function RecordDisc({ playing = false }: { playing?: boolean }) {
  return <span className={`record-disc ${playing ? 'is-playing' : ''}`} aria-hidden="true"><span className="record-disc-label" /></span>
}

export default function ChristmasRecordPlayer() {
  const [expanded, setExpanded] = useState(false)
  const [dockSide, setDockSide] = useState<'left' | 'right'>('left')
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(.38)
  const [error, setError] = useState('')
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const activeTrackIndex = useRef<number | null>(null)
  const generation = useRef(0)
  const playingRef = useRef(false)
  const playTrackRef = useRef<(index: number) => Promise<void>>(async () => {})
  const playerElement = useRef<HTMLElement>(null)
  const dragOffset = useRef<{ pointerId: number; x: number; y: number } | null>(null)

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
    setDockSide(left + player.offsetWidth / 2 < window.innerWidth / 2 ? 'left' : 'right')
    dragOffset.current = null
    setDragPosition(null)
    setDragging(false)
  }

  const moveByKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft') setDockSide('left')
    else if (event.key === 'ArrowRight') setDockSide('right')
    else return
    event.preventDefault()
  }

  const playTrack = useCallback(async (index: number) => {
    const token = ++generation.current
    const audio = audioElement.current
    if (!audio) {
      setError('The music player is not ready yet. Try again in a moment.')
      return
    }

    audio.pause()
    audio.src = christmasSongs[index].audioUrl
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
  }, [volume])
  playTrackRef.current = playTrack

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = volume
    audioElement.current = audio
    const handleEnded = () => {
      if (playingRef.current && activeTrackIndex.current !== null) {
        void playTrackRef.current((activeTrackIndex.current + 1) % christmasSongs.length)
      }
    }
    audio.addEventListener('ended', handleEnded)
    return () => {
      generation.current++
      playingRef.current = false
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioElement.current = null
    }
  }, [])

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

  const moveTrack = (offset: number) => selectTrack((trackIndex + offset + christmasSongs.length) % christmasSongs.length)
  const song = christmasSongs[trackIndex]

  return <aside
    ref={playerElement}
    className={`record-player record-player-docked-${dockSide} ${expanded ? 'record-player-expanded' : 'record-player-collapsed'} ${dragging ? 'is-dragging' : ''}`}
    style={dragPosition ? { left: dragPosition.left, top: dragPosition.top, right: 'auto', bottom: 'auto' } : undefined}
    aria-label="Christmas record player"
  >
    {expanded ? <div className="record-player-panel">
      <header className="record-player-header">
        <div><p className="record-player-kicker"><Disc3 size={14} /> MERRYLIST RADIO</p><span>Real recordings · public-domain carols</span></div>
        <div className="record-player-header-actions">
          <button className="record-player-icon-button record-player-drag-handle" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveByKeyboard} aria-label="Move record player; drag to a bottom corner or press an arrow key"><GripVertical size={17} /></button>
          <button className="record-player-icon-button" onClick={() => setExpanded(false)} aria-label="Minimize record player"><ChevronDown size={18} /></button>
        </div>
      </header>
      <div className="record-player-now">
        <RecordDisc playing={isPlaying} />
        <div><span>NOW PLAYING · {String(trackIndex + 1).padStart(2, '0')} / {String(christmasSongs.length).padStart(2, '0')}</span><strong>{song.title}</strong><small><a href={song.sourceUrl} target="_blank" rel="noreferrer">Recording: {song.artist}</a></small></div>
      </div>
      <label className="record-player-track">Choose a carol
        <select value={trackIndex} onChange={event => selectTrack(Number(event.target.value))}>
          {christmasSongs.map((track, index) => <option value={index} key={track.title}>{track.title}</option>)}
        </select>
      </label>
      <div className="record-player-controls">
        <button className="record-player-icon-button" onClick={() => moveTrack(-1)} aria-label="Previous Christmas song"><SkipBack size={18} /></button>
        <button className="record-player-play" onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause Christmas music' : 'Play Christmas music'}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
        <button className="record-player-icon-button" onClick={() => moveTrack(1)} aria-label="Next Christmas song"><SkipForward size={18} /></button>
        <label className="record-player-volume"><Volume2 size={16} /><span className="visually-hidden">Music volume</span><input aria-label="Music volume" type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))} /><small>{Math.round(volume * 100)}%</small></label>
      </div>
      <p className="record-player-status" role="status" aria-live="polite">{isPlaying ? 'Playing' : 'Paused'} · {song.title}</p>
      {error && <p className="record-player-error" role="alert">{error}</p>}
    </div> : <div className="record-player-mini">
      <button className="record-player-open" onClick={() => setExpanded(true)} aria-label="Open Christmas record player">
        <RecordDisc playing={isPlaying} /><span><strong>Holiday record player</strong><small>{isPlaying ? 'Now playing' : 'Pick a carol'} · {song.title}</small></span>
      </button>
      <button className="record-player-icon-button record-player-drag-handle" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveByKeyboard} aria-label="Move record player; drag to a bottom corner or press an arrow key"><GripVertical size={17} /></button>
      <button className="record-player-play mini-play" onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause Christmas music' : 'Play Christmas music'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    </div>}
  </aside>
}
