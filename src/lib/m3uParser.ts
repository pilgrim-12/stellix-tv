import { Channel } from '@/types'

interface M3UChannel {
  name: string
  logo?: string
  group?: string
  url: string
  language?: string
  country?: string
}

// Mapping from country codes to primary language
const countryToLanguage: Record<string, string> = {
  // Russian-speaking
  'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru', 'TJ': 'ru',
  // English-speaking
  'US': 'en', 'GB': 'en', 'UK': 'en', 'AU': 'en', 'CA': 'en', 'NZ': 'en', 'IE': 'en',
  // German-speaking
  'DE': 'de', 'AT': 'de', 'CH': 'de', 'LI': 'de',
  // French-speaking
  'FR': 'fr', 'BE': 'fr', 'MC': 'fr', 'LU': 'fr',
  // Spanish-speaking
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CL': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
  'EC': 'es', 'BO': 'es', 'PY': 'es', 'UY': 'es', 'CR': 'es', 'PA': 'es', 'CU': 'es',
  // Portuguese-speaking
  'PT': 'pt', 'BR': 'pt', 'AO': 'pt', 'MZ': 'pt',
  // Italian
  'IT': 'it', 'SM': 'it', 'VA': 'it',
  // Arabic-speaking
  'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar', 'IQ': 'ar',
  'JO': 'ar', 'LB': 'ar', 'SY': 'ar', 'KW': 'ar', 'QA': 'ar', 'BH': 'ar', 'OM': 'ar',
  'YE': 'ar', 'LY': 'ar', 'SD': 'ar',
  // Turkish
  'TR': 'tr', 'CY': 'tr',
  // Georgian
  'GE': 'ka',
  // Ukrainian
  'UA': 'uk',
  // Polish
  'PL': 'pl',
  // Czech
  'CZ': 'cs',
  // Slovak
  'SK': 'sk',
  // Hungarian
  'HU': 'hu',
  // Romanian
  'RO': 'ro', 'MD': 'ro',
  // Bulgarian
  'BG': 'bg',
  // Serbian/Croatian/Bosnian
  'RS': 'sr', 'HR': 'hr', 'BA': 'bs', 'ME': 'sr', 'SI': 'sl', 'MK': 'mk',
  // Greek
  'GR': 'el',
  // Albanian
  'AL': 'sq', 'XK': 'sq',
  // Armenian
  'AM': 'hy',
  // Azerbaijani
  'AZ': 'az',
  // Persian
  'IR': 'fa', 'AF': 'fa',
  // Hindi
  'IN': 'hi',
  // Japanese
  'JP': 'ja',
  // Korean
  'KR': 'ko', 'KP': 'ko',
  // Chinese
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'MO': 'zh',
  // Vietnamese
  'VN': 'vi',
  // Thai
  'TH': 'th',
  // Indonesian/Malay
  'ID': 'id', 'MY': 'ms',
  // Dutch
  'NL': 'nl',
  // Swedish
  'SE': 'sv',
  // Norwegian
  'NO': 'no',
  // Danish
  'DK': 'da',
  // Finnish
  'FI': 'fi',
  // Estonian
  'EE': 'et',
  // Latvian
  'LV': 'lv',
  // Lithuanian
  'LT': 'lt',
  // Hebrew
  'IL': 'he',
  // Catalan
  'AD': 'ca',
  // Chad (French)
  'TD': 'fr',
}

// Patterns in channel names that indicate language
const languagePatterns: Array<{ pattern: RegExp; language: string }> = [
  // English indicators
  { pattern: /\b(english|eng)\b/i, language: 'en' },
  { pattern: /\[EN\]/i, language: 'en' },
  { pattern: /\(EN\)/i, language: 'en' },
  // Russian indicators
  { pattern: /\b(russian|rus|рус)\b/i, language: 'ru' },
  { pattern: /\[RU\]/i, language: 'ru' },
  { pattern: /\(RU\)/i, language: 'ru' },
  // Georgian indicators
  { pattern: /\b(georgian|geo|грузин)/i, language: 'ka' },
  { pattern: /\[GE\]/i, language: 'ka' },
  { pattern: /\(GE\)/i, language: 'ka' },
  { pattern: /საქართველო/i, language: 'ka' }, // Georgian script
  // German indicators
  { pattern: /\b(german|ger|deu|deutsch)\b/i, language: 'de' },
  { pattern: /\[DE\]/i, language: 'de' },
  { pattern: /\(DE\)/i, language: 'de' },
  // French indicators
  { pattern: /\b(french|fra|français)\b/i, language: 'fr' },
  { pattern: /\[FR\]/i, language: 'fr' },
  { pattern: /\(FR\)/i, language: 'fr' },
  // Spanish indicators
  { pattern: /\b(spanish|spa|español)\b/i, language: 'es' },
  { pattern: /\[ES\]/i, language: 'es' },
  { pattern: /\(ES\)/i, language: 'es' },
  // Arabic indicators
  { pattern: /\b(arabic|ara|عربي)\b/i, language: 'ar' },
  { pattern: /\[AR\]/i, language: 'ar' },
  { pattern: /\(AR\)/i, language: 'ar' },
  // Turkish indicators
  { pattern: /\b(turkish|tur|türk)\b/i, language: 'tr' },
  { pattern: /\[TR\]/i, language: 'tr' },
  { pattern: /\(TR\)/i, language: 'tr' },
  // Ukrainian indicators
  { pattern: /\b(ukrainian|ukr|укр)\b/i, language: 'uk' },
  { pattern: /\[UA\]/i, language: 'uk' },
  { pattern: /\(UA\)/i, language: 'uk' },
  // Portuguese indicators
  { pattern: /\b(portuguese|por|português)\b/i, language: 'pt' },
  { pattern: /\[PT\]/i, language: 'pt' },
  { pattern: /\(PT\)/i, language: 'pt' },
  // Italian indicators
  { pattern: /\b(italian|ita|italiano)\b/i, language: 'it' },
  { pattern: /\[IT\]/i, language: 'it' },
  { pattern: /\(IT\)/i, language: 'it' },
  // Polish indicators
  { pattern: /\b(polish|pol|polski)\b/i, language: 'pl' },
  { pattern: /\[PL\]/i, language: 'pl' },
  { pattern: /\(PL\)/i, language: 'pl' },
  // Hindi indicators
  { pattern: /\b(hindi|hin)\b/i, language: 'hi' },
  { pattern: /\[HI\]/i, language: 'hi' },
  { pattern: /\(HI\)/i, language: 'hi' },
  // Armenian indicators
  { pattern: /\b(armenian|arm|армян)/i, language: 'hy' },
  { pattern: /\[AM\]/i, language: 'hy' },
  { pattern: /\(AM\)/i, language: 'hy' },
  // Azerbaijani indicators
  { pattern: /\b(azerbaijani|aze|азерб)/i, language: 'az' },
  { pattern: /\[AZ\]/i, language: 'az' },
  { pattern: /\(AZ\)/i, language: 'az' },
]

/**
 * Detects language from channel name patterns
 */
function detectLanguageFromName(name: string): string | null {
  for (const { pattern, language } of languagePatterns) {
    if (pattern.test(name)) {
      return language
    }
  }
  return null
}

/**
 * Gets language from country code
 */
function getLanguageFromCountry(country: string | undefined): string | null {
  if (!country) return null
  return countryToLanguage[country.toUpperCase()] || null
}

// Patterns for group-title that indicate language/country
const groupTitlePatterns: Array<{ pattern: RegExp; language: string }> = [
  // Country/region names
  { pattern: /\b(russia|russian|россия|русские)\b/i, language: 'ru' },
  { pattern: /\b(georgia|georgian|грузия|грузинские)\b/i, language: 'ka' },
  { pattern: /\b(usa|america|american|english|uk|british)\b/i, language: 'en' },
  { pattern: /\b(germany|german|deutsch|deutschland)\b/i, language: 'de' },
  { pattern: /\b(france|french|français|francia)\b/i, language: 'fr' },
  { pattern: /\b(spain|spanish|español|españa)\b/i, language: 'es' },
  { pattern: /\b(italy|italian|italiano|italia)\b/i, language: 'it' },
  { pattern: /\b(turkey|turkish|türkiye|türk)\b/i, language: 'tr' },
  { pattern: /\b(ukraine|ukrainian|україна|украина)\b/i, language: 'uk' },
  { pattern: /\b(poland|polish|polska|polski)\b/i, language: 'pl' },
  { pattern: /\b(arab|arabic|عربي)\b/i, language: 'ar' },
  { pattern: /\b(portugal|portuguese|brasil|brazil)\b/i, language: 'pt' },
  { pattern: /\b(armenia|armenian|армения|армянские)\b/i, language: 'hy' },
  { pattern: /\b(azerbaijan|azerbaijani|азербайджан)\b/i, language: 'az' },
  { pattern: /\b(india|indian|hindi)\b/i, language: 'hi' },
  { pattern: /\b(japan|japanese|日本)\b/i, language: 'ja' },
  { pattern: /\b(korea|korean|한국)\b/i, language: 'ko' },
  { pattern: /\b(china|chinese|中国)\b/i, language: 'zh' },
  { pattern: /\b(netherlands|dutch|nederland)\b/i, language: 'nl' },
  { pattern: /\b(greece|greek|ελλάδα)\b/i, language: 'el' },
  { pattern: /\b(romania|romanian|românia)\b/i, language: 'ro' },
  { pattern: /\b(bulgaria|bulgarian|българия)\b/i, language: 'bg' },
  { pattern: /\b(serbia|serbian|србија)\b/i, language: 'sr' },
  { pattern: /\b(croatia|croatian|hrvatska)\b/i, language: 'hr' },
  { pattern: /\b(albania|albanian|shqipëri)\b/i, language: 'sq' },
  { pattern: /\b(belarus|belarusian|беларусь)\b/i, language: 'ru' }, // Belarusian TV mostly in Russian
]

/**
 * Detects language from group-title
 */
function detectLanguageFromGroupTitle(group: string): string | null {
  for (const { pattern, language } of groupTitlePatterns) {
    if (pattern.test(group)) {
      return language
    }
  }
  return null
}

/**
 * Парсит M3U плейлист и возвращает массив каналов
 */
export function parseM3U(content: string): M3UChannel[] {
  const channels: M3UChannel[] = []
  const lines = content.split('\n').map(line => line.trim())

  let currentChannel: Partial<M3UChannel> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      // Format: #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Channel Name
      currentChannel = {}

      // Extract attributes
      const logoMatch = line.match(/tvg-logo="([^"]*)"/)
      const groupMatch = line.match(/group-title="([^"]*)"/)
      const langMatch = line.match(/tvg-language="([^"]*)"/)
      const countryMatch = line.match(/tvg-country="([^"]*)"/)
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/)

      if (logoMatch) currentChannel.logo = logoMatch[1]
      if (groupMatch) currentChannel.group = groupMatch[1]
      if (langMatch) currentChannel.language = langMatch[1].toLowerCase()
      if (countryMatch) currentChannel.country = countryMatch[1].toUpperCase()

      // Try to extract country from tvg-id if not found (e.g., "RU.Channel1" or "Channel1.ru")
      if (!currentChannel.country && tvgIdMatch) {
        const tvgId = tvgIdMatch[1]
        const countryFromId = tvgId.match(/^([A-Z]{2})\./i) || tvgId.match(/\.([A-Z]{2})$/i)
        if (countryFromId) {
          currentChannel.country = countryFromId[1].toUpperCase()
        }
      }

      // Try to extract language from group-title (e.g., "Russia", "Georgian", "English News")
      if (!currentChannel.language && groupMatch) {
        const group = groupMatch[1]
        const langFromGroup = detectLanguageFromGroupTitle(group)
        if (langFromGroup) {
          currentChannel.language = langFromGroup
        }
      }

      // Extract channel name (after the last comma)
      const nameMatch = line.match(/,([^,]+)$/)
      if (nameMatch) {
        currentChannel.name = nameMatch[1].trim()
      }
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      // This is the URL line
      if (currentChannel.name) {
        currentChannel.url = line
        channels.push(currentChannel as M3UChannel)
      }
      currentChannel = {}
    }
  }

  return channels
}

/**
 * Конвертирует M3U каналы в формат нашего приложения
 */
export function convertToAppChannels(m3uChannels: M3UChannel[], sourceId: string): Channel[] {
  const groupMapping: Record<string, string> = {
    'новости': 'news',
    'news': 'news',
    'спорт': 'sports',
    'sports': 'sports',
    'кино': 'movies',
    'movies': 'movies',
    'фильмы': 'movies',
    'детские': 'kids',
    'kids': 'kids',
    'детям': 'kids',
    'музыка': 'music',
    'music': 'music',
    'развлекательные': 'entertainment',
    'entertainment': 'entertainment',
    'познавательные': 'documentary',
    'documentary': 'documentary',
    'общие': 'entertainment',
    'general': 'entertainment',
  }

  return m3uChannels.map((ch, index) => {
    const groupLower = (ch.group || '').toLowerCase()
    const mappedGroup = Object.entries(groupMapping).find(([key]) =>
      groupLower.includes(key)
    )?.[1] || 'entertainment'

    // Determine language with priority:
    // 1. Explicit tvg-language from M3U
    // 2. Language detected from channel name patterns
    // 3. Language inferred from country code
    // 4. Default to 'ru' as last resort
    const detectedLanguage =
      ch.language ||
      detectLanguageFromName(ch.name) ||
      getLanguageFromCountry(ch.country) ||
      'ru'

    return {
      id: `${sourceId}-${index}`,
      name: ch.name,
      logo: ch.logo || '',
      url: ch.url,
      group: mappedGroup,
      country: ch.country || 'XX',
      language: detectedLanguage,
      labels: ['Live'],
      enabled: true,
      isCustom: true, // Помечаем как пользовательский канал
    }
  })
}

/**
 * Recalculates language for a channel based on all available data
 */
export function recalculateChannelLanguage(channel: {
  name: string
  country?: string
  group?: string
  language?: string
}): string {
  // Priority:
  // 1. Detect from channel name patterns
  // 2. Detect from group title
  // 3. Detect from country code
  // 4. Keep existing language if valid
  // 5. Default to 'ru'

  const fromName = detectLanguageFromName(channel.name)
  if (fromName) return fromName

  const fromGroup = channel.group ? detectLanguageFromGroupTitle(channel.group) : null
  if (fromGroup) return fromGroup

  const fromCountry = getLanguageFromCountry(channel.country)
  if (fromCountry) return fromCountry

  // Keep existing if it's not the default 'ru' (meaning it was set explicitly)
  if (channel.language && channel.language !== 'ru') {
    return channel.language
  }

  return 'ru'
}

/**
 * Загружает M3U плейлист по URL
 */
export async function fetchM3UPlaylist(url: string): Promise<string> {
  const response = await fetch('/api/fetch-m3u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch playlist')
  }

  const data = await response.json()
  return data.content
}
