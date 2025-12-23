import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, orderBy, limit } from 'firebase/firestore'

// Channel statistics interface
export interface ChannelStats {
  channelId: string
  channelName: string
  totalWatchTime: number      // total seconds watched
  viewCount: number           // number of views
  quickExitCount: number      // views < 10 seconds (indicates problem)
  errorCount: number          // playback errors
  lastWatched: number         // timestamp
}

// Session tracking
interface WatchSession {
  channelId: string
  channelName: string
  startTime: number
  hadError: boolean
}

let currentSession: WatchSession | null = null

// Start tracking a channel view
export function startWatchSession(channelId: string, channelName: string) {
  // End previous session if exists
  if (currentSession) {
    endWatchSession(false)
  }

  currentSession = {
    channelId,
    channelName,
    startTime: Date.now(),
    hadError: false
  }
}

// Mark current session as having an error
export function markSessionError() {
  if (currentSession) {
    currentSession.hadError = true
  }
}

// End tracking and save stats
export async function endWatchSession(hadError: boolean = false) {
  if (!currentSession) return

  const session = currentSession
  currentSession = null

  const watchTime = Math.floor((Date.now() - session.startTime) / 1000) // seconds
  const isQuickExit = watchTime < 10
  const sessionHadError = hadError || session.hadError

  // Don't track very short sessions (< 2 sec) - likely accidental clicks
  if (watchTime < 2) return

  try {
    await updateChannelStats(session.channelId, session.channelName, {
      watchTime,
      isQuickExit,
      hadError: sessionHadError
    })
  } catch (error) {
    console.error('Failed to save watch stats:', error)
  }
}

// Update channel stats in Firestore
async function updateChannelStats(
  channelId: string,
  channelName: string,
  data: { watchTime: number; isQuickExit: boolean; hadError: boolean }
) {
  const statsRef = doc(db, 'channelStats', channelId)

  try {
    const statsDoc = await getDoc(statsRef)

    if (statsDoc.exists()) {
      // Update existing stats
      await updateDoc(statsRef, {
        totalWatchTime: increment(data.watchTime),
        viewCount: increment(1),
        quickExitCount: increment(data.isQuickExit ? 1 : 0),
        errorCount: increment(data.hadError ? 1 : 0),
        lastWatched: Date.now()
      })
    } else {
      // Create new stats document
      await setDoc(statsRef, {
        channelId,
        channelName,
        totalWatchTime: data.watchTime,
        viewCount: 1,
        quickExitCount: data.isQuickExit ? 1 : 0,
        errorCount: data.hadError ? 1 : 0,
        lastWatched: Date.now()
      })
    }
  } catch (error) {
    console.error('Error updating channel stats:', error)
  }
}

// Get all channel stats for admin panel
export async function getAllChannelStats(): Promise<ChannelStats[]> {
  try {
    const statsRef = collection(db, 'channelStats')
    const q = query(statsRef, orderBy('viewCount', 'desc'), limit(500))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => doc.data() as ChannelStats)
  } catch (error) {
    console.error('Error fetching channel stats:', error)
    return []
  }
}

// Get top channels by watch time
export async function getTopChannelsByWatchTime(limitCount: number = 20): Promise<ChannelStats[]> {
  try {
    const statsRef = collection(db, 'channelStats')
    const q = query(statsRef, orderBy('totalWatchTime', 'desc'), limit(limitCount))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => doc.data() as ChannelStats)
  } catch (error) {
    console.error('Error fetching top channels:', error)
    return []
  }
}

// Get problematic channels (high quick exit rate or errors)
export async function getProblematicChannels(): Promise<(ChannelStats & { quickExitRate: number; errorRate: number })[]> {
  const allStats = await getAllChannelStats()

  return allStats
    .filter(stat => stat.viewCount >= 5) // At least 5 views to be significant
    .map(stat => ({
      ...stat,
      quickExitRate: stat.viewCount > 0 ? (stat.quickExitCount / stat.viewCount) * 100 : 0,
      errorRate: stat.viewCount > 0 ? (stat.errorCount / stat.viewCount) * 100 : 0
    }))
    .filter(stat => stat.quickExitRate > 30 || stat.errorRate > 20) // >30% quick exits or >20% errors
    .sort((a, b) => b.quickExitRate - a.quickExitRate)
}

// Format watch time for display
export function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// Handle page unload - save current session
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentSession) {
      // Use sendBeacon for reliable delivery on page unload
      const watchTime = Math.floor((Date.now() - currentSession.startTime) / 1000)
      if (watchTime >= 2) {
        // Note: sendBeacon doesn't work with Firestore directly
        // Stats will be saved on next session start or channel change
        endWatchSession(false)
      }
    }
  })
}
