// Verify every iptv-org country/language/category/region playlist: HTTP status,
// valid M3U, channel count, CORS header of the playlist file itself.
import { writeFile, readFile } from 'node:fs/promises'

const ORIGIN = 'https://stellix.tv'
const { groups } = JSON.parse(await readFile('.scratch/data/playlist-urls.json', 'utf8'))

const targets = [
  ...groups.categories.map((u) => ({ url: u, kind: 'category' })),
  ...groups.languages.map((u) => ({ url: u, kind: 'language' })),
  ...groups.countries.map((u) => ({ url: u, kind: 'country' })),
  ...groups.regions.map((u) => ({ url: u, kind: 'region' })),
]
console.log('verifying', targets.length, 'playlists')

async function probe(t) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 25000)
      const res = await fetch(t.url, { signal: ctrl.signal, headers: { Origin: ORIGIN, 'User-Agent': 'Mozilla/5.0' } })
      const text = res.ok ? await res.text() : ''
      clearTimeout(timer)
      if (!res.ok && attempt === 0) continue
      return {
        ...t,
        status: res.status,
        acao: res.headers.get('access-control-allow-origin'),
        channels: (text.match(/#EXTINF/g) || []).length,
      }
    } catch (e) {
      if (attempt === 1) return { ...t, status: 0, channels: 0, error: String(e.message || e) }
    }
  }
  return { ...t, status: 0, channels: 0 }
}

async function pool(items, fn, n = 10) {
  const out = []
  let i = 0
  let done = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
        if (++done % 50 === 0) console.log(`  ${done}/${items.length}`)
      }
    })
  )
  return out
}

const results = await pool(targets, probe, 10)
await writeFile('.scratch/data/verified-playlists.json', JSON.stringify(results, null, 2))

const ok = results.filter((r) => r.status === 200 && r.channels > 0)
const bad = results.filter((r) => !(r.status === 200 && r.channels > 0))
console.log('OK:', ok.length, 'BAD:', bad.length)
console.log('bad:', bad.map((b) => `${b.url.split('/').pop()}(${b.status})`).join(' '))
for (const kind of ['category', 'language', 'country', 'region']) {
  const k = ok.filter((r) => r.kind === kind)
  console.log(kind, k.length, 'total channels', k.reduce((s, r) => s + r.channels, 0))
}
