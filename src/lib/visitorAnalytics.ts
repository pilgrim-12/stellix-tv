import { db } from './firebase'
import { doc, setDoc, updateDoc, increment, collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore'

// Visitor session interface
export interface VisitorSession {
  sessionId: string
  visitorId: string        // anonymous ID or user ID
  userId?: string          // Firebase user ID if logged in
  userEmail?: string       // User email if logged in
  isAnonymous: boolean
  country: string
  countryCode: string
  city?: string
  ip?: string              // Hashed or partial for privacy
  userAgent: string
  device: 'desktop' | 'mobile' | 'tablet'
  browser: string
  startTime: number
  lastActivity: number
  channelsWatched: number
  totalWatchTime: number   // seconds
}

// Daily stats aggregation
export interface DailyVisitorStats {
  date: string             // YYYY-MM-DD
  totalVisitors: number
  uniqueVisitors: number
  anonymousVisitors: number
  loggedInVisitors: number
  countriesCount: number
  topCountries: { country: string; count: number }[]
  totalWatchTime: number
  avgSessionDuration: number
}

// Geo info from API
interface GeoInfo {
  country: string
  countryCode: string
  city?: string
  ip?: string
}

// Cache geo info to avoid repeated API calls
let cachedGeoInfo: GeoInfo | null = null
let geoFetchPromise: Promise<GeoInfo> | null = null

// Get geo info from free API
async function getGeoInfo(): Promise<GeoInfo> {
  if (cachedGeoInfo) return cachedGeoInfo

  // If already fetching, wait for that promise
  if (geoFetchPromise) return geoFetchPromise

  geoFetchPromise = (async () => {
    // Try multiple APIs in order of preference
    const apis = [
      // ipapi.co - HTTPS, free 1000/day
      async () => {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_name) {
          return {
            country: data.country_name,
            countryCode: data.country_code || 'XX',
            city: data.city,
            ip: data.ip || undefined // Full IP for admin
          }
        }
        throw new Error('No data')
      },
      // ipinfo.io - HTTPS, free 50k/month
      async () => {
        const res = await fetch('https://ipinfo.io/json')
        const data = await res.json()
        if (data.country) {
          return {
            country: data.country,
            countryCode: data.country || 'XX',
            city: data.city,
            ip: data.ip || undefined // Full IP for admin
          }
        }
        throw new Error('No data')
      },
      // freeipapi.com - HTTPS, free
      async () => {
        const res = await fetch('https://freeipapi.com/api/json')
        const data = await res.json()
        if (data.countryName) {
          return {
            country: data.countryName,
            countryCode: data.countryCode || 'XX',
            city: data.cityName,
            ip: data.ipAddress || undefined // Full IP for admin
          }
        }
        throw new Error('No data')
      }
    ]

    for (const api of apis) {
      try {
        cachedGeoInfo = await api()
        return cachedGeoInfo
      } catch {
        // Try next API
      }
    }

    // All APIs failed
    console.error('All geo APIs failed')
    cachedGeoInfo = { country: 'Unknown', countryCode: 'XX' }
    return cachedGeoInfo
  })()

  return geoFetchPromise
}

// Detect device type from user agent
function detectDevice(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

// Detect browser from user agent
function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('edg')) return 'Edge'
  if (ua.includes('chrome')) return 'Chrome'
  if (ua.includes('safari')) return 'Safari'
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
  return 'Other'
}

// Generate anonymous visitor ID (stored in localStorage)
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server'

  const storageKey = 'stellix-visitor-id'
  let visitorId = localStorage.getItem(storageKey)

  if (!visitorId) {
    visitorId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(storageKey, visitorId)
  }

  return visitorId
}

// Current session
let currentVisitorSession: VisitorSession | null = null

// Start visitor session
export async function startVisitorSession(userId?: string, userEmail?: string): Promise<void> {
  if (typeof window === 'undefined') return

  const geoInfo = await getGeoInfo()
  const userAgent = navigator.userAgent
  const visitorId = userId || getOrCreateVisitorId()
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

  currentVisitorSession = {
    sessionId,
    visitorId,
    userId,
    userEmail,
    isAnonymous: !userId,
    country: geoInfo.country,
    countryCode: geoInfo.countryCode,
    city: geoInfo.city,
    ip: geoInfo.ip,
    userAgent,
    device: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    startTime: Date.now(),
    lastActivity: Date.now(),
    channelsWatched: 0,
    totalWatchTime: 0
  }

  // Save initial session
  await saveVisitorSession()

  // Update daily stats
  await updateDailyStats('new_visitor')
}

// Update session when user logs in
export async function updateSessionWithUser(userId: string, userEmail?: string): Promise<void> {
  if (!currentVisitorSession) return

  const wasAnonymous = currentVisitorSession.isAnonymous

  currentVisitorSession.userId = userId
  currentVisitorSession.userEmail = userEmail
  currentVisitorSession.visitorId = userId
  currentVisitorSession.isAnonymous = false

  await saveVisitorSession()

  // Update daily stats if transitioning from anonymous to logged in
  if (wasAnonymous) {
    await updateDailyStats('login')
  }
}

// Record channel watch
export async function recordChannelWatch(watchTimeSeconds: number): Promise<void> {
  if (!currentVisitorSession) return

  currentVisitorSession.channelsWatched += 1
  currentVisitorSession.totalWatchTime += watchTimeSeconds
  currentVisitorSession.lastActivity = Date.now()

  await saveVisitorSession()
}

// Save session to Firestore
async function saveVisitorSession(): Promise<void> {
  if (!currentVisitorSession) return

  try {
    const sessionRef = doc(db, 'visitorSessions', currentVisitorSession.sessionId)
    await setDoc(sessionRef, {
      ...currentVisitorSession,
      updatedAt: Date.now()
    }, { merge: true })
  } catch (error) {
    console.error('Failed to save visitor session:', error)
  }
}

// Update daily aggregated stats
async function updateDailyStats(event: 'new_visitor' | 'login'): Promise<void> {
  if (!currentVisitorSession) return

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const statsRef = doc(db, 'dailyVisitorStats', today)

  try {
    if (event === 'new_visitor') {
      await setDoc(statsRef, {
        date: today,
        totalVisitors: increment(1),
        anonymousVisitors: increment(currentVisitorSession.isAnonymous ? 1 : 0),
        loggedInVisitors: increment(currentVisitorSession.isAnonymous ? 0 : 1),
        updatedAt: Date.now()
      }, { merge: true })

      // Update country stats
      const countryRef = doc(db, 'dailyVisitorStats', today, 'countries', currentVisitorSession.countryCode)
      await setDoc(countryRef, {
        country: currentVisitorSession.country,
        countryCode: currentVisitorSession.countryCode,
        count: increment(1)
      }, { merge: true })
    } else if (event === 'login') {
      // Transitioning from anonymous to logged in
      await setDoc(statsRef, {
        anonymousVisitors: increment(-1),
        loggedInVisitors: increment(1),
        updatedAt: Date.now()
      }, { merge: true })
    }
  } catch (error) {
    console.error('Failed to update daily stats:', error)
  }
}

// Get current session info
export function getCurrentSession(): VisitorSession | null {
  return currentVisitorSession
}

// === Admin functions ===

// Get recent visitor sessions
export async function getRecentSessions(limitCount: number = 100): Promise<VisitorSession[]> {
  try {
    const sessionsRef = collection(db, 'visitorSessions')
    // Try with orderBy first, fallback to simple query if index not ready
    let snapshot
    try {
      const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(limitCount))
      snapshot = await getDocs(q)
    } catch {
      // Fallback: get all and sort client-side
      snapshot = await getDocs(sessionsRef)
    }

    const sessions = snapshot.docs.map(doc => doc.data() as VisitorSession)
    // Sort by startTime descending
    return sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0)).slice(0, limitCount)
  } catch (error) {
    console.error('Failed to get recent sessions:', error)
    return []
  }
}

// Get daily stats for date range
export async function getDailyStats(days: number = 30): Promise<DailyVisitorStats[]> {
  try {
    const statsRef = collection(db, 'dailyVisitorStats')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Try with compound query, fallback to simple if index not ready
    let snapshot
    try {
      const q = query(statsRef, where('date', '>=', startDateStr), orderBy('date', 'desc'))
      snapshot = await getDocs(q)
    } catch {
      // Fallback: get all and filter client-side
      snapshot = await getDocs(statsRef)
    }

    const stats: DailyVisitorStats[] = []

    // Filter docs by date if using fallback
    const filteredDocs = snapshot.docs.filter(doc => {
      const data = doc.data()
      return data.date && data.date >= startDateStr
    })

    for (const docSnapshot of filteredDocs) {
      const data = docSnapshot.data()

      // Get country breakdown for this day
      const countriesRef = collection(db, 'dailyVisitorStats', docSnapshot.id, 'countries')
      const countriesSnapshot = await getDocs(countriesRef)
      const countries = countriesSnapshot.docs.map(d => ({
        country: d.data().country,
        count: d.data().count
      })).sort((a, b) => b.count - a.count)

      stats.push({
        date: data.date,
        totalVisitors: data.totalVisitors || 0,
        uniqueVisitors: data.totalVisitors || 0, // Same for now
        anonymousVisitors: data.anonymousVisitors || 0,
        loggedInVisitors: data.loggedInVisitors || 0,
        countriesCount: countries.length,
        topCountries: countries.slice(0, 10),
        totalWatchTime: data.totalWatchTime || 0,
        avgSessionDuration: data.avgSessionDuration || 0
      })
    }

    // Sort by date descending
    return stats.sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    console.error('Failed to get daily stats:', error)
    return []
  }
}

// Get visitor stats summary
export async function getVisitorStatsSummary(): Promise<{
  today: { total: number; anonymous: number; loggedIn: number }
  week: { total: number; anonymous: number; loggedIn: number }
  topCountries: { country: string; countryCode: string; count: number }[]
  recentSessions: VisitorSession[]
}> {
  try {
    const dailyStats = await getDailyStats(7)
    const recentSessions = await getRecentSessions(20)

    const today = new Date().toISOString().split('T')[0]
    const todayStats = dailyStats.find(s => s.date === today)

    const weekTotals = dailyStats.reduce((acc, day) => ({
      total: acc.total + day.totalVisitors,
      anonymous: acc.anonymous + day.anonymousVisitors,
      loggedIn: acc.loggedIn + day.loggedInVisitors
    }), { total: 0, anonymous: 0, loggedIn: 0 })

    // Aggregate countries from all days
    const countryMap = new Map<string, { country: string; countryCode: string; count: number }>()
    dailyStats.forEach(day => {
      day.topCountries.forEach(c => {
        const existing = countryMap.get(c.country)
        if (existing) {
          existing.count += c.count
        } else {
          countryMap.set(c.country, { country: c.country, countryCode: '', count: c.count })
        }
      })
    })

    const topCountries = Array.from(countryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      today: {
        total: todayStats?.totalVisitors || 0,
        anonymous: todayStats?.anonymousVisitors || 0,
        loggedIn: todayStats?.loggedInVisitors || 0
      },
      week: weekTotals,
      topCountries,
      recentSessions
    }
  } catch (error) {
    console.error('Failed to get visitor summary:', error)
    return {
      today: { total: 0, anonymous: 0, loggedIn: 0 },
      week: { total: 0, anonymous: 0, loggedIn: 0 },
      topCountries: [],
      recentSessions: []
    }
  }
}

// End session on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentVisitorSession) {
      currentVisitorSession.lastActivity = Date.now()
      // Note: async operations may not complete on beforeunload
      // Consider using sendBeacon in the future
      saveVisitorSession()
    }
  })
}
