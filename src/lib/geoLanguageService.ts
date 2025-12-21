// Geo-based language detection service
// Determines default channel language filter based on user's country

// Country code to channel language mapping
const countryToLanguage: Record<string, string> = {
  // Russian-speaking countries
  RU: 'ru', // Russia
  UA: 'ru', // Ukraine (many Russian channels available)
  GE: 'ru', // Georgia
  KZ: 'ru', // Kazakhstan
  BY: 'ru', // Belarus
  AM: 'ru', // Armenia
  AZ: 'ru', // Azerbaijan
  MD: 'ru', // Moldova
  KG: 'ru', // Kyrgyzstan
  UZ: 'ru', // Uzbekistan
  TJ: 'ru', // Tajikistan
  TM: 'ru', // Turkmenistan

  // Spanish-speaking countries
  MX: 'es', // Mexico
  ES: 'es', // Spain
  AR: 'es', // Argentina
  CO: 'es', // Colombia
  CL: 'es', // Chile
  PE: 'es', // Peru
  VE: 'es', // Venezuela
  EC: 'es', // Ecuador
  GT: 'es', // Guatemala
  CU: 'es', // Cuba
  BO: 'es', // Bolivia
  DO: 'es', // Dominican Republic
  HN: 'es', // Honduras
  PY: 'es', // Paraguay
  SV: 'es', // El Salvador
  NI: 'es', // Nicaragua
  CR: 'es', // Costa Rica
  PA: 'es', // Panama
  UY: 'es', // Uruguay

  // Portuguese-speaking countries
  BR: 'pt', // Brazil
  PT: 'pt', // Portugal

  // French-speaking countries
  FR: 'fr', // France
  BE: 'fr', // Belgium (French/Dutch, but French TV popular)
  CH: 'fr', // Switzerland (multilingual, French common)
  LU: 'fr', // Luxembourg
  MC: 'fr', // Monaco
  SN: 'fr', // Senegal
  CI: 'fr', // Côte d'Ivoire
  ML: 'fr', // Mali
  BF: 'fr', // Burkina Faso
  NE: 'fr', // Niger
  TG: 'fr', // Togo
  BJ: 'fr', // Benin
  GA: 'fr', // Gabon
  CG: 'fr', // Congo
  CD: 'fr', // DR Congo
  CM: 'fr', // Cameroon
  MG: 'fr', // Madagascar
  HT: 'fr', // Haiti
  MA: 'fr', // Morocco
  DZ: 'fr', // Algeria
  TN: 'fr', // Tunisia

  // English-speaking countries (explicit)
  US: 'en', // USA
  GB: 'en', // United Kingdom
  CA: 'en', // Canada (also French, but English majority)
  AU: 'en', // Australia
  NZ: 'en', // New Zealand
  IE: 'en', // Ireland
}

// Default language for countries not in the mapping
const DEFAULT_LANGUAGE = 'en'

// localStorage keys
const STORAGE_KEY = 'stellix-language-preference'
const LEGACY_LANGUAGE_KEY = 'stellix-selected-language'

interface LanguagePreference {
  language: string
  isAutoDetected: boolean
  detectedCountry?: string
}

/**
 * Get saved language preference from localStorage
 */
export function getSavedLanguagePreference(): LanguagePreference | null {
  if (typeof window === 'undefined') return null

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON, ignore
  }

  // Check for legacy format (just the language code without preference metadata)
  // If legacy exists but no preference, treat as needing auto-detection
  // (user may have had 'ru' as default before geo-detection was implemented)
  return null
}

/**
 * Save language preference to localStorage
 */
export function saveLanguagePreference(
  language: string,
  isAutoDetected: boolean,
  detectedCountry?: string
): void {
  if (typeof window === 'undefined') return

  const preference: LanguagePreference = {
    language,
    isAutoDetected,
    detectedCountry,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
}

/**
 * Save manual language selection (user chose language manually)
 */
export function saveManualLanguageChoice(language: string): void {
  saveLanguagePreference(language, false)
}

/**
 * Get language for a country code
 */
export function getLanguageForCountry(countryCode: string): string {
  return countryToLanguage[countryCode.toUpperCase()] || DEFAULT_LANGUAGE
}

/**
 * Detect user's country via IP geolocation API
 * Uses ip-api.com (free, no API key needed, 45 requests/minute limit)
 */
export async function detectUserCountry(): Promise<string | null> {
  // Try ipapi.co first (HTTPS, free tier: 1000 requests/day)
  try {
    const response = await fetch('https://ipapi.co/country_code/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (response.ok) {
      const countryCode = await response.text()
      if (countryCode && countryCode.length === 2) {
        return countryCode.trim()
      }
    }
  } catch (error) {
    console.warn('[GeoLanguage] ipapi.co failed:', error)
  }

  // Fallback to ip-api.com (HTTP only, but works as fallback)
  // Note: This may be blocked on HTTPS sites due to mixed content
  try {
    const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.countryCode) {
        return data.countryCode
      }
    }
  } catch (error) {
    console.warn('[GeoLanguage] ip-api.com failed:', error)
  }

  return null
}

/**
 * Main function: Get the language filter to use
 *
 * Priority:
 * 1. Manual user selection (isAutoDetected: false) -> use it
 * 2. No preference -> detect country, set language, save with isAutoDetected: true
 * 3. Fallback to 'en' if detection fails
 */
export async function getDefaultLanguageFilter(): Promise<{
  language: string
  isAutoDetected: boolean
  countryCode?: string
}> {
  // Check for saved preference first
  const saved = getSavedLanguagePreference()

  if (saved && !saved.isAutoDetected) {
    // User manually chose a language - respect their choice
    console.log('[GeoLanguage] Using manual preference:', saved.language)
    return {
      language: saved.language,
      isAutoDetected: false,
    }
  }

  // Either no preference or auto-detected before - try to detect
  const countryCode = await detectUserCountry()

  if (countryCode) {
    const language = getLanguageForCountry(countryCode)
    console.log(`[GeoLanguage] Detected country: ${countryCode} -> language: ${language}`)

    // Save auto-detected preference
    saveLanguagePreference(language, true, countryCode)

    return {
      language,
      isAutoDetected: true,
      countryCode,
    }
  }

  // Detection failed, use default
  console.log('[GeoLanguage] Detection failed, using default:', DEFAULT_LANGUAGE)
  return {
    language: DEFAULT_LANGUAGE,
    isAutoDetected: true,
  }
}

/**
 * Check if we should run auto-detection
 * Returns true if no manual preference exists
 */
export function shouldAutoDetect(): boolean {
  const saved = getSavedLanguagePreference()
  // Auto-detect if no preference OR if previous was auto-detected
  return !saved || saved.isAutoDetected
}
