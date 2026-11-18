import { useEffect, useRef, useState } from 'react'
import ActionErrorNotice from './ActionErrorNotice'

type SpotifyEmbedController = { pause: () => void }
type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: string },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void
  }
}

let iframeApiPromise: Promise<SpotifyIframeApi> | null = null

function loadSpotifyIframeApi() {
  if (!iframeApiPromise) {
    iframeApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      script.onerror = () => reject(new Error('Spotify player could not be loaded. Check your connection and try again.'))
      window.onSpotifyIframeApiReady = api => {
        window.onSpotifyIframeApiReady = undefined
        resolve(api)
      }
      document.body.appendChild(script)
    }).catch(error => {
      iframeApiPromise = null
      throw error
    })
  }
  return iframeApiPromise
}

export default function SpotifyPlaylistEmbed({ playlistId, playlistName }: { playlistId: string; playlistName: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let controller: SpotifyEmbedController | null = null
    setError('')
    const pause = () => controller?.pause()
    const pauseWhenLeaving = () => {
      if (document.visibilityState === 'hidden') pause()
    }

    void loadSpotifyIframeApi().then(api => {
      const element = container.current
      if (!active || !element) return
      api.createController(element, {
        uri: `spotify:playlist:${playlistId}`,
        width: '100%',
        height: '352',
      }, nextController => {
        if (!active) {
          nextController.pause()
          return
        }
        controller = nextController
      })
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Spotify player could not be loaded.')
    })

    document.addEventListener('visibilitychange', pauseWhenLeaving)
    window.addEventListener('pagehide', pause)
    window.addEventListener('blur', pause)
    return () => {
      active = false
      pause()
      document.removeEventListener('visibilitychange', pauseWhenLeaving)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('blur', pause)
      container.current?.replaceChildren()
    }
  }, [playlistId])

  return <section className="spotify-embed-section" aria-label={`Spotify playlist ${playlistName}`}>
    <div ref={container} className="spotify-embed" />
    {error && <ActionErrorNotice key={`spotify-player:${error}`} action="Spotify player" message={error} />}
    <p className="claim-hint">Playback is provided by Spotify. Sign in to Spotify in the player if prompted.</p>
  </section>
}
