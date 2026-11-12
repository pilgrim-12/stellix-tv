// Probe non-iptv-org sources: Free-TV repo playlists + known FAST aggregator URLs.
import { writeFile } from 'node:fs/promises'

const ORIGIN = 'https://stellix.tv'

async function probe(url) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    const res = await fetch(url, { signal: ctrl.signal, headers: { Origin: ORIGIN, 'User-Agent': 'Mozilla/5.0' } })
    const text = res.ok ? await res.text() : ''
    clearTimeout(t)
    const extinf = (text.match(/#EXTINF/g) || []).length
    return {
      url,
      status: res.status,
      acao: res.headers.get('access-control-allow-origin'),
      isM3U: text.trimStart().startsWith('#EXTM3U'),
      channels: extinf,
      bytes: text.length,
    }
  } catch (e) {
    return { url, status: 0, error: String(e.message || e) }
  }
}

async function pool(items, fn, n = 8) {
  const out = []
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    })
  )
  return out
}

// --- Free-TV repo: list playlists directory
const candidates = ['https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8']
try {
  const gh = await fetch('https://api.github.com/repos/Free-TV/IPTV/contents/playlists', {
    headers: { 'User-Agent': 'stellix-probe', Accept: 'application/vnd.github+json' },
  })
  console.log('github api', gh.status)
  if (gh.ok) {
    const list = await gh.json()
    for (const f of list) if (f.name.endsWith('.m3u8')) candidates.push(f.download_url)
    console.log('Free-TV playlists found:', list.length)
  }
} catch (e) {
  console.log('github api failed', e.message)
}

// --- FAST / aggregator candidates
const fast = [
  'https://i.mjh.nz/SamsungTVPlus/all.m3u8',
  'https://i.mjh.nz/PlutoTV/all.m3u8',
  'https://i.mjh.nz/Plex/all.m3u8',
  'https://i.mjh.nz/Roku/all.m3u8',
  'https://i.mjh.nz/Stirr/all.m3u8',
  'https://i.mjh.nz/SamsungTVPlus/us.m3u8',
  'https://i.mjh.nz/PlutoTV/us.m3u8',
  'https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/SamsungTVPlus/all.m3u8',
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/pluto_tv.m3u',
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/samsung_tv_plus.m3u',
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex.m3u',
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/roku.m3u',
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/tubi.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
  'https://raw.githubusercontent.com/Fluxus-IPTV/Fluxus-IPTV/main/playlist.m3u',
  'https://raw.githubusercontent.com/ipstreet312/freeiptv/master/ressources/all.m3u',
  'https://raw.githubusercontent.com/LITUATUI/M3UPT/main/M3U/M3UPT.m3u',
  'https://raw.githubusercontent.com/Tundrak/IPTV-Italia/main/iptvita.m3u',
  'https://raw.githubusercontent.com/Tundrak/IPTV-URL/main/tundrak.m3u',
  'https://raw.githubusercontent.com/MohammadKobirShah/KobirShahIPTV/refs/heads/main/KobirShah.m3u',
  'https://raw.githubusercontent.com/dtankdempse/free-iptv-channels/main/playlist.m3u',
  'https://raw.githubusercontent.com/skjeleraa/IPTV-Norge/main/IPTV-Norge.m3u',
]

const all = [...candidates, ...fast]
const results = await pool(all, probe, 8)
await writeFile('.scratch/data/others.json', JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(
    String(r.status).padEnd(4),
    String(r.channels ?? '-').padEnd(6),
    (r.acao || '-').padEnd(4),
    r.url.replace('https://raw.githubusercontent.com/', 'gh:')
  )
}
