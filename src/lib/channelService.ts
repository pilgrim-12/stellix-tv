import { db } from './firebase'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { Channel, ChannelStatus } from '@/types'

export interface FirebaseChannel extends Channel {
  playlistId?: string // связь с плейлистом
  createdAt?: Timestamp
  updatedAt?: Timestamp
  lastChecked?: Timestamp
  checkedBy?: string // admin uid who checked the channel
}

export interface PlaylistStats {
  pending: number
  active: number
  inactive: number
  broken: number
}

export interface Playlist {
  id: string
  name: string
  url?: string
  addedAt: number
  enabled: boolean
  channelCount: number
  stats?: PlaylistStats
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

const CHANNELS_COLLECTION = 'channels'
const PLAYLISTS_COLLECTION = 'playlists'

// ==================== CHANNELS ====================

// Get all channels from Firestore
export async function getAllChannels(): Promise<FirebaseChannel[]> {
  try {
    const channelsRef = collection(db, CHANNELS_COLLECTION)
    const snapshot = await getDocs(channelsRef)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseChannel[]
  } catch (error) {
    console.error('Error getting channels:', error)
    return []
  }
}

// Get only active channels (status = 'active')
export async function getActiveChannels(): Promise<FirebaseChannel[]> {
  try {
    const channelsRef = collection(db, CHANNELS_COLLECTION)
    const q = query(channelsRef, where('status', '==', 'active'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseChannel[]
  } catch (error) {
    console.error('Error getting active channels:', error)
    // Fallback: get all channels if query fails
    return getAllChannels()
  }
}

// Get channels by playlist ID
export async function getChannelsByPlaylist(playlistId: string): Promise<FirebaseChannel[]> {
  try {
    const channelsRef = collection(db, CHANNELS_COLLECTION)
    const q = query(channelsRef, where('playlistId', '==', playlistId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseChannel[]
  } catch (error) {
    console.error('Error getting channels by playlist:', error)
    return []
  }
}

// Get single channel
export async function getChannel(channelId: string): Promise<FirebaseChannel | null> {
  try {
    const channelRef = doc(db, CHANNELS_COLLECTION, channelId)
    const snapshot = await getDoc(channelRef)

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as FirebaseChannel
    }
    return null
  } catch (error) {
    console.error('Error getting channel:', error)
    return null
  }
}

// Add or update a channel
export async function saveChannel(channel: Channel, playlistId?: string): Promise<void> {
  try {
    const channelRef = doc(db, CHANNELS_COLLECTION, channel.id)
    const existing = await getDoc(channelRef)

    if (existing.exists()) {
      await updateDoc(channelRef, {
        ...channel,
        playlistId: playlistId || existing.data().playlistId,
        updatedAt: Timestamp.now(),
      })
    } else {
      await setDoc(channelRef, {
        ...channel,
        playlistId: playlistId || null,
        status: 'pending' as ChannelStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    }
  } catch (error) {
    console.error('Error saving channel:', error)
    throw error
  }
}

// Update channel status and playlist stats
export async function setChannelStatus(
  channelId: string,
  status: ChannelStatus,
  checkedBy?: string
): Promise<void> {
  try {
    // Get channel to find old status and playlistId
    const channelRef = doc(db, CHANNELS_COLLECTION, channelId)
    const channelSnap = await getDoc(channelRef)

    if (!channelSnap.exists()) {
      throw new Error('Channel not found')
    }

    const channelData = channelSnap.data()
    const oldStatus = channelData.status || 'pending'
    const playlistId = channelData.playlistId

    // Update channel status
    await updateDoc(channelRef, {
      status,
      lastChecked: Timestamp.now(),
      checkedBy: checkedBy || null,
      updatedAt: Timestamp.now(),
    })

    // Update playlist stats if status changed and channel belongs to a playlist
    if (playlistId && oldStatus !== status) {
      await updatePlaylistStatsOnStatusChange(playlistId, oldStatus, status)
    }
  } catch (error) {
    console.error('Error setting channel status:', error)
    throw error
  }
}

// Update playlist stats when channel status changes
async function updatePlaylistStatsOnStatusChange(
  playlistId: string,
  oldStatus: ChannelStatus,
  newStatus: ChannelStatus
): Promise<void> {
  try {
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)
    const playlistSnap = await getDoc(playlistRef)

    if (!playlistSnap.exists()) return

    const playlist = playlistSnap.data()
    const stats: PlaylistStats = playlist.stats || { pending: 0, active: 0, inactive: 0, broken: 0 }

    // Decrement old status count
    if (stats[oldStatus] > 0) {
      stats[oldStatus]--
    }
    // Increment new status count
    stats[newStatus]++

    await updateDoc(playlistRef, {
      stats,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating playlist stats:', error)
    // Don't throw - this is a secondary operation
  }
}

// Delete a channel
export async function deleteChannel(channelId: string): Promise<void> {
  try {
    const channelRef = doc(db, CHANNELS_COLLECTION, channelId)
    await deleteDoc(channelRef)
  } catch (error) {
    console.error('Error deleting channel:', error)
    throw error
  }
}

// Delete all channels by playlist
export async function deleteChannelsByPlaylist(playlistId: string): Promise<number> {
  try {
    const channels = await getChannelsByPlaylist(playlistId)

    // Split into batches of 500 (Firestore limit)
    const batchSize = 500
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = channels.slice(i, i + batchSize)

      chunk.forEach((channel) => {
        const channelRef = doc(db, CHANNELS_COLLECTION, channel.id)
        batch.delete(channelRef)
      })

      await batch.commit()
    }

    return channels.length
  } catch (error) {
    console.error('Error deleting channels by playlist:', error)
    throw error
  }
}

// Legacy function - keep for compatibility
export async function setChannelOnlineStatus(channelId: string, isOnline: boolean): Promise<void> {
  const status: ChannelStatus = isOnline ? 'active' : 'broken'
  await setChannelStatus(channelId, status)
}

// Legacy function
export async function toggleChannelActive(channelId: string): Promise<boolean> {
  const channel = await getChannel(channelId)
  if (!channel) return false

  const newStatus: ChannelStatus = channel.status === 'active' ? 'inactive' : 'active'
  await setChannelStatus(channelId, newStatus)
  return newStatus === 'active'
}

// Bulk import channels
export async function importChannels(
  channels: Channel[],
  playlistId?: string
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Split into batches of 500 (Firestore limit)
  const batchSize = 500
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = writeBatch(db)
    const chunk = channels.slice(i, i + batchSize)

    for (const channel of chunk) {
      try {
        const channelRef = doc(db, CHANNELS_COLLECTION, channel.id)
        batch.set(
          channelRef,
          {
            ...channel,
            playlistId: playlistId || null,
            status: 'pending' as ChannelStatus,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        )
        success++
      } catch {
        failed++
      }
    }

    try {
      await batch.commit()
    } catch (error) {
      console.error('Error committing batch:', error)
      failed += chunk.length
      success -= chunk.length
    }
  }

  return { success, failed }
}

// ==================== PLAYLISTS ====================

// Get all playlists
export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const playlistsRef = collection(db, PLAYLISTS_COLLECTION)
    const snapshot = await getDocs(playlistsRef)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Playlist[]
  } catch (error) {
    console.error('Error getting playlists:', error)
    return []
  }
}

// Get single playlist
export async function getPlaylist(playlistId: string): Promise<Playlist | null> {
  try {
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)
    const snapshot = await getDoc(playlistRef)

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Playlist
    }
    return null
  } catch (error) {
    console.error('Error getting playlist:', error)
    return null
  }
}

// Create playlist
export async function createPlaylist(
  name: string,
  channelCount: number,
  url?: string
): Promise<string> {
  try {
    const playlistId = `playlist-${Date.now()}`
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)

    await setDoc(playlistRef, {
      name,
      url: url || null,
      addedAt: Date.now(),
      enabled: true,
      channelCount,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return playlistId
  } catch (error) {
    console.error('Error creating playlist:', error)
    throw error
  }
}

// Delete playlist and its channels
export async function deletePlaylist(playlistId: string): Promise<void> {
  try {
    // First delete all channels belonging to this playlist
    await deleteChannelsByPlaylist(playlistId)

    // Then delete the playlist itself
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)
    await deleteDoc(playlistRef)
  } catch (error) {
    console.error('Error deleting playlist:', error)
    throw error
  }
}

// Toggle playlist enabled
export async function togglePlaylistEnabled(playlistId: string): Promise<boolean> {
  try {
    const playlist = await getPlaylist(playlistId)
    if (!playlist) return false

    const newEnabled = !playlist.enabled
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)
    await updateDoc(playlistRef, {
      enabled: newEnabled,
      updatedAt: Timestamp.now(),
    })

    return newEnabled
  } catch (error) {
    console.error('Error toggling playlist:', error)
    throw error
  }
}

// ==================== BULK OPERATIONS ====================

// Update language for a single channel
export async function updateChannelLanguage(channelId: string, language: string): Promise<void> {
  try {
    const channelRef = doc(db, CHANNELS_COLLECTION, channelId)
    await updateDoc(channelRef, {
      language,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating channel language:', error)
    throw error
  }
}

// Bulk update languages for all channels using recalculation function
export async function recalculateAllLanguages(
  recalcFn: (channel: { name: string; country?: string; group?: string; language?: string }) => string
): Promise<{ updated: number; unchanged: number }> {
  try {
    const channels = await getAllChannels()
    let updated = 0
    let unchanged = 0

    // Process in batches
    const batchSize = 500
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = channels.slice(i, i + batchSize)

      for (const channel of chunk) {
        const newLanguage = recalcFn({
          name: channel.name,
          country: channel.country,
          group: channel.group,
          language: channel.language,
        })

        if (newLanguage !== channel.language) {
          const channelRef = doc(db, CHANNELS_COLLECTION, channel.id)
          batch.update(channelRef, {
            language: newLanguage,
            updatedAt: Timestamp.now(),
          })
          updated++
        } else {
          unchanged++
        }
      }

      await batch.commit()
    }

    return { updated, unchanged }
  } catch (error) {
    console.error('Error recalculating languages:', error)
    throw error
  }
}

// ==================== PLAYLIST STATS ====================

// Recalculate stats for a single playlist
export async function recalculatePlaylistStats(playlistId: string): Promise<PlaylistStats> {
  try {
    const channels = await getChannelsByPlaylist(playlistId)

    const stats: PlaylistStats = {
      pending: 0,
      active: 0,
      inactive: 0,
      broken: 0,
    }

    channels.forEach((ch) => {
      const status = ch.status || 'pending'
      stats[status]++
    })

    // Update playlist with new stats
    const playlistRef = doc(db, PLAYLISTS_COLLECTION, playlistId)
    await updateDoc(playlistRef, {
      stats,
      channelCount: channels.length,
      updatedAt: Timestamp.now(),
    })

    return stats
  } catch (error) {
    console.error('Error recalculating playlist stats:', error)
    throw error
  }
}

// Recalculate stats for all playlists
export async function recalculateAllPlaylistStats(): Promise<void> {
  try {
    const playlists = await getAllPlaylists()

    for (const playlist of playlists) {
      await recalculatePlaylistStats(playlist.id)
    }
  } catch (error) {
    console.error('Error recalculating all playlist stats:', error)
    throw error
  }
}

// ==================== STATS ====================

// Get channels statistics
export async function getChannelsStats(): Promise<{
  total: number
  pending: number
  active: number
  inactive: number
  broken: number
  byLanguage: Record<string, number>
  byGroup: Record<string, number>
}> {
  try {
    const channels = await getAllChannels()

    const stats = {
      total: channels.length,
      pending: channels.filter((ch) => !ch.status || ch.status === 'pending').length,
      active: channels.filter((ch) => ch.status === 'active').length,
      inactive: channels.filter((ch) => ch.status === 'inactive').length,
      broken: channels.filter((ch) => ch.status === 'broken').length,
      byLanguage: {} as Record<string, number>,
      byGroup: {} as Record<string, number>,
    }

    channels.forEach((ch) => {
      if (ch.language) {
        stats.byLanguage[ch.language] = (stats.byLanguage[ch.language] || 0) + 1
      }
      if (ch.group) {
        stats.byGroup[ch.group] = (stats.byGroup[ch.group] || 0) + 1
      }
    })

    return stats
  } catch (error) {
    console.error('Error getting stats:', error)
    return { total: 0, pending: 0, active: 0, inactive: 0, broken: 0, byLanguage: {}, byGroup: {} }
  }
}
