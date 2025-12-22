/**
 * Staging Playlist Service
 *
 * Architecture:
 * - Each imported playlist = separate document in staging_playlists/{id}
 * - Channels reviewed individually (status: pending/working/broken)
 * - Merge button copies working channels to curated_channels (with duplicate check)
 * - This replaces the old `channels` collection entirely
 *
 * Flow:
 * 1. Import playlist → creates staging document
 * 2. Review channels → watch, mark as working/broken
 * 3. Merge → copy working channels to curated_channels
 * 4. Can delete staging after merge or keep for history
 */

import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { trackRead, trackWrite, trackQuery } from './firebaseQuotaTracker'
import { getAllCuratedChannelsRaw, saveCuratedChannels, CuratedChannel } from './curatedChannelService'

// ==================== TYPES ====================

export type StagingChannelStatus = 'pending' | 'working' | 'broken' | 'merged'

export interface StagingChannel {
  id: string
  name: string
  url: string
  logo: string | null
  group: string
  language: string | null
  country: string | null
  // Staging-specific
  status: StagingChannelStatus
  addedAt: string // ISO date
  checkedAt?: string // when status was set
  checkedBy?: string // user who checked
}

export interface StagingPlaylist {
  id: string
  name: string // playlist filename or custom name
  url: string | null // null for file uploads
  type: 'url' | 'file'
  importedAt: string // ISO date
  channels: StagingChannel[]
  // Stats (calculated)
  stats: {
    total: number
    pending: number
    working: number
    broken: number
    merged: number
  }
}

export interface StagingPlaylistDoc extends Omit<StagingPlaylist, 'importedAt'> {
  importedAt: Timestamp
}

// ==================== CONSTANTS ====================

const STAGING_COLLECTION = 'staging_playlists'

// ==================== STAGING PLAYLISTS ====================

/**
 * Get all staging playlists (metadata only, without channels array for list view)
 */
export async function getStagingPlaylistsList(): Promise<
  Array<{
    id: string
    name: string
    url: string | null
    type: 'url' | 'file'
    importedAt: string
    stats: StagingPlaylist['stats']
  }>
> {
  try {
    const colRef = collection(db, STAGING_COLLECTION)
    const snapshot = await getDocs(colRef)
    trackQuery('getStagingPlaylistsList', snapshot.size)

    return snapshot.docs.map((doc) => {
      const data = doc.data() as StagingPlaylistDoc
      return {
        id: doc.id,
        name: data.name,
        url: data.url,
        type: data.type,
        importedAt: data.importedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        stats: data.stats,
      }
    })
  } catch (error) {
    console.error('[StagingPlaylists] Error loading list:', error)
    return []
  }
}

/**
 * Get a single staging playlist with all channels
 */
export async function getStagingPlaylist(id: string): Promise<StagingPlaylist | null> {
  try {
    const docRef = doc(db, STAGING_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    trackRead('getStagingPlaylist')

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data() as StagingPlaylistDoc
    return {
      ...data,
      id: docSnap.id,
      importedAt: data.importedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  } catch (error) {
    console.error('[StagingPlaylists] Error loading playlist:', error)
    return null
  }
}

/**
 * Create a new staging playlist from imported channels
 */
export async function createStagingPlaylist(
  name: string,
  url: string | null,
  type: 'url' | 'file',
  channels: Array<{
    name: string
    url: string
    logo?: string
    group?: string
    language?: string
    country?: string
  }>
): Promise<{ id: string; channelCount: number }> {
  const id = `staging-${Date.now()}`
  const now = new Date().toISOString()

  // Convert to StagingChannel format
  const stagingChannels: StagingChannel[] = channels.map((ch, index) => ({
    id: `${id}-ch-${index}`,
    name: ch.name || 'Unknown',
    url: ch.url,
    logo: ch.logo || null,
    group: ch.group || 'entertainment',
    language: ch.language || null,
    country: ch.country || null,
    status: 'pending' as StagingChannelStatus,
    addedAt: now,
  }))

  // Deduplicate by URL within playlist
  const urlMap = new Map<string, StagingChannel>()
  stagingChannels.forEach((ch) => {
    const url = ch.url?.trim().toLowerCase()
    if (url && !urlMap.has(url)) {
      urlMap.set(url, ch)
    }
  })
  const dedupedChannels = Array.from(urlMap.values())

  const playlist: StagingPlaylistDoc = {
    id,
    name,
    url,
    type,
    importedAt: Timestamp.now(),
    channels: dedupedChannels,
    stats: {
      total: dedupedChannels.length,
      pending: dedupedChannels.length,
      working: 0,
      broken: 0,
      merged: 0,
    },
  }

  try {
    const docRef = doc(db, STAGING_COLLECTION, id)
    await setDoc(docRef, playlist)
    trackWrite('createStagingPlaylist')

    console.log('[StagingPlaylists] Created playlist:', name, 'with', dedupedChannels.length, 'channels')
    return { id, channelCount: dedupedChannels.length }
  } catch (error) {
    console.error('[StagingPlaylists] Error creating playlist:', error)
    throw error
  }
}

/**
 * Update a channel's status in staging playlist
 */
export async function updateStagingChannelStatus(
  playlistId: string,
  channelId: string,
  status: StagingChannelStatus,
  checkedBy?: string
): Promise<void> {
  try {
    const playlist = await getStagingPlaylist(playlistId)
    if (!playlist) {
      throw new Error('Playlist not found: ' + playlistId)
    }

    const channelIndex = playlist.channels.findIndex((ch) => ch.id === channelId)
    if (channelIndex < 0) {
      throw new Error('Channel not found: ' + channelId)
    }

    // Update channel
    const oldStatus = playlist.channels[channelIndex].status
    playlist.channels[channelIndex] = {
      ...playlist.channels[channelIndex],
      status,
      checkedAt: new Date().toISOString(),
      checkedBy,
    }

    // Recalculate stats
    playlist.stats = calculateStats(playlist.channels)

    // Save
    const docRef = doc(db, STAGING_COLLECTION, playlistId)
    await updateDoc(docRef, {
      channels: playlist.channels,
      stats: playlist.stats,
    })
    trackWrite('updateStagingChannelStatus')

    console.log('[StagingPlaylists] Updated channel', channelId, ':', oldStatus, '->', status)
  } catch (error) {
    console.error('[StagingPlaylists] Error updating channel status:', error)
    throw error
  }
}

/**
 * Update channel data (name, language, group, country) in staging playlist
 */
export async function updateStagingChannel(
  playlistId: string,
  channelId: string,
  updates: Partial<Pick<StagingChannel, 'name' | 'language' | 'group' | 'country'>>
): Promise<void> {
  try {
    const playlist = await getStagingPlaylist(playlistId)
    if (!playlist) {
      throw new Error('Playlist not found: ' + playlistId)
    }

    const channelIndex = playlist.channels.findIndex((ch) => ch.id === channelId)
    if (channelIndex < 0) {
      throw new Error('Channel not found: ' + channelId)
    }

    // Update channel fields
    if (updates.name !== undefined) {
      playlist.channels[channelIndex].name = updates.name
    }
    if (updates.language !== undefined) {
      playlist.channels[channelIndex].language = updates.language
    }
    if (updates.group !== undefined) {
      playlist.channels[channelIndex].group = updates.group
    }
    if (updates.country !== undefined) {
      playlist.channels[channelIndex].country = updates.country
    }

    // Save
    const docRef = doc(db, STAGING_COLLECTION, playlistId)
    await updateDoc(docRef, {
      channels: playlist.channels,
    })
    trackWrite('updateStagingChannel')

    console.log('[StagingPlaylists] Updated channel', channelId)
  } catch (error) {
    console.error('[StagingPlaylists] Error updating channel:', error)
    throw error
  }
}

/**
 * Bulk update multiple channels in staging playlist
 */
export async function bulkUpdateStagingStatus(
  playlistId: string,
  channelIds: string[],
  status: StagingChannelStatus,
  checkedBy?: string
): Promise<number> {
  try {
    const playlist = await getStagingPlaylist(playlistId)
    if (!playlist) {
      throw new Error('Playlist not found: ' + playlistId)
    }

    const idSet = new Set(channelIds)
    const now = new Date().toISOString()
    let updated = 0

    playlist.channels.forEach((ch) => {
      if (idSet.has(ch.id)) {
        ch.status = status
        ch.checkedAt = now
        ch.checkedBy = checkedBy
        updated++
      }
    })

    if (updated > 0) {
      playlist.stats = calculateStats(playlist.channels)

      const docRef = doc(db, STAGING_COLLECTION, playlistId)
      await updateDoc(docRef, {
        channels: playlist.channels,
        stats: playlist.stats,
      })
      trackWrite('bulkUpdateStagingStatus')
    }

    return updated
  } catch (error) {
    console.error('[StagingPlaylists] Error bulk updating status:', error)
    throw error
  }
}

/**
 * Merge working channels from staging to curated_channels
 * - Only merges channels with status: 'working'
 * - Checks for duplicate URLs in curated
 * - Marks merged channels as 'merged' in staging
 */
export async function mergeStagingToCurated(
  playlistId: string
): Promise<{ merged: number; skipped: number; duplicateUrls: string[] }> {
  console.log('[StagingPlaylists] Starting merge for playlist:', playlistId)

  try {
    // Load staging playlist
    const playlist = await getStagingPlaylist(playlistId)
    if (!playlist) {
      throw new Error('Playlist not found: ' + playlistId)
    }

    // Get working channels
    const workingChannels = playlist.channels.filter((ch) => ch.status === 'working')
    console.log('[StagingPlaylists] Working channels to merge:', workingChannels.length)

    if (workingChannels.length === 0) {
      return { merged: 0, skipped: 0, duplicateUrls: [] }
    }

    // Load curated channels
    const curatedChannels = await getAllCuratedChannelsRaw()
    const curatedUrls = new Set(curatedChannels.map((ch) => ch.url?.trim().toLowerCase()))

    const result = {
      merged: 0,
      skipped: 0,
      duplicateUrls: [] as string[],
    }

    const channelsToAdd: CuratedChannel[] = []
    const mergedIds: string[] = []

    for (const stagingCh of workingChannels) {
      const url = stagingCh.url?.trim()
      if (!url) {
        result.skipped++
        continue
      }

      // Check for duplicate in curated
      if (curatedUrls.has(url.toLowerCase())) {
        result.skipped++
        result.duplicateUrls.push(url)
        // Still mark as merged since it exists in curated
        mergedIds.push(stagingCh.id)
        continue
      }

      // Add to curated
      curatedUrls.add(url.toLowerCase())

      const curatedChannel: CuratedChannel = {
        id: `curated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: stagingCh.name,
        url,
        logo: stagingCh.logo,
        group: stagingCh.group,
        language: stagingCh.language,
        country: stagingCh.country,
        status: 'active', // Merged channels are active
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        playlistId, // Track source
      }

      channelsToAdd.push(curatedChannel)
      mergedIds.push(stagingCh.id)
      result.merged++
    }

    // Save to curated if any new channels
    if (channelsToAdd.length > 0) {
      const allCurated = [...curatedChannels, ...channelsToAdd]
      await saveCuratedChannels(allCurated)
      console.log('[StagingPlaylists] Added', channelsToAdd.length, 'channels to curated')
    }

    // Update staging playlist - mark channels as merged
    if (mergedIds.length > 0) {
      const now = new Date().toISOString()
      playlist.channels.forEach((ch) => {
        if (mergedIds.includes(ch.id)) {
          ch.status = 'merged'
          ch.checkedAt = now
        }
      })

      playlist.stats = calculateStats(playlist.channels)

      const docRef = doc(db, STAGING_COLLECTION, playlistId)
      await updateDoc(docRef, {
        channels: playlist.channels,
        stats: playlist.stats,
      })
      trackWrite('mergeStagingToCurated_updateStaging')
    }

    console.log('[StagingPlaylists] Merge complete:', result)
    return result
  } catch (error) {
    console.error('[StagingPlaylists] Error merging to curated:', error)
    throw error
  }
}

/**
 * Delete a staging playlist
 */
export async function deleteStagingPlaylist(id: string): Promise<void> {
  try {
    const docRef = doc(db, STAGING_COLLECTION, id)
    await deleteDoc(docRef)
    trackWrite('deleteStagingPlaylist')

    console.log('[StagingPlaylists] Deleted playlist:', id)
  } catch (error) {
    console.error('[StagingPlaylists] Error deleting playlist:', error)
    throw error
  }
}

/**
 * Delete multiple channels from a staging playlist
 */
export async function deleteStagingChannels(playlistId: string, channelIds: string[]): Promise<number> {
  try {
    const playlist = await getStagingPlaylist(playlistId)
    if (!playlist) {
      throw new Error('Playlist not found: ' + playlistId)
    }

    const idSet = new Set(channelIds)
    const originalCount = playlist.channels.length
    playlist.channels = playlist.channels.filter((ch) => !idSet.has(ch.id))
    const deleted = originalCount - playlist.channels.length

    if (deleted > 0) {
      playlist.stats = calculateStats(playlist.channels)

      const docRef = doc(db, STAGING_COLLECTION, playlistId)
      await updateDoc(docRef, {
        channels: playlist.channels,
        stats: playlist.stats,
      })
      trackWrite('deleteStagingChannels')
    }

    return deleted
  } catch (error) {
    console.error('[StagingPlaylists] Error deleting channels:', error)
    throw error
  }
}

// ==================== HELPERS ====================

function calculateStats(channels: StagingChannel[]): StagingPlaylist['stats'] {
  return {
    total: channels.length,
    pending: channels.filter((ch) => ch.status === 'pending').length,
    working: channels.filter((ch) => ch.status === 'working').length,
    broken: channels.filter((ch) => ch.status === 'broken').length,
    merged: channels.filter((ch) => ch.status === 'merged').length,
  }
}
