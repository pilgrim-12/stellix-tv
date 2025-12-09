/**
 * Channel Data Service - New aggregated structure
 *
 * Instead of storing each channel as a separate document (11,000+ reads),
 * we store all active channels in a single document (1 read).
 *
 * Structure:
 * - channelData/active - all active channels in one JSON array
 * - channelData/metadata - stats and version info
 */

import { db } from './firebase'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { Channel } from '@/types'
import { trackRead, trackWrite } from './firebaseQuotaTracker'

// Types
export interface StoredChannel {
  id: string
  name: string
  url: string
  logo: string | null
  group: string
  language: string | null
  country: string | null
}

interface ChannelDataDocument {
  channels: StoredChannel[]
  updatedAt: Timestamp
  count: number
  version: number
}

interface MetadataDocument {
  totalChannels: number
  totalChunks?: number
  updatedAt: Timestamp
  version: number
}

// In-memory cache
let cachedChannels: Channel[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get all active channels from the new aggregated structure
 * Returns cached data if available and not expired
 */
export async function getActiveChannelsV2(): Promise<Channel[]> {
  // Return cached data if valid
  if (cachedChannels && Date.now() - cacheTimestamp < CACHE_TTL) {
    console.log('[ChannelData] Returning cached channels:', cachedChannels.length)
    return cachedChannels
  }

  try {
    // First check for metadata to see if we have chunks
    const metaRef = doc(db, 'channelData', 'metadata')
    const metaSnap = await getDoc(metaRef)

    if (metaSnap.exists()) {
      const metadata = metaSnap.data() as MetadataDocument
      trackRead('getActiveChannelsV2_metadata')

      if (metadata.totalChunks && metadata.totalChunks > 1) {
        // Multiple chunks - load all
        const allChannels: StoredChannel[] = []

        for (let i = 0; i < metadata.totalChunks; i++) {
          const chunkRef = doc(db, 'channelData', `active_${i}`)
          const chunkSnap = await getDoc(chunkRef)
          trackRead(`getActiveChannelsV2_chunk_${i}`)

          if (chunkSnap.exists()) {
            const chunkData = chunkSnap.data() as ChannelDataDocument
            allChannels.push(...chunkData.channels)
          }
        }

        cachedChannels = convertToAppChannels(allChannels)
        cacheTimestamp = Date.now()
        console.log('[ChannelData] Loaded from chunks:', cachedChannels.length)
        return cachedChannels
      }
    }

    // Single document
    const docRef = doc(db, 'channelData', 'active')
    const docSnap = await getDoc(docRef)
    trackRead('getActiveChannelsV2')

    if (docSnap.exists()) {
      const data = docSnap.data() as ChannelDataDocument
      cachedChannels = convertToAppChannels(data.channels)
      cacheTimestamp = Date.now()
      console.log('[ChannelData] Loaded channels:', cachedChannels.length)
      return cachedChannels
    }

    console.log('[ChannelData] No data found, returning empty array')
    return []
  } catch (error) {
    console.error('[ChannelData] Error loading channels:', error)
    // Return cached data even if expired, if available
    if (cachedChannels) {
      console.log('[ChannelData] Returning stale cache on error')
      return cachedChannels
    }
    return []
  }
}

/**
 * Check if new structure exists
 */
export async function hasNewStructure(): Promise<boolean> {
  try {
    const docRef = doc(db, 'channelData', 'active')
    const docSnap = await getDoc(docRef)
    trackRead('hasNewStructure')
    return docSnap.exists()
  } catch {
    return false
  }
}

/**
 * Get metadata about the channel data
 */
export async function getChannelDataMetadata(): Promise<{ count: number; updatedAt: Date | null } | null> {
  try {
    // Check metadata document first
    const metaRef = doc(db, 'channelData', 'metadata')
    const metaSnap = await getDoc(metaRef)

    if (metaSnap.exists()) {
      const data = metaSnap.data() as MetadataDocument
      trackRead('getChannelDataMetadata')
      return {
        count: data.totalChannels,
        updatedAt: data.updatedAt?.toDate() || null,
      }
    }

    // Fallback to active document
    const docRef = doc(db, 'channelData', 'active')
    const docSnap = await getDoc(docRef)
    trackRead('getChannelDataMetadata')

    if (docSnap.exists()) {
      const data = docSnap.data() as ChannelDataDocument
      return {
        count: data.count || data.channels?.length || 0,
        updatedAt: data.updatedAt?.toDate() || null,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Save channels to the new structure
 * Used by migration and admin tools
 */
export async function saveChannelData(channels: StoredChannel[]): Promise<void> {
  const jsonSize = JSON.stringify(channels).length

  if (jsonSize > 900000) {
    // Split into chunks
    const chunkSize = 500
    const chunks: StoredChannel[][] = []

    for (let i = 0; i < channels.length; i += chunkSize) {
      chunks.push(channels.slice(i, i + chunkSize))
    }

    // Save chunks
    for (let i = 0; i < chunks.length; i++) {
      const docRef = doc(db, 'channelData', `active_${i}`)
      await setDoc(docRef, {
        channels: chunks[i],
        updatedAt: Timestamp.now(),
        count: chunks[i].length,
        chunkIndex: i,
        totalChunks: chunks.length,
        version: 1,
      })
      trackWrite(`saveChannelData_chunk_${i}`)
    }

    // Save metadata
    const metaRef = doc(db, 'channelData', 'metadata')
    await setDoc(metaRef, {
      totalChannels: channels.length,
      totalChunks: chunks.length,
      updatedAt: Timestamp.now(),
      version: 1,
    })
    trackWrite('saveChannelData_metadata')

  } else {
    // Single document
    const docRef = doc(db, 'channelData', 'active')
    await setDoc(docRef, {
      channels,
      updatedAt: Timestamp.now(),
      count: channels.length,
      version: 1,
    })
    trackWrite('saveChannelData')
  }

  // Invalidate cache
  cachedChannels = null
  cacheTimestamp = 0
}

/**
 * Invalidate cache (call when channels are updated elsewhere)
 */
export function invalidateCache(): void {
  cachedChannels = null
  cacheTimestamp = 0
}

/**
 * Convert stored channels to app Channel format
 */
function convertToAppChannels(stored: StoredChannel[]): Channel[] {
  return stored.map((ch) => ({
    id: ch.id,
    name: ch.name,
    url: ch.url,
    logo: ch.logo || '',
    group: ch.group || 'entertainment',
    language: ch.language || undefined,
    country: ch.country || undefined,
    isOffline: false,
  }))
}

/**
 * Get available languages from cached channels
 */
export function getAvailableLanguagesV2(): string[] {
  if (!cachedChannels) return []

  const languages = new Set<string>()
  cachedChannels.forEach((ch) => {
    if (ch.language) {
      languages.add(ch.language)
    }
  })
  return Array.from(languages).sort()
}

/**
 * Get available categories from cached channels
 */
export function getAvailableCategoriesV2(): string[] {
  if (!cachedChannels) return []

  const categories = new Set<string>()
  cachedChannels.forEach((ch) => {
    if (ch.group) {
      categories.add(ch.group)
    }
  })
  return Array.from(categories).sort()
}
