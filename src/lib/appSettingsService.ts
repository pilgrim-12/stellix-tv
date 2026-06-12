import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export interface AppSettings {
  proxySegments: boolean // pipe video segments through Vercel (burns bandwidth)
}

const DEFAULTS: AppSettings = {
  proxySegments: false,
}

// In-memory cache
let cached: AppSettings | null = null
let cacheTs = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const DOC_REF = doc(db, 'app_settings', 'config')

export async function getAppSettings(): Promise<AppSettings> {
  if (cached && Date.now() - cacheTs < CACHE_TTL) return cached

  try {
    const snap = await getDoc(DOC_REF)
    if (snap.exists()) {
      cached = { ...DEFAULTS, ...snap.data() } as AppSettings
    } else {
      cached = { ...DEFAULTS }
    }
    cacheTs = Date.now()
    return cached
  } catch (error) {
    console.error('[AppSettings] Failed to load:', error)
    return cached ?? { ...DEFAULTS }
  }
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    await setDoc(DOC_REF, settings, { merge: true })
    // Invalidate cache
    if (cached) {
      cached = { ...cached, ...settings }
      cacheTs = Date.now()
    }
  } catch (error) {
    console.error('[AppSettings] Failed to update:', error)
    throw error
  }
}
