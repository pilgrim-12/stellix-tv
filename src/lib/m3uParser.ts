import { Channel } from '@/types'

interface M3UChannel {
  name: string
  logo?: string
  group?: string
  url: string
  language?: string
  country?: string
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

      if (logoMatch) currentChannel.logo = logoMatch[1]
      if (groupMatch) currentChannel.group = groupMatch[1]
      if (langMatch) currentChannel.language = langMatch[1].toLowerCase()
      if (countryMatch) currentChannel.country = countryMatch[1].toUpperCase()

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

    return {
      id: `${sourceId}-${index}`,
      name: ch.name,
      logo: ch.logo || '',
      url: ch.url,
      group: mappedGroup,
      country: ch.country || 'XX',
      language: ch.language || 'ru',
      labels: ['Live'],
      enabled: true,
      isCustom: true, // Помечаем как пользовательский канал
    }
  })
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
