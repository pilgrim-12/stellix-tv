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
import { trackRead, trackWrite, trackQuery } from './firebaseQuotaTracker'

export interface WatchHistoryEntry {
  channelId: string
  channelName: string
  watchedAt: Timestamp
  duration?: number // seconds
}

export interface UserSettings {
  showOnlyFavorites: boolean
}

export interface UserData {
  favorites: string[]
  watchHistory: WatchHistoryEntry[]
  settings?: UserSettings
  lastVisit: Timestamp
  totalVisits: number
  ipAddresses: string[]
  createdAt: Timestamp
  isAdmin?: boolean
}

// Get or create user document
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    trackRead('getUserData')

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
    trackRead('initializeUser')

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
      trackWrite('initializeUser')
    } else {
      // Update visit stats
      await updateDoc(userRef, {
        lastVisit: serverTimestamp(),
        totalVisits: increment(1),
      })
      trackWrite('initializeUser')
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
    trackWrite('saveUserIP')
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
    trackWrite('addFavorite')
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
    trackWrite('removeFavorite')
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
    trackWrite('setFavorites')
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

    // Get current history (getUserData already tracks the read)
    const userData = await getUserData(userId)
    const history = userData?.watchHistory || []

    // Keep only last 100 entries
    const newHistory = [entry, ...history].slice(0, 100)

    await updateDoc(userRef, {
      watchHistory: newHistory,
    })
    trackWrite('addWatchHistory')
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
    trackQuery('getTotalUsersCount', snapshot.size)
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
    trackQuery('getRecentUsers', snapshot.size)

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

// User Settings
export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const userData = await getUserData(userId)
    return userData?.settings || { showOnlyFavorites: false }
  } catch (error) {
    console.error('Error getting user settings:', error)
    return { showOnlyFavorites: false }
  }
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    const currentSettings = await getUserSettings(userId)
    await updateDoc(userRef, {
      settings: { ...currentSettings, ...settings },
    })
    trackWrite('updateUserSettings')
  } catch (error) {
    console.error('Error updating user settings:', error)
  }
}

// Check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userData = await getUserData(userId)
    return userData?.isAdmin === true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Set user as admin
export async function setUserAsAdmin(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      isAdmin: true,
    })
    trackWrite('setUserAsAdmin')
  } catch (error) {
    console.error('Error setting user as admin:', error)
    throw error
  }
}

// Remove admin status from user
export async function removeUserAdmin(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      isAdmin: false,
    })
    trackWrite('removeUserAdmin')
  } catch (error) {
    console.error('Error removing admin status:', error)
    throw error
  }
}

export interface UserFullInfo {
  id: string
  email?: string
  isAdmin?: boolean
  lastVisit?: Timestamp
  createdAt?: Timestamp
  totalVisits?: number
  lastIP?: string
  ipAddresses?: string[]
  favoritesCount?: number
  watchHistoryCount?: number
  country?: string
}

// Get all users with full info
export async function getAllUsers(): Promise<UserFullInfo[]> {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    trackQuery('getAllUsers', snapshot.size)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        isAdmin: data.isAdmin,
        lastVisit: data.lastVisit,
        createdAt: data.createdAt,
        totalVisits: data.totalVisits,
        lastIP: data.lastIP,
        ipAddresses: data.ipAddresses,
        favoritesCount: data.favorites?.length || 0,
        watchHistoryCount: data.watchHistory?.length || 0,
        country: data.country,
      }
    })
  } catch (error) {
    console.error('Error getting all users:', error)
    return []
  }
}

// Save user country (detected from IP)
export async function saveUserCountry(userId: string, country: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, { country })
    trackWrite('saveUserCountry')
  } catch (error) {
    console.error('Error saving country:', error)
  }
}

export interface UserDetailedInfo extends UserFullInfo {
  favorites: string[]
  watchHistory: WatchHistoryEntry[]
  settings?: UserSettings
}

// Get detailed user data for admin panel
export async function getUserDetailedInfo(userId: string): Promise<UserDetailedInfo | null> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    trackRead('getUserDetailedInfo')

    if (!userSnap.exists()) return null

    const data = userSnap.data()
    return {
      id: userSnap.id,
      email: data.email,
      isAdmin: data.isAdmin,
      lastVisit: data.lastVisit,
      createdAt: data.createdAt,
      totalVisits: data.totalVisits,
      lastIP: data.lastIP,
      ipAddresses: data.ipAddresses || [],
      favoritesCount: data.favorites?.length || 0,
      watchHistoryCount: data.watchHistory?.length || 0,
      country: data.country,
      favorites: data.favorites || [],
      watchHistory: data.watchHistory || [],
      settings: data.settings,
    }
  } catch (error) {
    console.error('Error getting user detailed info:', error)
    return null
  }
}
