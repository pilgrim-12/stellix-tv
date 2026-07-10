import { NextRequest, NextResponse } from 'next/server'
import { getAppSettings } from '@/lib/appSettingsService'
import { recordBandwidth } from '@/lib/bandwidthService'

/**
 * Proxy for HLS streams that have CORS issues.
 * GET /api/stream-proxy?url=https://...
 *
 * For m3u8 playlists: resolves relative URLs to absolute direct URLs (no proxy).
 *   Segments load directly from CDN — zero Vercel bandwidth.
 *
 * For segments (.ts/.m4s):
 *   - proxySegments OFF (default): 302 redirect to source (zero bandwidth)
 *   - proxySegments ON (admin toggle): pipe through Vercel (burns bandwidth)
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

  const contentType = ''
  const isPlaylist = url.endsWith('.m3u8') || url.endsWith('.m3u')

  // For non-playlist requests, check if segment proxying is enabled
  if (!isPlaylist) {
    let proxySegments = false
    try {
      const settings = await getAppSettings()
      proxySegments = settings.proxySegments
    } catch {
      // Default: don't proxy segments
    }

    if (!proxySegments) {
      // 302 redirect — browser/HLS.js follows redirect, zero Vercel bandwidth
      return NextResponse.redirect(url, 302)
    }

    // Proxy segments through (admin enabled)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
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
        return NextResponse.json({ error: `Upstream ${response.status}` }, { status: response.status })
      }

      const respContentType = response.headers.get('content-type') || ''
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      })
      if (respContentType) headers.set('Content-Type', respContentType)
      const contentLength = response.headers.get('content-length')
      if (contentLength) headers.set('Content-Length', contentLength)

      // Count real bytes streamed to the client (this is the outbound Fast Origin
      // Transfer that Vercel bills). We can't trust Content-Length alone (chunked
      // responses omit it), so wrap the stream and sum chunk lengths, recording
      // the total once the stream finishes.
      if (!response.body) {
        return new NextResponse(null, { headers })
      }
      let transferred = 0
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          transferred += chunk.byteLength
          ctrl.enqueue(chunk)
        },
        flush() {
          void recordBandwidth(transferred)
        },
      })
      return new NextResponse(response.body.pipeThrough(counter), { headers })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 })
      }
      return NextResponse.json({ error: 'Proxy error' }, { status: 502 })
    }
  }

  // --- M3U8 playlist handling (always proxied — tiny payload) ---
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

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
      return NextResponse.json({ error: `Upstream ${response.status}` }, { status: response.status })
    }

    const text = await response.text()
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
    const origin = parsed.origin

    // Resolve relative/absolute paths to full URLs
    const resolve = (ref: string) => {
      if (ref.startsWith('http://') || ref.startsWith('https://')) return ref
      if (ref.startsWith('/')) return origin + ref
      return baseUrl + ref
    }

    // Check if this is a master playlist (contains variant streams = other m3u8s)
    const isMasterPlaylist = text.includes('#EXT-X-STREAM-INF')

    const proxyBase = '/api/stream-proxy?url='

    const rewritten = text.split('\n').map(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        // Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MAP
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          const resolved = resolve(uri)
          // KEY/MAP URIs: use direct URL (small files)
          return `URI="${resolved}"`
        })
      }
      if (!trimmed) return line

      // URL line
      const resolved = resolve(trimmed)
      if (isMasterPlaylist || resolved.endsWith('.m3u8') || resolved.endsWith('.m3u')) {
        // Variant/sub-playlist — proxy it (so we can rewrite its segment URLs too)
        return proxyBase + encodeURIComponent(resolved)
      }

      // Segment URL — direct to source (no proxy)
      return resolved
    }).join('\n')

    // Playlists are tiny but still served from our origin — count them too.
    void recordBandwidth(new TextEncoder().encode(rewritten).byteLength)

    return new NextResponse(rewritten, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 })
  }
}
