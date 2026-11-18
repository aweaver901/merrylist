import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { fallbackChristmasSongs } from './data/christmasSongs'
import type { Gift } from './data/gifts'
import { coordinationClient as client, readApprovedIdeas, readChristmasSongs, readGiftPublicSettings, readGiftSuggestions, readShopperChatMessages, readSnapshot, readSpotifyPlaylistSetting, type ChristmasSong, type ChristmasSongInput, type Claim, type CoordinationSnapshot, type GiftStatus, type GiftSuggestion, type GiftSuggestionInput, type ShopperChatMessage, type SpotifyPlaylist } from './lib/coordination'

const builtInChristmasSongs: ChristmasSong[] = fallbackChristmasSongs.map((song, index) => ({
  ...song,
  id: `built-in-${index + 1}`,
}))

function mergeChristmasSongs(songs: ChristmasSong[]) {
  const songsByAudioUrl = new Map(builtInChristmasSongs.map(song => [song.audioUrl, song]))
  for (const song of songs) songsByAudioUrl.set(song.audioUrl, song)
  return [...songsByAudioUrl.values()]
}

type Coordination = {
  configured: boolean; session: Session | null; snapshot: CoordinationSnapshot | null
  loading: boolean; error: string; stale: boolean; busyGift: string | null
  approvedIdeas: Gift[]; suggestions: GiftSuggestion[]; suggestionsLoading: boolean
  suggestionsBusy: boolean; suggestionsError: string
  giftOverrides: Gift[]; favoriteGiftIds: string[]; giftSettingsBusy: boolean; giftSettingsError: string
  chatMessages: ShopperChatMessage[]; chatLoading: boolean; chatBusy: boolean; chatError: string
  christmasSongs: ChristmasSong[]; musicLoading: boolean; musicError: string; musicBusy: boolean
  spotifyPlaylist: SpotifyPlaylist | null; spotifyPlaylistLoading: boolean; spotifyPlaylistBusy: boolean; spotifyPlaylistError: string
  refresh: () => Promise<void>; change: (giftId: string, status: GiftStatus) => Promise<void>
  refreshSuggestions: () => Promise<void>
  submitSuggestion: (gift: GiftSuggestionInput) => Promise<boolean>
  reviewSuggestion: (id: string, status: 'approved' | 'denied') => Promise<boolean>
  addOwnerGift: (gift: GiftSuggestionInput) => Promise<boolean>
  refreshGiftSettings: () => Promise<void>
  saveGiftDetails: (gift: Gift) => Promise<{ ok: boolean; error?: string }>
  setOwnerGiftFavorite: (giftId: string, favorite: boolean) => Promise<boolean>
  refreshChat: () => Promise<void>
  sendChatMessage: (message: string) => Promise<boolean>
  deleteChatMessage: (id: number) => Promise<boolean>
  refreshChristmasSongs: () => Promise<boolean>
  addChristmasSong: (song: ChristmasSongInput) => Promise<boolean>
  refreshSpotifyPlaylist: () => Promise<void>
  setSpotifyPlaylist: (playlist: SpotifyPlaylist | null) => Promise<boolean>
}
const Context = createContext<Coordination | null>(null)
export const useCoordination = () => {
  const context = useContext(Context)
  if (!context) throw new Error('CoordinationProvider is required')
  return context
}

export function CoordinationProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [snapshot, setSnapshot] = useState<CoordinationSnapshot | null>(null)
  const [loading, setLoading] = useState(Boolean(client))
  const [error, setError] = useState('')
  const [stale, setStale] = useState(true)
  const [busyGift, setBusyGift] = useState<string | null>(null)
  const [approvedIdeas, setApprovedIdeas] = useState<Gift[]>([])
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(Boolean(client))
  const [suggestionsBusy, setSuggestionsBusy] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [giftOverrides, setGiftOverrides] = useState<Gift[]>([])
  const [favoriteGiftIds, setFavoriteGiftIds] = useState<string[]>([])
  const [giftSettingsBusy, setGiftSettingsBusy] = useState(false)
  const [giftSettingsError, setGiftSettingsError] = useState('')
  const [chatMessages, setChatMessages] = useState<ShopperChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const [christmasSongs, setChristmasSongs] = useState<ChristmasSong[]>(builtInChristmasSongs)
  const [musicLoading, setMusicLoading] = useState(Boolean(client))
  const [musicError, setMusicError] = useState('')
  const [musicBusy, setMusicBusy] = useState(false)
  const [spotifyPlaylist, setSpotifyPlaylistValue] = useState<SpotifyPlaylist | null>(null)
  const [spotifyPlaylistLoading, setSpotifyPlaylistLoading] = useState(Boolean(client))
  const [spotifyPlaylistBusy, setSpotifyPlaylistBusy] = useState(false)
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState('')
  const identity = useRef<string | null>(null)
  const generation = useRef(0)
  const request = useRef(0)
  const suggestionRequest = useRef(0)
  const giftSettingsRequest = useRef(0)
  const chatRequest = useRef(0)
  const musicRequest = useRef(0)
  const spotifyPlaylistRequest = useRef(0)
  const musicLoaded = useRef(false)
  const chatLoaded = useRef(false)
  const mutating = useRef(false)
  const suggestionMutation = useRef(false)
  const giftSettingsMutation = useRef(false)
  const chatMutation = useRef(false)
  const musicMutation = useRef(false)
  const spotifyPlaylistMutation = useRef(false)

  useEffect(() => {
    if (!client) return
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      // Clear purchase data synchronously before any account change is rendered.
      identity.current = nextSession?.user.id ?? null
      generation.current++
      request.current++
      suggestionRequest.current++
      chatRequest.current++
      setSnapshot(null); setStale(true); setError(''); setSession(nextSession); setLoading(Boolean(nextSession))
      setBusyGift(null); mutating.current = false; suggestionMutation.current = false
      setApprovedIdeas([]); setSuggestions([]); setSuggestionsError(''); setSuggestionsLoading(Boolean(nextSession))
      setSuggestionsBusy(false)
      giftSettingsMutation.current = false; setGiftSettingsBusy(false)
      setChatMessages([]); setChatError(''); setChatLoading(false); setChatBusy(false)
      chatLoaded.current = false; chatMutation.current = false
      musicMutation.current = false; setMusicBusy(false)
    })
    return () => { subscription.unsubscribe(); identity.current = null; generation.current++; request.current++; suggestionRequest.current++; giftSettingsRequest.current++; chatRequest.current++ }
  }, [])

  const refresh = useCallback(async () => {
    if (!client || !session) return
    const account = session.user.id
    const version = generation.current
    const ticket = ++request.current
    try {
      const { data, error: failure } = await client.rpc('gift_coordination').abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      const next = readSnapshot(data)
      if (identity.current !== account || generation.current !== version || ticket !== request.current) return
      setSnapshot(next); setStale(false); setError('')
    } catch {
      if (identity.current !== account || generation.current !== version || ticket !== request.current) return
      setStale(true); setError('Gift coordination is unavailable. Refresh before reserving or purchasing.')
    } finally {
      if (identity.current === account && generation.current === version && ticket === request.current) setLoading(false)
    }
  }, [session])

  const refreshChat = useCallback(async () => {
    if (!client || !session || snapshot?.role !== 'shopper') return
    const account = session.user.id
    const version = generation.current
    const ticket = ++chatRequest.current
    if (!chatLoaded.current) setChatLoading(true)
    try {
      const { data, error: failure } = await client.rpc('get_chat_messages').abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      const next = readShopperChatMessages(data)
      if (identity.current !== account || generation.current !== version || ticket !== chatRequest.current) return
      chatLoaded.current = true
      setChatMessages(next)
      setChatError('')
    } catch {
      if (identity.current !== account || generation.current !== version || ticket !== chatRequest.current) return
      setChatError('The shopper chat could not be loaded. Please try again.')
    } finally {
      if (identity.current === account && generation.current === version && ticket === chatRequest.current) setChatLoading(false)
    }
  }, [session, snapshot?.role])

  const refreshSuggestions = useCallback(async () => {
    if (!client) return
    const account = session?.user.id ?? null
    const version = generation.current
    const ticket = ++suggestionRequest.current
    setSuggestionsLoading(true)
    try {
      const approvedRequest = client.rpc('approved_gift_ideas').abortSignal(AbortSignal.timeout(12000))
      const suggestionsRequest = session
        ? client.rpc('gift_ideas').abortSignal(AbortSignal.timeout(12000))
        : Promise.resolve({ data: null, error: null })
      const [approvedResponse, suggestionsResponse] = await Promise.all([approvedRequest, suggestionsRequest])
      if (approvedResponse.error) throw approvedResponse.error
      if (suggestionsResponse.error) throw suggestionsResponse.error
      const nextApprovedIdeas = readApprovedIdeas(approvedResponse.data)
      const nextSuggestions = session ? readGiftSuggestions(suggestionsResponse.data) : []
      if (identity.current !== account || generation.current !== version || ticket !== suggestionRequest.current) return
      setApprovedIdeas(nextApprovedIdeas)
      setSuggestions(nextSuggestions)
      setSuggestionsError('')
    } catch {
      if (identity.current !== account || generation.current !== version || ticket !== suggestionRequest.current) return
      setSuggestionsError('Gift ideas could not be refreshed. Please try again.')
    } finally {
      if (identity.current === account && generation.current === version && ticket === suggestionRequest.current) setSuggestionsLoading(false)
    }
  }, [session])

  const refreshGiftSettings = useCallback(async () => {
    if (!client) return
    const ticket = ++giftSettingsRequest.current
    try {
      const { data, error: failure } = await client.rpc('gift_public_settings').abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      const next = readGiftPublicSettings(data)
      if (ticket !== giftSettingsRequest.current) return
      setGiftOverrides(next.overrides)
      setFavoriteGiftIds(next.favoriteGiftIds)
      setGiftSettingsError('')
    } catch {
      if (ticket !== giftSettingsRequest.current) return
      setGiftSettingsError('Gift details and favorites could not be loaded. Please refresh the page.')
    }
  }, [])

  const refreshChristmasSongs = useCallback(async () => {
    if (!client) return false
    const ticket = ++musicRequest.current
    if (!musicLoaded.current) setMusicLoading(true)
    try {
      const { data, error: failure } = await client.rpc('christmas_songs').abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      const next = readChristmasSongs(data)
      if (ticket !== musicRequest.current) return false
      musicLoaded.current = true
      setChristmasSongs(mergeChristmasSongs(next))
      setMusicError('')
      return true
    } catch {
      if (ticket !== musicRequest.current) return false
      setMusicError('The online playlist is unavailable. The built-in carols are still available; check your connection to load added songs.')
      return false
    } finally {
      if (ticket === musicRequest.current) setMusicLoading(false)
    }
  }, [])

  const refreshSpotifyPlaylist = useCallback(async () => {
    if (!client) return
    const ticket = ++spotifyPlaylistRequest.current
    setSpotifyPlaylistLoading(true)
    try {
      const { data, error: failure } = await client.rpc('spotify_playlist_setting').abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      const next = readSpotifyPlaylistSetting(data)
      if (ticket !== spotifyPlaylistRequest.current) return
      setSpotifyPlaylistValue(next)
      setSpotifyPlaylistError('')
    } catch {
      if (ticket !== spotifyPlaylistRequest.current) return
      setSpotifyPlaylistError('The shared Spotify playlist could not be loaded. Please refresh the page.')
    } finally {
      if (ticket === spotifyPlaylistRequest.current) setSpotifyPlaylistLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { void refreshSuggestions() }, [refreshSuggestions])
  useEffect(() => { void refreshGiftSettings() }, [refreshGiftSettings])
  useEffect(() => { void refreshChristmasSongs() }, [refreshChristmasSongs])
  useEffect(() => { void refreshSpotifyPlaylist() }, [refreshSpotifyPlaylist])
  useEffect(() => {
    if (!session || snapshot?.role === 'owner') return
    const sync = () => { if (document.visibilityState === 'visible') void refresh() }
    const interval = window.setInterval(sync, 2000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [session, snapshot?.role, refresh])

  useEffect(() => {
    const supabase = client
    if (!supabase || !session || snapshot?.role !== 'shopper') return
    const channel = supabase.channel('gift-claim-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_claim_updates' }, () => { void refresh() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [session, snapshot?.role, refresh])

  useEffect(() => {
    if (!session) return
    const sync = () => { if (document.visibilityState === 'visible') void refreshSuggestions() }
    const interval = window.setInterval(sync, 15000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [session, refreshSuggestions])

  useEffect(() => {
    const sync = () => { if (document.visibilityState === 'visible') void refreshGiftSettings() }
    const interval = window.setInterval(sync, 15000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [refreshGiftSettings])

  useEffect(() => {
    const sync = () => { if (document.visibilityState === 'visible') void refreshSpotifyPlaylist() }
    const interval = window.setInterval(sync, 15000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [refreshSpotifyPlaylist])

  useEffect(() => {
    if (!session || snapshot?.role !== 'shopper') {
      setChatMessages([])
      return
    }
    const sync = () => { if (document.visibilityState === 'visible') void refreshChat() }
    sync()
    const interval = window.setInterval(sync, 4000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [session, snapshot?.role, refreshChat])

  useEffect(() => {
    const sync = () => { if (document.visibilityState === 'visible') void refreshChristmasSongs() }
    const interval = window.setInterval(sync, 30000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync) }
  }, [refreshChristmasSongs])

  const change = async (giftId: string, status: GiftStatus) => {
    if (!client || snapshot?.role !== 'shopper' || stale || mutating.current) return
    const claim = snapshot.gifts.find(gift => gift.giftId === giftId)
    if (!claim) return
    const version = generation.current
    mutating.current = true; setBusyGift(giftId); setError('')
    try {
      const { error: failure } = await client.rpc('set_gift_claim', { p_gift_id: giftId, p_status: status, p_revision: claim.revision }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      await refresh()
    } catch {
      if (generation.current !== version) return
      await refresh()
      if (generation.current === version) setError('That change could not be confirmed. Check the latest status; another shopper may have claimed this gift.')
    } finally {
      mutating.current = false
      if (generation.current === version) setBusyGift(null)
    }
  }

  const submitSuggestion = async (gift: GiftSuggestionInput) => {
    if (!client || !session || snapshot?.role !== 'shopper' || suggestionMutation.current) return false
    const version = generation.current
    suggestionMutation.current = true; setSuggestionsBusy(true); setSuggestionsError('')
    try {
      const { error: failure } = await client.rpc('submit_gift_idea', {
        p_name: gift.name,
        p_cost: gift.cost,
        p_theme: gift.theme,
        p_link: gift.link,
        p_description: gift.description,
        p_image_url: gift.image || null,
        p_note: gift.note,
        p_tags: gift.tags,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      await Promise.all([refreshSuggestions(), refresh()])
      return true
    } catch {
      if (generation.current === version) setSuggestionsError('Your gift idea could not be submitted. Please check the details and try again.')
      return false
    } finally {
      if (generation.current === version) { suggestionMutation.current = false; setSuggestionsBusy(false) }
    }
  }

  const reviewSuggestion = async (id: string, status: 'approved' | 'denied') => {
    if (!client || snapshot?.role !== 'owner' || suggestionMutation.current) return false
    const version = generation.current
    suggestionMutation.current = true; setSuggestionsBusy(true); setSuggestionsError('')
    try {
      const { error: failure } = await client.rpc('review_gift_idea', { p_id: id, p_status: status }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      await Promise.all([refreshSuggestions(), refresh()])
      return true
    } catch {
      if (generation.current === version) setSuggestionsError('That review could not be saved. Refresh the ideas and try again.')
      return false
    } finally {
      if (generation.current === version) { suggestionMutation.current = false; setSuggestionsBusy(false) }
    }
  }
  const addOwnerGift = async (gift: GiftSuggestionInput) => {
    if (!client || !session || snapshot?.role !== 'owner' || suggestionMutation.current) return false
    const version = generation.current
    suggestionMutation.current = true; setSuggestionsBusy(true); setSuggestionsError('')
    try {
      const { error: failure } = await client.rpc('add_owner_gift', {
        p_name: gift.name,
        p_cost: gift.cost,
        p_theme: gift.theme,
        p_link: gift.link,
        p_description: gift.description,
        p_image_url: gift.image || null,
        p_note: gift.note,
        p_tags: gift.tags,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      await Promise.all([refreshSuggestions(), refresh()])
      return true
    } catch {
      if (generation.current === version) setSuggestionsError('The gift could not be added to the list. Please check the details and try again.')
      return false
    } finally {
      if (generation.current === version) { suggestionMutation.current = false; setSuggestionsBusy(false) }
    }
  }

  const saveGiftDetails = async (gift: Gift) => {
    if (!client || snapshot?.role !== 'owner' || giftSettingsMutation.current) {
      return { ok: false, error: 'Gift details can only be changed by the list owner.' }
    }
    giftSettingsMutation.current = true; setGiftSettingsBusy(true); setGiftSettingsError('')
    try {
      const { error: failure } = await client.rpc('save_gift_details', {
        p_gift_id: gift.id,
        p_name: gift.name,
        p_cost: gift.cost,
        p_theme: gift.theme,
        p_link: gift.link,
        p_description: gift.description,
        p_image_url: gift.image || null,
        p_note: gift.note,
        p_tags: gift.tags,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      setGiftOverrides(current => [...current.filter(item => item.id !== gift.id), gift])
      void refreshGiftSettings()
      return { ok: true }
    } catch {
      const error = 'The gift could not be saved. Please check the details and try again.'
      setGiftSettingsError(error)
      return { ok: false, error }
    } finally {
      giftSettingsMutation.current = false
      setGiftSettingsBusy(false)
    }
  }

  const setOwnerGiftFavorite = async (giftId: string, favorite: boolean) => {
    if (!client || snapshot?.role !== 'owner' || giftSettingsMutation.current) return false
    giftSettingsMutation.current = true; setGiftSettingsBusy(true); setGiftSettingsError('')
    try {
      const { error: failure } = await client.rpc('set_owner_gift_favorite', {
        p_gift_id: giftId,
        p_favorite: favorite,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      setFavoriteGiftIds(current => favorite
        ? current.includes(giftId) ? current : [...current, giftId]
        : current.filter(id => id !== giftId))
      void refreshGiftSettings()
      return true
    } catch {
      setGiftSettingsError('The gift favorite could not be updated. Please try again.')
      return false
    } finally {
      giftSettingsMutation.current = false
      setGiftSettingsBusy(false)
    }
  }

  const sendChatMessage = async (message: string) => {
    const cleanMessage = message.trim()
    if (!client || !session || snapshot?.role !== 'shopper' || !cleanMessage || chatMutation.current) return false
    const version = generation.current
    chatMutation.current = true; setChatBusy(true); setChatError('')
    try {
      const { error: failure } = await client.rpc('send_chat_message', { p_message: cleanMessage }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      await refreshChat()
      return true
    } catch {
      if (generation.current === version) setChatError('Your message could not be sent. Please try again.')
      return false
    } finally {
      if (generation.current === version) { chatMutation.current = false; setChatBusy(false) }
    }
  }

  const deleteChatMessage = async (id: number) => {
    if (!client || !session || snapshot?.role !== 'shopper' || chatMutation.current) return false
    const version = generation.current
    chatMutation.current = true; setChatBusy(true); setChatError('')
    try {
      const { error: failure } = await client.rpc('delete_chat_message', { p_id: id }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      await refreshChat()
      return true
    } catch {
      if (generation.current === version) setChatError('That message could not be deleted. Please refresh the chat and try again.')
      return false
    } finally {
      if (generation.current === version) { chatMutation.current = false; setChatBusy(false) }
    }
  }
  const addChristmasSong = async (song: ChristmasSongInput) => {
    if (!client || !session || snapshot?.role !== 'owner' || musicMutation.current) return false
    const version = generation.current
    musicMutation.current = true; setMusicBusy(true); setMusicError('')
    try {
      const { error: failure } = await client.rpc('add_christmas_song', {
        p_title: song.title,
        p_artist: song.artist,
        p_audio_url: song.audioUrl,
        p_source_url: song.sourceUrl,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      if (generation.current !== version) return false
      void refreshChristmasSongs()
      return true
    } catch {
      if (generation.current === version) setMusicError('The song could not be added to the music library. Please check the details and try again.')
      return false
    } finally {
      if (generation.current === version) { musicMutation.current = false; setMusicBusy(false) }
    }
  }
  const setSpotifyPlaylist = async (playlist: SpotifyPlaylist | null) => {
    if (!client || snapshot?.role !== 'owner' || spotifyPlaylistMutation.current) return false
    spotifyPlaylistMutation.current = true
    setSpotifyPlaylistBusy(true)
    setSpotifyPlaylistError('')
    try {
      const { error: failure } = await client.rpc('set_spotify_playlist', {
        p_playlist_id: playlist?.id ?? null,
        p_playlist_name: playlist?.name ?? null,
      }).abortSignal(AbortSignal.timeout(12000))
      if (failure) throw failure
      setSpotifyPlaylistValue(playlist)
      void refreshSpotifyPlaylist()
      return true
    } catch {
      setSpotifyPlaylistError('The Spotify playlist could not be saved. Please try again.')
      return false
    } finally {
      spotifyPlaylistMutation.current = false
      setSpotifyPlaylistBusy(false)
    }
  }
  return <Context.Provider value={{
    configured: Boolean(client), session, snapshot, loading, error, stale, busyGift, refresh, change,
    approvedIdeas, suggestions, suggestionsLoading, suggestionsBusy, suggestionsError,
    giftOverrides, favoriteGiftIds, giftSettingsBusy, giftSettingsError,
    refreshSuggestions, submitSuggestion, reviewSuggestion, addOwnerGift,
    refreshGiftSettings, saveGiftDetails, setOwnerGiftFavorite,
    chatMessages, chatLoading, chatBusy, chatError, refreshChat, sendChatMessage, deleteChatMessage,
    christmasSongs, musicLoading, musicError, musicBusy, refreshChristmasSongs, addChristmasSong,
    spotifyPlaylist, spotifyPlaylistLoading, spotifyPlaylistBusy, spotifyPlaylistError, refreshSpotifyPlaylist, setSpotifyPlaylist,
  }}>{children}</Context.Provider>
}

export function GiftClaimBadge({ giftId }: { giftId: string }) {
  const { snapshot, stale } = useCoordination()
  if (snapshot?.role !== 'shopper') return null
  const claim = snapshot.gifts.find(gift => gift.giftId === giftId)
  if (!claim || stale) return <span className="claim-badge">Status unavailable</span>
  return <span className={`claim-badge claim-${claim.status}`}>{claim.status === 'available' ? 'Available to gift' : claim.status === 'bought' ? (claim.mine ? 'You bought this' : `Bought by ${claim.buyerName ?? 'a shopper'}`) : (claim.mine ? 'You’re considering this' : 'Someone is considering this')}</span>
}

export function GiftBoughtOverlay({ giftId }: { giftId: string }) {
  const { snapshot, stale } = useCoordination()
  if (stale || snapshot?.role !== 'shopper') return null
  const claim = snapshot.gifts.find(gift => gift.giftId === giftId)
  if (!claim || claim.status !== 'bought') return null
  return <span className="gift-bought-overlay">{claim.mine ? 'Bought by you' : `Bought by ${claim.buyerName ?? 'a shopper'}`}</span>
}

export function GiftClaimControls({ giftId }: { giftId: string }) {
  const { configured, session, snapshot, stale, busyGift, change } = useCoordination()
  if (!configured || snapshot?.role === 'owner') return null
  if (!session) return <p className="claim-hint">Sign in above the gift list to coordinate with other shoppers.</p>
  if (snapshot?.role !== 'shopper') return <p className="claim-hint">Gift coordination is not ready. Check the account panel above the list.</p>
  const claim: Claim | undefined = snapshot.gifts.find(gift => gift.giftId === giftId)
  const disabled = stale || Boolean(busyGift) || !claim
  return <div className="claim-controls">
    <GiftClaimBadge giftId={giftId} />
    {!claim || stale ? <p className="claim-hint">Refresh the list to check availability before purchasing.</p> : claim.status === 'available' || claim.mine ? <>
      <div className="claim-buttons">
        {claim.status !== 'considering' && <button className="outline-button" disabled={disabled} onClick={() => void change(giftId, 'considering')}>{claim.status === 'bought' ? 'Change to considering' : 'I’m considering this'}</button>}
        {claim.status !== 'bought' && <button className="primary-button" disabled={disabled} onClick={() => void change(giftId, 'bought')}>I bought this</button>}
        {claim.mine && <button className="text-button" disabled={disabled} onClick={() => void change(giftId, 'available')}>Mark as available</button>}
      </div><p className="claim-hint">{claim.mine ? 'Tap “Mark as available” to undo your Considering or Bought selection.' : 'Other shoppers can see the status and buyer name.'} Purchase details stay hidden from the list owner.</p>
    </> : <p className="claim-hint">Another shopper has this covered. Try a different gift to avoid a duplicate.</p>}
    {busyGift === giftId && <p role="status">Saving your choice…</p>}
  </div>
}

export function GiftPurchaseLink({ giftId, href }: { giftId: string; href: string }) {
  const { configured, session, snapshot, stale } = useCoordination()
  const claim = snapshot?.gifts.find(gift => gift.giftId === giftId)
  if (configured && snapshot?.role !== 'owner') {
    if (!session) return <span className="claim-hint">Sign in to check availability before shopping.</span>
    if (stale || snapshot?.role !== 'shopper' || !claim) return <span className="claim-hint">Check the latest gift status before shopping.</span>
    if (claim.status !== 'available' && !claim.mine) return <span className="claim-hint">This gift is covered by another shopper.</span>
  }
  return <a className="primary-button" href={href} target="_blank" rel="noreferrer">See the gift ↗</a>
}
