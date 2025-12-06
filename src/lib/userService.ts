import { db } from './firebase'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'

export interface WatchHistoryEntry {
  channelId: string
  channelName: string
  watchedAt: Timestamp
  duration?: number // seconds
}

export interface UserData {
  favorites: string[]
  watchHistory: WatchHistoryEntry[]
  lastVisit: Timestamp
  totalVisits: number
  ipAddresses: string[]
  createdAt: Timestamp
}

// Get or create user document
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return userSnap.data() as UserData
    }
    return null
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

// Initialize user document on first login
export async function initializeUser(userId: string, email?: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: email || null,
        favorites: [],
        watchHistory: [],
        lastVisit: serverTimestamp(),
        totalVisits: 1,
        ipAddresses: [],
        createdAt: serverTimestamp(),
      })
    } else {
      // Update visit stats
      await updateDoc(userRef, {
        lastVisit: serverTimestamp(),
        totalVisits: increment(1),
      })
    }
  } catch (error) {
    console.error('Error initializing user:', error)
  }
}

// Save user IP address
export async function saveUserIP(userId: string, ip: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      ipAddresses: arrayUnion(ip),
      lastIP: ip,
      lastVisit: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error saving IP:', error)
  }
}

// Favorites
export async function addFavorite(userId: string, channelId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      favorites: arrayUnion(channelId),
    })
  } catch (error) {
    console.error('Error adding favorite:', error)
  }
}

export async function removeFavorite(userId: string, channelId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      favorites: arrayRemove(channelId),
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
  }
}

export async function getFavorites(userId: string): Promise<string[]> {
  try {
    const userData = await getUserData(userId)
    return userData?.favorites || []
  } catch (error) {
    console.error('Error getting favorites:', error)
    return []
  }
}

export async function setFavorites(userId: string, favorites: string[]): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, { favorites })
  } catch (error) {
    console.error('Error setting favorites:', error)
  }
}

// Watch History
export async function addWatchHistory(
  userId: string,
  channelId: string,
  channelName: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    const entry: WatchHistoryEntry = {
      channelId,
      channelName,
      watchedAt: Timestamp.now(),
    }

    // Get current history
    const userData = await getUserData(userId)
    const history = userData?.watchHistory || []

    // Keep only last 100 entries
    const newHistory = [entry, ...history].slice(0, 100)

    await updateDoc(userRef, {
      watchHistory: newHistory,
    })
  } catch (error) {
    console.error('Error adding watch history:', error)
  }
}

export async function getWatchHistory(userId: string, count: number = 20): Promise<WatchHistoryEntry[]> {
  try {
    const userData = await getUserData(userId)
    return (userData?.watchHistory || []).slice(0, count)
  } catch (error) {
    console.error('Error getting watch history:', error)
    return []
  }
}

// Analytics - get all users count
export async function getTotalUsersCount(): Promise<number> {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    return snapshot.size
  } catch (error) {
    console.error('Error getting users count:', error)
    return 0
  }
}

// Get recent active users
export async function getRecentUsers(count: number = 10): Promise<Array<{ id: string; lastVisit: Timestamp; email?: string }>> {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, orderBy('lastVisit', 'desc'), limit(count))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      lastVisit: doc.data().lastVisit,
      email: doc.data().email,
    }))
  } catch (error) {
    console.error('Error getting recent users:', error)
    return []
  }
}
