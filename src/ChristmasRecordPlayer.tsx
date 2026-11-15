import { ChevronDown, Disc3, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { christmasSongs } from './data/christmasSongs'

const noteOffsets: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function midiNote(note: string) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(note)
  if (!match) throw new Error(`Unknown musical note: ${note}`)
  const [, letter, sharp, octave] = match
  return (Number(octave) + 1) * 12 + noteOffsets[letter] + (sharp ? 1 : 0)
}

function scheduleTone(context: AudioContext, output: GainNode, midi: number, start: number, duration: number, level: number) {
  const frequency = 440 * 2 ** ((midi - 69) / 12)
  const tone = context.createOscillator()
  const harmonic = context.createOscillator()
  const harmonicLevel = context.createGain()
  const envelope = context.createGain()
  tone.type = 'sine'
  harmonic.type = 'triangle'
  tone.frequency.setValueAtTime(frequency, start)
  harmonic.frequency.setValueAtTime(frequency * 2, start)
  harmonicLevel.gain.setValueAtTime(.13, start)
  envelope.gain.setValueAtTime(.0001, start)
  envelope.gain.exponentialRampToValueAtTime(level, start + .02)
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration * .9)
  tone.connect(envelope)
  harmonic.connect(harmonicLevel)
  harmonicLevel.connect(envelope)
  envelope.connect(output)
  tone.start(start)
  harmonic.start(start)
  tone.stop(start + duration)
  harmonic.stop(start + duration)
  return [tone, harmonic]
}

function RecordDisc({ playing = false }: { playing?: boolean }) {
  return <span className={`record-disc ${playing ? 'is-playing' : ''}`} aria-hidden="true"><span className="record-disc-label" /></span>
}

export default function ChristmasRecordPlayer() {
  const [expanded, setExpanded] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(.38)
  const [error, setError] = useState('')
  const audioContext = useRef<AudioContext | null>(null)
  const masterGain = useRef<GainNode | null>(null)
  const sources = useRef<OscillatorNode[]>([])
  const generation = useRef(0)
  const playingRef = useRef(false)
  const needsStart = useRef(true)
  const playTrackRef = useRef<(index: number) => Promise<void>>(async () => {})

  const playTrack = useCallback(async (index: number) => {
    const token = ++generation.current
    for (const source of sources.current) {
      source.onended = null
      source.disconnect()
    }
    sources.current = []
    setError('')

    try {
      if (!audioContext.current) {
        const context = new window.AudioContext()
        const gain = context.createGain()
        gain.gain.value = volume
        gain.connect(context.destination)
        audioContext.current = context
        masterGain.current = gain
      }
      const context = audioContext.current
      await context.resume()
      if (token !== generation.current) return
      const output = masterGain.current
      if (!output) throw new Error('Audio output is unavailable')

      const song = christmasSongs[index]
      const beat = 60 / song.tempo
      let start = context.currentTime + .06
      let beatInBar = 0
      let lastTone: OscillatorNode | null = null
      for (const [note, beats] of song.notes) {
        const duration = beats * beat
        if (note !== 'R') {
          const midi = midiNote(note)
          const [tone, harmonic] = scheduleTone(context, output, midi, start, duration * .92, .28)
          sources.current.push(tone, harmonic)
          lastTone = tone
          if (beatInBar < .01) {
            sources.current.push(...scheduleTone(context, output, midi - 12, start, beat * 1.8, .075))
          }
        }
        start += duration
        beatInBar = (beatInBar + beats) % 4
      }
      if (lastTone) {
        lastTone.onended = () => {
          if (generation.current === token && playingRef.current) {
            void playTrackRef.current((index + 1) % christmasSongs.length)
          }
        }
      }
      needsStart.current = false
      playingRef.current = true
      setTrackIndex(index)
      setIsPlaying(true)
    } catch {
      if (generation.current === token) {
        playingRef.current = false
        setIsPlaying(false)
        setError('Audio could not start in this browser. Try again or use a browser with audio support.')
      }
    }
  }, [volume])
  playTrackRef.current = playTrack

  useEffect(() => {
    const context = audioContext.current
    const gain = masterGain.current
    if (context && gain) gain.gain.setTargetAtTime(volume, context.currentTime, .04)
  }, [volume])

  useEffect(() => () => {
    generation.current++
    for (const source of sources.current) source.disconnect()
    void audioContext.current?.close()
  }, [])

  const togglePlayback = async () => {
    setError('')
    if (playingRef.current) {
      playingRef.current = false
      setIsPlaying(false)
      try { await audioContext.current?.suspend() } catch {
        setError('Playback could not be paused. Try closing the player.')
      }
      return
    }
    if (audioContext.current && !needsStart.current) {
      try {
        await audioContext.current.resume()
        playingRef.current = true
        setIsPlaying(true)
      } catch {
        setError('Audio could not resume. Try pressing play again.')
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
    for (const source of sources.current) {
      source.onended = null
      source.disconnect()
    }
    sources.current = []
    needsStart.current = true
    setTrackIndex(index)
    setError('')
  }

  const moveTrack = (offset: number) => selectTrack((trackIndex + offset + christmasSongs.length) % christmasSongs.length)
  const song = christmasSongs[trackIndex]

  return <aside className={`record-player ${expanded ? 'record-player-expanded' : 'record-player-collapsed'}`} aria-label="Christmas record player">
    {expanded ? <div className="record-player-panel">
      <header className="record-player-header">
        <div><p className="record-player-kicker"><Disc3 size={14} /> MERRYLIST RADIO</p><span>Holiday side A · traditional carols</span></div>
        <button className="record-player-icon-button" onClick={() => setExpanded(false)} aria-label="Minimize record player"><ChevronDown size={18} /></button>
      </header>
      <div className="record-player-now">
        <RecordDisc playing={isPlaying} />
        <div><span>NOW PLAYING · {String(trackIndex + 1).padStart(2, '0')} / {String(christmasSongs.length).padStart(2, '0')}</span><strong>{song.title}</strong><small>Instrumental · public-domain melody</small></div>
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
      <button className="record-player-play mini-play" onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause Christmas music' : 'Play Christmas music'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    </div>}
  </aside>
}
