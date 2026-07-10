import { NextRequest, NextResponse } from 'next/server'
import { recordBandwidth } from '@/lib/bandwidthService'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 sec timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      )
    }

    const content = await response.text()

    // The playlist is returned to the client from our origin — count it.
    void recordBandwidth(new TextEncoder().encode(content).byteLength)

    return NextResponse.json({ content })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
