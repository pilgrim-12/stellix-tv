// Discover real filenames in FAST playlist repos, then probe each playlist.
import { writeFile } from 'node:fs/promises'

const ORIGIN = 'https://stellix.tv'
const repos = [
  ['BuddyChewChew/app-m3u-generator', 'playlists'],
  ['BuddyChewChew/app-m3u-generator', ''],
  ['bohi123/app-m3u-generator', 'playlists'],
  ['matthuisman/i.mjh.nz', ''],
]

const urls = new Set()
for (const [repo, dir] of repos) {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${dir}`, {
      headers: { 'User-Agent': 'stellix-probe', Accept: 'application/vnd.github+json' },
    })
    console.log(repo, dir || '/', r.status)
    if (!r.ok) continue
    const list = await r.json()
    for (const f of list) {
      if (f.type === 'file' && /\.m3u8?$/.test(f.name)) urls.add(f.download_url)
      if (f.type === 'dir') console.log('   dir:', f.name)
    }
  } catch (e) {
    console.log(repo, 'err', e.message)
  }
}
console.log('candidate FAST playlists:', urls.size)

async function probe(url) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 25000)
    const res = await fetch(url, { signal: ctrl.signal, headers: { Origin: ORIGIN, 'User-Agent': 'Mozilla/5.0' } })
    const text = res.ok ? await res.text() : ''
    clearTimeout(t)
    const firstUrl = (text.match(/^https?:\/\/.+$/m) || [])[0] || ''
    return { url, status: res.status, channels: (text.match(/#EXTINF/g) || []).length, sample: firstUrl.slice(0, 120) }
  } catch (e) {
    return { url, status: 0, channels: 0, error: String(e.message || e) }
  }
}

const out = []
for (const u of urls) out.push(await probe(u))
await writeFile('.scratch/data/fast.json', JSON.stringify(out, null, 2))
for (const r of out.sort((a, b) => b.channels - a.channels)) {
  console.log(String(r.status).padEnd(4), String(r.channels).padEnd(6), r.url.replace('https://raw.githubusercontent.com/', 'gh:'), '|', r.sample || '')
}
