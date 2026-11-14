import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const coordinationClient = url && key ? createClient(url, key) : null

export type GiftStatus = 'available' | 'considering' | 'bought'
export type Claim = { giftId: string; status: GiftStatus; mine: boolean; revision: number }
export type CoordinationSnapshot = { role: 'owner' | 'shopper' | 'unconfigured' | 'unverified' | 'guest'; gifts: Claim[] }

export function readSnapshot(value: unknown): CoordinationSnapshot {
  if (!value || typeof value !== 'object' || !('role' in value) || !('gifts' in value)) throw new Error('Invalid coordination response')
  const { role, gifts } = value
  if (!['owner', 'shopper', 'unconfigured', 'unverified', 'guest'].includes(String(role)) || !Array.isArray(gifts)) throw new Error('Invalid coordination response')
  // Defensive client boundary; the database also excludes all owner purchase data.
  if (role !== 'shopper') return { role: role as CoordinationSnapshot['role'], gifts: [] }
  if (!gifts.every(gift => gift && typeof gift.giftId === 'string' && ['available', 'considering', 'bought'].includes(gift.status) && typeof gift.mine === 'boolean' && Number.isInteger(gift.revision))) throw new Error('Invalid coordination response')
  return { role: 'shopper', gifts }
}
