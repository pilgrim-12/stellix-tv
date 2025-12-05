import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      clearTimeout(timeoutId)

      return NextResponse.json({
        online: response.ok,
        status: response.status,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      // Если HEAD не работает, пробуем GET с range
      try {
        const controller2 = new AbortController()
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000)

        const response = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Range': 'bytes=0-1024', // Качаем только первый килобайт
          },
        })

        clearTimeout(timeoutId2)

        return NextResponse.json({
          online: response.ok || response.status === 206,
          status: response.status,
        })
      } catch {
        return NextResponse.json({ online: false, status: 0 })
      }
    }
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

    // Ограничиваем до 10 каналов за запрос
    const batch = channels.slice(0, 10)

    const results = await Promise.all(
      batch.map(async (channel) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)

          const response = await fetch(channel.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          })

          clearTimeout(timeoutId)

          return { id: channel.id, online: response.ok }
        } catch {
          // Пробуем GET если HEAD не сработал
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const response = await fetch(channel.url, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Range': 'bytes=0-512',
              },
            })

            clearTimeout(timeoutId)

            return { id: channel.id, online: response.ok || response.status === 206 }
          } catch {
            return { id: channel.id, online: false }
          }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
