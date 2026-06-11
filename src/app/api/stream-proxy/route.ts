import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy for HLS streams that have CORS issues.
 * GET /api/stream-proxy?url=https://...
 *
 * For m3u8 playlists: rewrites relative/absolute URLs to also go through proxy.
 * For segments (.ts): streams them through directly.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  // Basic validation
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream ${response.status}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const isPlaylist = url.endsWith('.m3u8') || url.endsWith('.m3u') ||
      contentType.includes('mpegurl') || contentType.includes('m3u')

    if (isPlaylist) {
      // Read and rewrite m3u8 playlist
      const text = await response.text()
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
      const origin = parsed.origin
      const proxyBase = '/api/stream-proxy?url='

      // Resolve relative/absolute paths to full URLs
      const resolve = (ref: string) => {
        if (ref.startsWith('http://') || ref.startsWith('https://')) return ref
        if (ref.startsWith('/')) return origin + ref
        return baseUrl + ref
      }

      const rewritten = text.split('\n').map(line => {
        const trimmed = line.trim()
        // Skip comments/tags except URI= attributes
        if (trimmed.startsWith('#')) {
          // Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MAP
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
            return `URI="${proxyBase}${encodeURIComponent(resolve(uri))}"`
          })
        }
        // Skip empty lines
        if (!trimmed) return line
        // This is a URL line — make absolute and proxy it
        return proxyBase + encodeURIComponent(resolve(trimmed))
      }).join('\n')

      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // For segments — stream through
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    })
    if (contentType) headers.set('Content-Type', contentType)
    const contentLength = response.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(response.body, { headers })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 })
  }
}
