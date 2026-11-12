import { NextRequest, NextResponse } from 'next/server'

/**
 * Stream verification for the auto-discovery module.
 *
 * A channel is only worth adding if the browser can play it *itself*:
 * hls.js fetches the manifest with CORS, so every response in the redirect
 * chain must allow our origin. If the chain only becomes CORS-friendly after
 * a redirect (jmp2.uk → wurl/roku CDN, for example) we report the resolved
 * final URL, so the channel can be stored already-resolved and still play
 * without /api/stream-proxy.
 *
 * Nothing here streams video: we read at most 2 KB of each manifest.
 */

export const maxDuration = 60

const MAX_URLS = 40
const CONCURRENCY = 12
const PER_URL_TIMEOUT = 9000
const MAX_HOPS = 4
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface StreamVerdict {
  url: string
  /** manifest answered with a valid HLS body */
  online: boolean
  /** playable by the browser as-is — CORS passes on every hop */
  direct: boolean
  /** playable only after following redirects server-side; use `playUrl` then */
  resolved: boolean
  /** URL to store for playback (original when direct, final hop when resolved) */
  playUrl: string | null
  status: number
  acao: string | null
  error?: string
}

function looksLikeHls(body: string): boolean {
  return /#EXTM3U|#EXT-X-|#EXTINF/.test(body)
}

function corsAllows(acao: string | null, origin: string): boolean {
  return acao === '*' || (!!acao && acao === origin)
}

async function readHead(res: Response, limit = 2048): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  let text = ''
  let read = 0
  const decoder = new TextDecoder()
  try {
    while (read < limit) {
      const { done, value } = await reader.read()
      if (done) break
      read += value?.length || 0
      text += decoder.decode(value, { stream: true })
    }
  } catch {
    /* truncated body is fine — we only sniff the header */
  } finally {
    void reader.cancel().catch(() => {})
  }
  return text
}

async function verifyStream(rawUrl: string, origin: string): Promise<StreamVerdict> {
  const verdict: StreamVerdict = {
    url: rawUrl,
    online: false,
    direct: false,
    resolved: false,
    playUrl: null,
    status: 0,
    acao: null,
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    verdict.error = 'unsupported protocol'
    return verdict
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PER_URL_TIMEOUT)

  try {
    let current = rawUrl
    let corsOnEveryHop = true
    let hops = 0

    // Walk the redirect chain by hand: a CORS request fails in the browser as
    // soon as one hop omits the header, even if the destination allows us.
    for (;;) {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { Origin: origin, 'User-Agent': BROWSER_UA, Accept: '*/*' },
      })

      const acao = res.headers.get('access-control-allow-origin')
      if (!corsAllows(acao, origin)) corsOnEveryHop = false

      const location = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && location && hops < MAX_HOPS) {
        void res.body?.cancel().catch(() => {})
        current = new URL(location, current).href
        hops++
        continue
      }

      verdict.status = res.status
      verdict.acao = acao

      if (!res.ok) {
        void res.body?.cancel().catch(() => {})
        return verdict
      }

      const body = await readHead(res)
      verdict.online = looksLikeHls(body)
      if (!verdict.online) {
        verdict.error = 'not an HLS manifest'
        return verdict
      }

      if (corsOnEveryHop) {
        verdict.direct = true
        verdict.playUrl = rawUrl
      } else if (corsAllows(acao, origin)) {
        // Only the destination allows us — store it resolved so the browser
        // never has to touch the CORS-less redirector.
        verdict.resolved = true
        verdict.playUrl = current
      }

      return verdict
    }
  } catch (error) {
    verdict.error = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'fetch failed'
    return verdict
  } finally {
    clearTimeout(timer)
  }
}

async function pool<T, R>(items: T[], worker: (item: T) => Promise<R>, size: number): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++
        out[index] = await worker(items[index])
      }
    })
  )
  return out
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = (await request.json()) as { urls?: unknown }

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 })
    }

    const origin = request.nextUrl.origin
    const batch = urls.filter((u): u is string => typeof u === 'string').slice(0, MAX_URLS)
    const results = await pool(batch, (url) => verifyStream(url, origin), CONCURRENCY)

    return NextResponse.json({ origin, results })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
