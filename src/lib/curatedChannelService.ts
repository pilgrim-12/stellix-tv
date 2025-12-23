/**
 * Curated Channel Service - New optimized Firestore structure
 *
 * OLD: 11,027 documents = 11,027 reads per query
 * NEW: 1 document = 1 read per query (99%+ savings)
 *
 * Collections:
 * - curated_channels/main - all active channels in one document
 * - playlist_sources/{id} - external playlist URLs for import
 */

import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { Channel, ChannelStatus } from '@/types'
import { trackRead, trackWrite, trackQuery } from './firebaseQuotaTracker'

// ==================== TYPES ====================

/**
 * Full channel data - same as before, but stored in single document
 */
export interface CuratedChannel {
  id: string
  name: string
  url: string
  logo: string | null
  group: string
  language: string | null
  country: string | null
  // Status fields
  status: 'pending' | 'active' | 'inactive' | 'broken'
  enabled: boolean
  isPrimary?: boolean
  // Order field for custom sorting
  order?: number
  // Metadata
  playlistId?: string
  labels?: string[]
  isCustom?: boolean
  // Timestamps (stored as ISO strings for JSON compatibility)
  createdAt?: string
  updatedAt?: string
  lastChecked?: string
  checkedBy?: string | null
}

export interface CuratedChannelsDoc {
  version: number
  updatedAt: Timestamp
  count: number
  channels: CuratedChannel[]
  // Stats for quick access without parsing all channels
  stats: {
    active: number
    pending: number
    broken: number
    inactive: number
  }
}

export interface PlaylistSource {
  id: string
  name: string
  url: string | null // null for file uploads
  type: 'url' | 'file'
  importedAt: string // ISO date
  channelCount: number
  addedCount: number // channels actually added (excluding duplicates)
  skippedCount: number // duplicates skipped
}

// ==================== CONSTANTS ====================

const CURATED_COLLECTION = 'curated_channels'
const CURATED_DOC_ID = 'main'
const SOURCES_COLLECTION = 'playlist_sources'

// ==================== CACHE ====================

let cachedChannels: Channel[] | null = null
let cacheTimestamp: number = 0
let cacheVersion: number = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * Invalidate the cache (call after updates)
 */
export function invalidateCuratedCache(): void {
  cachedChannels = null
  cacheTimestamp = 0
}

// ==================== CURATED CHANNELS ====================

/**
 * Get all curated channels (1 Firestore read)
 * Returns cached data if available and valid
 */
export async function getCuratedChannels(): Promise<Channel[]> {
  // Return cached data if valid
  if (cachedChannels && Date.now() - cacheTimestamp < CACHE_TTL) {
    console.log('[CuratedChannels] Cache hit, returning', cachedChannels.length, 'channels')
    return cachedChannels
  }

  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)
    const docSnap = await getDoc(docRef)
    trackRead('getCuratedChannels')

    if (!docSnap.exists()) {
      console.log('[CuratedChannels] No curated channels document found')
      return []
    }

    const data = docSnap.data() as CuratedChannelsDoc
    console.log('[CuratedChannels] Loaded', data.count, 'channels (version', data.version, ')')

    // Convert to Channel type with all fields preserved
    cachedChannels = data.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo || '',
      group: ch.group || 'entertainment',
      language: ch.language || undefined,
      country: ch.country || undefined,
      status: ch.status || 'pending',
      enabled: ch.enabled !== false,
      isPrimary: ch.isPrimary,
      order: ch.order,
      labels: ch.labels as Channel['labels'],
      isOffline: false,
    }))

    cacheTimestamp = Date.now()
    cacheVersion = data.version

    return cachedChannels
  } catch (error) {
    console.error('[CuratedChannels] Error loading channels:', error)
    // Return stale cache if available
    if (cachedChannels) {
      console.log('[CuratedChannels] Returning stale cache on error')
      return cachedChannels
    }
    return []
  }
}

/**
 * Get only active channels for /watch page (filtered from cache)
 * Sorted by order field
 */
export async function getActiveCuratedChannels(): Promise<Channel[]> {
  const allChannels = await getCuratedChannels()
  const activeChannels = allChannels.filter((ch) => ch.status === 'active' && ch.enabled !== false)
  // Sort by order field (channels without order come last)
  return activeChannels.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

/**
 * Get all channels with full data (for admin panel)
 */
export async function getAllCuratedChannelsRaw(): Promise<CuratedChannel[]> {
  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)
    const docSnap = await getDoc(docRef)
    trackRead('getAllCuratedChannelsRaw')

    if (!docSnap.exists()) {
      return []
    }

    const data = docSnap.data() as CuratedChannelsDoc
    return data.channels || []
  } catch (error) {
    console.error('[CuratedChannels] Error loading raw channels:', error)
    return []
  }
}

/**
 * Get curated channels metadata without loading all channels
 */
export async function getCuratedMetadata(): Promise<{ count: number; version: number; updatedAt: Date | null } | null> {
  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)
    const docSnap = await getDoc(docRef)
    trackRead('getCuratedMetadata')

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data() as CuratedChannelsDoc
    return {
      count: data.count,
      version: data.version,
      updatedAt: data.updatedAt?.toDate() || null,
    }
  } catch (error) {
    console.error('[CuratedChannels] Error getting metadata:', error)
    return null
  }
}

/**
 * Save all curated channels (replaces entire document)
 */
export async function saveCuratedChannels(channels: CuratedChannel[]): Promise<void> {
  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)

    // Get current version
    const currentDoc = await getDoc(docRef)
    const currentVersion = currentDoc.exists() ? (currentDoc.data() as CuratedChannelsDoc).version : 0
    trackRead('saveCuratedChannels_getVersion')

    // Calculate stats
    const stats = {
      active: channels.filter((ch) => ch.status === 'active').length,
      pending: channels.filter((ch) => ch.status === 'pending').length,
      broken: channels.filter((ch) => ch.status === 'broken').length,
      inactive: channels.filter((ch) => ch.status === 'inactive').length,
    }

    const newDoc: CuratedChannelsDoc = {
      version: currentVersion + 1,
      updatedAt: Timestamp.now(),
      count: channels.length,
      channels,
      stats,
    }

    await setDoc(docRef, newDoc)
    trackWrite('saveCuratedChannels')

    console.log('[CuratedChannels] Saved', channels.length, 'channels (version', newDoc.version, ')', stats)

    // Invalidate cache
    invalidateCuratedCache()
  } catch (error) {
    console.error('[CuratedChannels] Error saving channels:', error)
    throw error
  }
}

/**
 * Update a single channel's status (optimized - updates only stats and the channel)
 */
export async function updateChannelStatus(
  channelId: string,
  status: 'pending' | 'active' | 'inactive' | 'broken',
  checkedBy?: string
): Promise<void> {
  try {
    const channels = await getAllCuratedChannelsRaw()
    const index = channels.findIndex((ch) => ch.id === channelId)

    if (index < 0) {
      console.log('[CuratedChannels] Channel not found:', channelId)
      return
    }

    // Update channel
    channels[index] = {
      ...channels[index],
      status,
      lastChecked: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkedBy: checkedBy || null,
    }

    await saveCuratedChannels(channels)
  } catch (error) {
    console.error('[CuratedChannels] Error updating channel status:', error)
    throw error
  }
}

/**
 * Add a single channel to curated list
 */
export async function addToCurated(channel: CuratedChannel): Promise<void> {
  try {
    // Load current channels
    const channels = await getCuratedChannelsRaw()

    // Check for duplicate URL
    const existingIndex = channels.findIndex((ch) => ch.url === channel.url)
    if (existingIndex >= 0) {
      // Replace existing
      channels[existingIndex] = channel
    } else {
      // Add new
      channels.push(channel)
    }

    await saveCuratedChannels(channels)
  } catch (error) {
    console.error('[CuratedChannels] Error adding channel:', error)
    throw error
  }
}

/**
 * Remove a channel from curated list by ID
 */
export async function removeFromCurated(channelId: string): Promise<void> {
  try {
    const channels = await getCuratedChannelsRaw()
    const filtered = channels.filter((ch) => ch.id !== channelId)

    if (filtered.length === channels.length) {
      console.log('[CuratedChannels] Channel not found:', channelId)
      return
    }

    await saveCuratedChannels(filtered)
  } catch (error) {
    console.error('[CuratedChannels] Error removing channel:', error)
    throw error
  }
}

/**
 * Update a channel in curated list
 */
export async function updateCuratedChannel(channelId: string, updates: Partial<CuratedChannel>): Promise<void> {
  try {
    const channels = await getCuratedChannelsRaw()
    const index = channels.findIndex((ch) => ch.id === channelId)

    if (index < 0) {
      console.log('[CuratedChannels] Channel not found:', channelId)
      return
    }

    channels[index] = { ...channels[index], ...updates }
    await saveCuratedChannels(channels)
  } catch (error) {
    console.error('[CuratedChannels] Error updating channel:', error)
    throw error
  }
}

/**
 * Get raw curated channels (without conversion to Channel type)
 */
async function getCuratedChannelsRaw(): Promise<CuratedChannel[]> {
  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)
    const docSnap = await getDoc(docRef)
    trackRead('getCuratedChannelsRaw')

    if (!docSnap.exists()) {
      return []
    }

    const data = docSnap.data() as CuratedChannelsDoc
    return data.channels || []
  } catch (error) {
    console.error('[CuratedChannels] Error loading raw channels:', error)
    return []
  }
}

// ==================== PLAYLIST SOURCES ====================

/**
 * Get all playlist sources
 */
export async function getPlaylistSources(): Promise<PlaylistSource[]> {
  try {
    const sourcesRef = collection(db, SOURCES_COLLECTION)
    const snapshot = await getDocs(sourcesRef)
    trackQuery('getPlaylistSources', snapshot.size)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PlaylistSource[]
  } catch (error) {
    console.error('[PlaylistSources] Error loading sources:', error)
    return []
  }
}

/**
 * Add a playlist source record
 */
export async function addPlaylistSource(
  name: string,
  url: string | null,
  type: 'url' | 'file',
  channelCount: number,
  addedCount: number,
  skippedCount: number
): Promise<string> {
  try {
    const id = `source-${Date.now()}`
    const docRef = doc(db, SOURCES_COLLECTION, id)
    const source: PlaylistSource = {
      id,
      name,
      url,
      type,
      importedAt: new Date().toISOString(),
      channelCount,
      addedCount,
      skippedCount,
    }
    await setDoc(docRef, source)
    trackWrite('addPlaylistSource')

    return id
  } catch (error) {
    console.error('[PlaylistSources] Error adding source:', error)
    throw error
  }
}

/**
 * Update playlist source
 */
export async function updatePlaylistSource(id: string, updates: Partial<PlaylistSource>): Promise<void> {
  try {
    const docRef = doc(db, SOURCES_COLLECTION, id)
    await updateDoc(docRef, updates)
    trackWrite('updatePlaylistSource')
  } catch (error) {
    console.error('[PlaylistSources] Error updating source:', error)
    throw error
  }
}

/**
 * Delete playlist source
 */
export async function deletePlaylistSource(id: string): Promise<void> {
  try {
    const docRef = doc(db, SOURCES_COLLECTION, id)
    await deleteDoc(docRef)
    trackWrite('deletePlaylistSource')
  } catch (error) {
    console.error('[PlaylistSources] Error deleting source:', error)
    throw error
  }
}

// ==================== MIGRATION HELPERS ====================

/**
 * Check if new structure exists
 */
export async function hasCuratedStructure(): Promise<boolean> {
  try {
    const docRef = doc(db, CURATED_COLLECTION, CURATED_DOC_ID)
    const docSnap = await getDoc(docRef)
    trackRead('hasCuratedStructure')
    return docSnap.exists()
  } catch {
    return false
  }
}

/**
 * Migrate from old structure - import channels array
 */
export async function migrateFromJson(channels: CuratedChannel[]): Promise<void> {
  console.log('[Migration] Starting migration of', channels.length, 'channels')

  // Deduplicate by URL
  const urlMap = new Map<string, CuratedChannel>()
  channels.forEach((ch) => {
    const url = ch.url?.trim()
    if (url && !urlMap.has(url)) {
      urlMap.set(url, ch)
    }
  })

  const dedupedChannels = Array.from(urlMap.values())
  console.log('[Migration] After deduplication:', dedupedChannels.length, 'channels')

  await saveCuratedChannels(dedupedChannels)
  console.log('[Migration] Complete!')
}

// ==================== STATS ====================

/**
 * Get statistics about curated channels
 */
export async function getCuratedStats(): Promise<{
  total: number
  byLanguage: Record<string, number>
  byGroup: Record<string, number>
  byCountry: Record<string, number>
}> {
  const channels = await getCuratedChannels()

  const byLanguage: Record<string, number> = {}
  const byGroup: Record<string, number> = {}
  const byCountry: Record<string, number> = {}

  channels.forEach((ch) => {
    if (ch.language) {
      byLanguage[ch.language] = (byLanguage[ch.language] || 0) + 1
    }
    if (ch.group) {
      byGroup[ch.group] = (byGroup[ch.group] || 0) + 1
    }
    if (ch.country) {
      byCountry[ch.country] = (byCountry[ch.country] || 0) + 1
    }
  })

  return {
    total: channels.length,
    byLanguage,
    byGroup,
    byCountry,
  }
}

// ==================== IMPORT ====================

export interface ImportResult {
  added: number
  skipped: number
  duplicateUrls: string[]
}

/**
 * Import channels from playlist to curated_channels
 * - Checks for duplicate URLs
 * - Adds new channels with status: 'pending'
 * - Returns count of added vs skipped
 */
export async function importChannelsToCurated(
  newChannels: Array<{
    name: string
    url: string
    logo?: string
    group?: string
    language?: string
    country?: string
  }>,
  playlistId?: string
): Promise<ImportResult> {
  console.log('[CuratedChannels] Importing', newChannels.length, 'channels')

  // Load existing channels
  const existingChannels = await getCuratedChannelsRaw()
  const existingUrls = new Set(existingChannels.map((ch) => ch.url?.trim().toLowerCase()))

  const result: ImportResult = {
    added: 0,
    skipped: 0,
    duplicateUrls: [],
  }

  const channelsToAdd: CuratedChannel[] = []

  for (const ch of newChannels) {
    const url = ch.url?.trim()
    if (!url) {
      result.skipped++
      continue
    }

    // Check for duplicate URL (case-insensitive)
    if (existingUrls.has(url.toLowerCase())) {
      result.skipped++
      result.duplicateUrls.push(url)
      continue
    }

    // Add to set to prevent duplicates within import batch
    existingUrls.add(url.toLowerCase())

    // Create new curated channel
    const newChannel: CuratedChannel = {
      id: `curated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: ch.name || 'Unknown',
      url,
      logo: ch.logo || null,
      group: ch.group || 'entertainment',
      language: ch.language || null,
      country: ch.country || null,
      status: 'pending',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (playlistId) {
      newChannel.playlistId = playlistId
    }

    channelsToAdd.push(newChannel)
    result.added++
  }

  if (channelsToAdd.length > 0) {
    // Append new channels and save
    const allChannels = [...existingChannels, ...channelsToAdd]
    await saveCuratedChannels(allChannels)
  }

  console.log('[CuratedChannels] Import complete:', result)
  return result
}

/**
 * Bulk update channel statuses (for admin review workflow)
 */
export async function bulkUpdateStatus(
  channelIds: string[],
  status: 'pending' | 'active' | 'inactive' | 'broken',
  checkedBy?: string
): Promise<number> {
  const channels = await getCuratedChannelsRaw()
  let updated = 0

  const idSet = new Set(channelIds)
  const now = new Date().toISOString()

  channels.forEach((ch) => {
    if (idSet.has(ch.id)) {
      ch.status = status
      ch.lastChecked = now
      ch.updatedAt = now
      if (checkedBy) ch.checkedBy = checkedBy
      updated++
    }
  })

  if (updated > 0) {
    await saveCuratedChannels(channels)
  }

  return updated
}

/**
 * Delete multiple channels by ID
 */
export async function bulkDeleteChannels(channelIds: string[]): Promise<number> {
  const channels = await getCuratedChannelsRaw()
  const idSet = new Set(channelIds)

  const filtered = channels.filter((ch) => !idSet.has(ch.id))
  const deleted = channels.length - filtered.length

  if (deleted > 0) {
    await saveCuratedChannels(filtered)
  }

  return deleted
}

// ==================== DUPLICATES ====================

/**
 * Normalize channel name for comparison
 */
function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove non-alphanumeric except spaces
    .trim()
}

/**
 * Normalize URL for comparison (remove protocol, trailing slashes, etc)
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .trim()
}

export interface DuplicateChannel {
  id: string
  playlistId: string | undefined
  playlistName: string
  status: string
  isPrimary?: boolean
  url?: string
}

export interface DuplicateInfo {
  name: string
  normalizedName: string
  count: number
  channels: DuplicateChannel[]
  type: 'name' | 'url' // Type of duplicate
}

/**
 * Find duplicate channels by normalized name AND by URL
 * Excludes inactive channels from duplicate detection
 */
export async function findDuplicateChannels(
  playlistSources: PlaylistSource[]
): Promise<DuplicateInfo[]> {
  const allChannels = await getCuratedChannelsRaw()
  // Only check active/pending channels, skip inactive/broken
  const channels = allChannels.filter(ch => ch.status !== 'inactive')

  // Create playlist name map
  const playlistNames = new Map<string, string>()
  playlistSources.forEach(p => playlistNames.set(p.id, p.name))

  const duplicates: DuplicateInfo[] = []

  // 1. Find duplicates by URL (exact copies)
  const urlGroups = new Map<string, CuratedChannel[]>()
  channels.forEach(ch => {
    if (!ch.url) return
    const normalized = normalizeUrl(ch.url)
    if (!urlGroups.has(normalized)) {
      urlGroups.set(normalized, [])
    }
    urlGroups.get(normalized)!.push(ch)
  })

  urlGroups.forEach((group) => {
    if (group.length > 1) {
      duplicates.push({
        name: `🔗 ${group[0].name}`,
        normalizedName: normalizeUrl(group[0].url),
        count: group.length,
        type: 'url',
        channels: group.map(ch => ({
          id: ch.id,
          playlistId: ch.playlistId,
          playlistName: ch.playlistId ? (playlistNames.get(ch.playlistId) || 'Unknown') : 'Manual',
          status: ch.status || 'pending',
          isPrimary: ch.isPrimary,
          url: ch.url,
        })),
      })
    }
  })

  // 2. Find duplicates by name (same channel, different sources)
  // But exclude channels that are already in URL duplicates
  const urlDuplicateIds = new Set<string>()
  duplicates.forEach(d => d.channels.forEach(ch => urlDuplicateIds.add(ch.id)))

  const nameGroups = new Map<string, CuratedChannel[]>()
  channels.forEach(ch => {
    // Skip if already in URL duplicates
    if (urlDuplicateIds.has(ch.id)) return

    const normalized = normalizeChannelName(ch.name)
    if (!nameGroups.has(normalized)) {
      nameGroups.set(normalized, [])
    }
    nameGroups.get(normalized)!.push(ch)
  })

  nameGroups.forEach((group, normalizedName) => {
    if (group.length > 1) {
      duplicates.push({
        name: group[0].name,
        normalizedName,
        count: group.length,
        type: 'name',
        channels: group.map(ch => ({
          id: ch.id,
          playlistId: ch.playlistId,
          playlistName: ch.playlistId ? (playlistNames.get(ch.playlistId) || 'Unknown') : 'Manual',
          status: ch.status || 'pending',
          isPrimary: ch.isPrimary,
          url: ch.url,
        })),
      })
    }
  })

  // Sort: URL duplicates first, then by count
  duplicates.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'url' ? -1 : 1
    return b.count - a.count
  })

  return duplicates
}

/**
 * Set primary channel for a duplicate group and optionally mark others
 */
export async function setPrimaryChannel(
  primaryId: string | null,
  otherIds: string[]
): Promise<void> {
  const channels = await getCuratedChannelsRaw()

  // Clear isPrimary from all channels in the group
  const allIds = new Set([...(primaryId ? [primaryId] : []), ...otherIds])

  channels.forEach(ch => {
    if (allIds.has(ch.id)) {
      ch.isPrimary = ch.id === primaryId
      ch.updatedAt = new Date().toISOString()
    }
  })

  await saveCuratedChannels(channels)
}

// ==================== CHANNEL ORDER ====================

/**
 * Update channel order based on array of IDs
 * The order in the array determines the display order
 */
export async function updateChannelOrder(orderedIds: string[]): Promise<void> {
  const channels = await getCuratedChannelsRaw()

  // Create a map for quick lookup
  const channelMap = new Map<string, CuratedChannel>()
  channels.forEach(ch => channelMap.set(ch.id, ch))

  // Assign order based on position in orderedIds
  const orderMap = new Map<string, number>()
  orderedIds.forEach((id, index) => orderMap.set(id, index))

  // Update order for all channels
  channels.forEach(ch => {
    if (orderMap.has(ch.id)) {
      ch.order = orderMap.get(ch.id)
      ch.updatedAt = new Date().toISOString()
    }
  })

  // Sort channels by order before saving
  channels.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })

  await saveCuratedChannels(channels)
  console.log('[CuratedChannels] Updated channel order for', orderedIds.length, 'channels')
}

// ==================== LANGUAGE MIGRATION ====================

/**
 * Migrate language codes/names to standardized format
 * Maps old native language names to ISO 639-1 codes
 */
export async function migrateLanguages(): Promise<{ updated: number; unchanged: number }> {
  // Map of old language values to new ISO codes
  const languageMapping: Record<string, string> = {
    // Native names to ISO codes
    'Русский': 'ru',
    'English': 'en',
    'Español': 'es',
    'ქართული': 'ka',
    'Қазақша': 'kk',
    'Қazaқша': 'kk',
    'Հայdelays': 'hy',
    'Հայերdelays': 'hy',
    'Azərbaycan': 'az',
    'Français': 'fr',
    'Italiano': 'it',
    'Deutsch': 'de',
    'Português': 'pt',
    'العربية': 'ar',
    'Türkçe': 'tr',
    'Українська': 'uk',
    'Polski': 'pl',
    '中文': 'zh',
    '日本語': 'ja',
    '한국어': 'ko',
    'हिन्दी': 'hi',
    'Nederlands': 'nl',
    'Bosanski': 'bs',
    'Српски': 'sr',
    'Hrvatski': 'hr',
    'Shqip': 'sq',
    'Български': 'bg',
    'Română': 'ro',
    'Ελληνικά': 'el',
    'Čeština': 'cs',
    'Slovenčina': 'sk',
    'Magyar': 'hu',
    'Svenska': 'sv',
    'Norsk': 'no',
    'Dansk': 'da',
    'Suomi': 'fi',
    'עברית': 'he',
    'فارسی': 'fa',
    'Tiếng Việt': 'vi',
    'ไทย': 'th',
    'Indonesia': 'id',
    'Melayu': 'ms',
    'Català': 'ca',
    // Common English names to ISO codes
    'Russian': 'ru',
    'Spanish': 'es',
    'Georgian': 'ka',
    'Kazakh': 'kk',
    'Armenian': 'hy',
    'Azerbaijani': 'az',
    'French': 'fr',
    'Italian': 'it',
    'German': 'de',
    'Portuguese': 'pt',
    'Arabic': 'ar',
    'Turkish': 'tr',
    'Ukrainian': 'uk',
    'Polish': 'pl',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Hindi': 'hi',
    'Dutch': 'nl',
    'Bosnian': 'bs',
    'Serbian': 'sr',
    'Croatian': 'hr',
    'Albanian': 'sq',
    'Bulgarian': 'bg',
    'Romanian': 'ro',
    'Greek': 'el',
    'Czech': 'cs',
    'Slovak': 'sk',
    'Hungarian': 'hu',
    'Swedish': 'sv',
    'Norwegian': 'no',
    'Danish': 'da',
    'Finnish': 'fi',
    'Hebrew': 'he',
    'Persian': 'fa',
    'Vietnamese': 'vi',
    'Thai': 'th',
    'Indonesian': 'id',
    'Malay': 'ms',
    'Catalan': 'ca',
  }

  const channels = await getCuratedChannelsRaw()
  let updated = 0
  let unchanged = 0

  channels.forEach(ch => {
    if (!ch.language) {
      unchanged++
      return
    }

    const currentLang = ch.language.trim()

    // Check if it needs mapping
    if (languageMapping[currentLang]) {
      ch.language = languageMapping[currentLang]
      ch.updatedAt = new Date().toISOString()
      updated++
    } else if (currentLang.length === 2 && currentLang === currentLang.toLowerCase()) {
      // Already a valid ISO code
      unchanged++
    } else {
      // Try case-insensitive match
      const lowerLang = currentLang.toLowerCase()
      const matchKey = Object.keys(languageMapping).find(k => k.toLowerCase() === lowerLang)
      if (matchKey) {
        ch.language = languageMapping[matchKey]
        ch.updatedAt = new Date().toISOString()
        updated++
      } else {
        unchanged++
      }
    }
  })

  if (updated > 0) {
    await saveCuratedChannels(channels)
  }

  console.log(`[CuratedChannels] Language migration: ${updated} updated, ${unchanged} unchanged`)
  return { updated, unchanged }
}
