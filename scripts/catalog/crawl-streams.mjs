// Crawl every iptv-org stream: is it alive, and does it send CORS headers
// (i.e. can hls.js play it directly in the browser, with no proxy on our server)?
import { readFile, writeFile, appendFile } from 'node:fs/promises'

const ORIGIN = 'https://stellix.tv'
const OUT = '.scratch/data/streams-checked.jsonl'
const CONCURRENCY = 50
const TIMEOUT = 9000

const streams = JSON.parse(await readFile('.scratch/data/streams.json', 'utf8'))
const channels = new Map(JSON.parse(await readFile('.scratch/data/channels.json', 'utf8')).map((c) => [c.id, c]))
const feeds = JSON.parse(await readFile('.scratch/data/feeds.json', 'utf8'))
const blocked = new Set(JSON.parse(await readFile('.scratch/data/blocklist.json', 'utf8')).map((b) => b.channel))

const langByChannel = new Map()
for (const f of feeds) {
  if (!f.channel) continue
  const set = langByChannel.get(f.channel) || new Set()
  for (const l of f.languages || []) set.add(l)
  langByChannel.set(f.channel, set)
}

const targets = streams.filter((s) => {
  if (!s.url || !/^https?:\/\//.test(s.url)) return false
  if (s.channel && blocked.has(s.channel)) return false
  const ch = s.channel ? channels.get(s.channel) : null
  if (ch?.is_nsfw) return false
  return true
})
console.log('streams to check:', targets.length)

await writeFile(OUT, '')
let done = 0
let alive = 0
let direct = 0

async function check(s) {
  const res = { url: s.url, title: s.title, channel: s.channel || null, quality: s.quality || null }
  const ch = s.channel ? channels.get(s.channel) : null
  res.country = ch?.country || null
  res.categories = ch?.categories || []
  res.languages = [...(langByChannel.get(s.channel) || [])]
  res.needsHeaders = Boolean(s.user_agent || s.referrer)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const r = await fetch(s.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        Origin: ORIGIN,
        'User-Agent': s.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
        ...(s.referrer ? { Referer: s.referrer } : {}),
      },
    })
    const text = r.ok ? (await r.text()).slice(0, 4096) : ''
    clearTimeout(timer)
    res.status = r.status
    res.acao = r.headers.get('access-control-allow-origin')
    res.hls = /#EXTM3U|#EXT-X-/.test(text)
    res.finalUrl = r.url !== s.url ? r.url : undefined
    res.ok = r.ok && res.hls
    res.direct = Boolean(res.ok && (res.acao === '*' || res.acao === ORIGIN) && !res.needsHeaders)
  } catch (e) {
    res.status = 0
    res.ok = false
    res.direct = false
    res.error = String(e.name === 'AbortError' ? 'timeout' : e.message || e).slice(0, 60)
  }
  return res
}

let i = 0
const buffer = []
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < targets.length) {
      const r = await check(targets[i++])
      if (r.ok) alive++
      if (r.direct) direct++
      buffer.push(JSON.stringify(r))
      if (++done % 200 === 0) {
        await appendFile(OUT, buffer.splice(0).join('\n') + '\n')
        console.log(`${done}/${targets.length} alive=${alive} direct=${direct}`)
      }
    }
  })
)
if (buffer.length) await appendFile(OUT, buffer.join('\n') + '\n')
console.log(`DONE ${done} alive=${alive} direct=${direct}`)
