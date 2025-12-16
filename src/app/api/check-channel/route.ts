import { NextRequest, NextResponse } from 'next/server'

// Check if content looks like a valid HLS playlist
function isValidHlsContent(content: string): boolean {
  const trimmed = content.trim()
  // HLS playlists start with #EXTM3U or contain HLS tags
  return (
    trimmed.startsWith('#EXTM3U') ||
    trimmed.includes('#EXT-X-') ||
    trimmed.includes('#EXTINF')
  )
}

// Check a single channel URL
async function checkChannelUrl(url: string): Promise<{ online: boolean; status: number }> {
  const isHls = url.includes('.m3u8')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

  try {
    // For HLS, we need to GET the playlist and verify it's valid
    if (isHls) {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return { online: false, status: response.status }
      }

      // Read first 2KB to check if it's valid HLS
      const reader = response.body?.getReader()
      if (!reader) {
        return { online: false, status: 0 }
      }

      let content = ''
      let bytesRead = 0
      const maxBytes = 2048

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read()
        if (done) break
        content += new TextDecoder().decode(value)
        bytesRead += value?.length || 0
        if (bytesRead >= maxBytes) break
      }

      reader.cancel()

      // Check if content is valid HLS
      const isValid = isValidHlsContent(content)
      return { online: isValid, status: response.status }
    }

    // For non-HLS, try HEAD first, then GET
    try {
      const headResponse = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId)
      return { online: headResponse.ok, status: headResponse.status }
    } catch {
      // HEAD failed, try GET with range
      const controller2 = new AbortController()
      const timeoutId2 = setTimeout(() => controller2.abort(), 8000)

      const getResponse = await fetch(url, {
        method: 'GET',
        signal: controller2.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Range': 'bytes=0-512',
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId2)
      return { online: getResponse.ok || getResponse.status === 206, status: getResponse.status }
    }
  } catch (error) {
    clearTimeout(timeoutId)
    return { online: false, status: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const result = await checkChannelUrl(url)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ online: false, error: 'Server error' }, { status: 500 })
  }
}

// Проверка нескольких каналов за раз
export async function PUT(request: NextRequest) {
  try {
    const { channels } = await request.json() as { channels: { id: string; url: string }[] }

    if (!channels || !Array.isArray(channels)) {
      return NextResponse.json({ error: 'Channels array is required' }, { status: 400 })
    }

    // Ограничиваем до 5 каналов за запрос (меньше для более надежной проверки)
    const batch = channels.slice(0, 5)

    const results = await Promise.all(
      batch.map(async (channel) => {
        const result = await checkChannelUrl(channel.url)
        return { id: channel.id, online: result.online }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
