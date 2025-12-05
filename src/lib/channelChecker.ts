/**
 * Проверяет доступность HLS потока канала через серверный API
 * Обходит CORS ограничения
 */
export async function checkChannelAvailability(url: string): Promise<boolean> {
  try {
    const response = await fetch('/api/check-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) return false

    const data = await response.json()
    return data.online === true
  } catch {
    return false
  }
}

/**
 * Проверяет несколько каналов через серверный API (batch запрос)
 * Обходит CORS ограничения
 */
export async function checkChannelsBatch(
  channels: { id: string; url: string }[]
): Promise<{ id: string; online: boolean }[]> {
  try {
    const response = await fetch('/api/check-channel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels }),
    })

    if (!response.ok) {
      return channels.map(ch => ({ id: ch.id, online: false }))
    }

    const data = await response.json()
    return data.results || []
  } catch {
    return channels.map(ch => ({ id: ch.id, online: false }))
  }
}

/**
 * Проверяет каналы партиями через серверный API
 */
export async function checkChannelsInBatches(
  channels: { id: string; url: string }[],
  onResult: (channelId: string, isOnline: boolean) => void,
  batchSize = 10,
  delayBetweenBatches = 300
): Promise<void> {
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize)

    const results = await checkChannelsBatch(batch)

    results.forEach(result => {
      onResult(result.id, result.online)
    })

    // Пауза между батчами
    if (i + batchSize < channels.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }
}
