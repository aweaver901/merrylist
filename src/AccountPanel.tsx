import { useEffect, useState } from 'react'
import { LockKeyhole, LogOut, RefreshCw } from 'lucide-react'
import { useCoordination } from './Coordination'
import { coordinationClient as client } from './lib/coordination'

const signInError = 'Google sign-in was canceled or could not finish. Please try again.'

export default function AccountPanel() {
  const { configured, session, snapshot, loading, stale, error, refresh } = useCoordination()
  const [busy, setBusy] = useState(false)
  const [accountError, setAccountError] = useState('')

  useEffect(() => {
    const resetBusy = () => setBusy(false)
    window.addEventListener('pageshow', resetBusy)
    return () => window.removeEventListener('pageshow', resetBusy)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    if (!['error', 'error_code', 'error_description'].some(key => url.searchParams.has(key) || hash.has(key))) return
    setAccountError(signInError)
    const hasHashError = ['error', 'error_code', 'error_description'].some(key => hash.has(key))
    for (const key of ['error', 'error_code', 'error_description']) {
      url.searchParams.delete(key); hash.delete(key)
    }
    if (hasHashError) url.hash = hash.toString()
    window.history.replaceState(window.history.state, '', url)
  }, [])

  const signIn = async () => {
    if (!client || busy) return
    setBusy(true); setAccountError('')
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href
      const { error: failure } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      })
      if (failure) throw failure
    } catch {
      setAccountError(signInError)
      setBusy(false)
    }
  }

  const signOut = async () => {
    if (!client || busy) return
    setBusy(true); setAccountError('')
    try {
      const { error: failure } = await client.auth.signOut()
      if (failure) throw failure
    } catch { setAccountError('Could not sign out. Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="coordination-panel" id="gift-coordination" aria-label="Gift coordination">
    <div className="coordination-heading"><LockKeyhole size={21} aria-hidden="true" /><div><strong>{snapshot?.role === 'owner' ? 'Your surprises are safe' : 'A little Secret Santa teamwork'}</strong>
      <p>{!configured ? 'Shared gift reservations are coming soon.' : snapshot?.role === 'owner' ? 'You’re viewing your wish list. Reservation and purchase details are hidden from your account.' : session ? loading ? 'Checking your account…' : snapshot?.role === 'shopper' ? 'Reserve a gift in its details so other shoppers know it’s covered. Statuses refresh about every two seconds.' : 'Coordination is not ready for this account yet.' : 'Sign in with Google to see what’s already covered and keep your gift a surprise.'}</p></div>
      {configured && (session ? <button className="text-button" disabled={busy} onClick={() => void signOut()}><LogOut size={15} /> Sign out</button> : <button className="outline-button google-signin" disabled={busy || loading} onClick={() => void signIn()}>{busy ? 'Opening Google…' : loading ? 'Checking sign-in…' : 'Sign in with Google'}</button>)}
    </div>
    {configured && !session && <p className="claim-hint google-signin-note">Use your own Google account. Other shoppers won’t see your name or email.</p>}
    {session && snapshot?.role !== 'owner' && <div className="coordination-sync"><button className="text-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={13} /> Refresh status</button><span role="status">{loading ? 'Checking…' : stale ? 'Connection needs attention' : snapshot?.role === 'shopper' ? 'Up to date' : 'Setup pending'}</span></div>}
    {error && <p className="coordination-error" role="alert">{error}</p>}
    {snapshot?.role === 'unverified' && <p className="claim-hint">Sign out and try again with a verified Google account before reserving gifts.</p>}
    {accountError && <p role="alert" className="coordination-error">{accountError}</p>}
  </section>
}
