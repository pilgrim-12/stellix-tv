// Parse iptv-org PLAYLISTS.md to get every published playlist URL, and compute
// language counts from feeds.json (channels.json no longer carries languages).
import { writeFile, readFile } from 'node:fs/promises'

const md = await (await fetch('https://raw.githubusercontent.com/iptv-org/iptv/master/PLAYLISTS.md')).text()
await writeFile('.scratch/data/PLAYLISTS.md', md)

const urls = [...md.matchAll(/https:\/\/iptv-org\.github\.io\/iptv\/[^\s)`|"']+\.m3u/g)].map((m) => m[0])
const uniq = [...new Set(urls)]
const kindOf = (u) => {
  const p = u.replace('https://iptv-org.github.io/iptv/', '')
  if (p === 'index.m3u') return 'all'
  if (p.startsWith('index.')) return 'index-variant'
  return p.split('/')[0]
}
const groups = {}
for (const u of uniq) {
  const k = kindOf(u)
  groups[k] = groups[k] || []
  groups[k].push(u)
}
console.log('total playlist urls:', uniq.length)
for (const [k, v] of Object.entries(groups)) console.log(' ', k, v.length, v.slice(0, 3).join(' '))

// language counts: feeds -> channel -> streams
const feeds = JSON.parse(await readFile('.scratch/data/feeds.json', 'utf8'))
const streams = JSON.parse(await readFile('.scratch/data/streams.json', 'utf8'))
const langsByChannel = new Map()
for (const f of feeds) {
  if (!f.channel) continue
  const set = langsByChannel.get(f.channel) || new Set()
  for (const l of f.languages || []) set.add(l)
  langsByChannel.set(f.channel, set)
}
const byLang = new Map()
for (const s of streams) {
  if (!s.channel) continue
  for (const l of langsByChannel.get(s.channel) || []) byLang.set(l, (byLang.get(l) || 0) + 1)
}
const languages = JSON.parse(await readFile('.scratch/data/languages.json', 'utf8'))
const langOut = languages
  .map((l) => ({ code: l.code, name: l.name, streams: byLang.get(l.code) || 0 }))
  .filter((l) => l.streams > 0)
  .sort((a, b) => b.streams - a.streams)
console.log('languages with streams:', langOut.length)
console.log(langOut.slice(0, 40).map((l) => `${l.code}(${l.name}):${l.streams}`).join(' '))

await writeFile('.scratch/data/playlist-urls.json', JSON.stringify({ groups, languages: langOut }, null, 2))
