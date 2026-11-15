import { createClient } from '@supabase/supabase-js'
import { giftThemes, type Gift, type GiftTheme } from '../data/gifts'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const coordinationClient = url && key ? createClient(url, key) : null

export type GiftStatus = 'available' | 'considering' | 'bought'
export type Claim = { giftId: string; status: GiftStatus; mine: boolean; revision: number }
export type CoordinationSnapshot = { role: 'owner' | 'shopper' | 'unconfigured' | 'unverified' | 'guest'; gifts: Claim[] }
export type GiftSuggestionStatus = 'pending' | 'approved' | 'denied'
export type GiftSuggestion = { id: string; status: GiftSuggestionStatus; createdAt: string; gift: Gift }
export type GiftSuggestionInput = Omit<Gift, 'id' | 'image'> & { image: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function readGift(value: unknown): Gift {
  if (!isRecord(value)) throw new Error('Invalid gift response')
  const { id, name, cost, theme, link, description, image, note, tags } = value
  if (typeof id !== 'string' || typeof name !== 'string' || typeof cost !== 'number' || !Number.isFinite(cost) ||
      typeof theme !== 'string' || !giftThemes.includes(theme as GiftTheme) ||
      typeof link !== 'string' || !link.startsWith('https://') ||
      typeof description !== 'string' || (image !== null && typeof image !== 'string') ||
      typeof note !== 'string' || !Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
    throw new Error('Invalid gift response')
  }
  return { id, name, cost, theme: theme as GiftTheme, link, description, image: image ?? '', note, tags }
}

export function readApprovedIdeas(value: unknown): Gift[] {
  if (!Array.isArray(value)) throw new Error('Invalid approved gift response')
  return value.map(readGift)
}

export function readGiftSuggestions(value: unknown): GiftSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) throw new Error('Invalid gift suggestion response')
  return value.suggestions.map((entry): GiftSuggestion => {
    if (!isRecord(entry) || typeof entry.id !== 'string' ||
        !['pending', 'approved', 'denied'].includes(String(entry.status)) ||
        typeof entry.createdAt !== 'string') {
      throw new Error('Invalid gift suggestion response')
    }
    return {
      id: entry.id,
      status: entry.status as GiftSuggestionStatus,
      createdAt: entry.createdAt,
      gift: readGift(entry.gift),
    }
  })
}

export function readSnapshot(value: unknown): CoordinationSnapshot {
  if (!value || typeof value !== 'object' || !('role' in value) || !('gifts' in value)) throw new Error('Invalid coordination response')
  const { role, gifts } = value
  if (!['owner', 'shopper', 'unconfigured', 'unverified', 'guest'].includes(String(role)) || !Array.isArray(gifts)) throw new Error('Invalid coordination response')
  // Defensive client boundary; the database also excludes all owner purchase data.
  if (role !== 'shopper') return { role: role as CoordinationSnapshot['role'], gifts: [] }
  if (!gifts.every(gift => gift && typeof gift.giftId === 'string' && ['available', 'considering', 'bought'].includes(gift.status) && typeof gift.mine === 'boolean' && Number.isInteger(gift.revision))) throw new Error('Invalid coordination response')
  return { role: 'shopper', gifts }
}
