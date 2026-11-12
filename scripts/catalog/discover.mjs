// Fetch iptv-org API indexes and compute per-country/language/category stream counts.
import { writeFile, mkdir } from 'node:fs/promises'

const API = 'https://iptv-org.github.io/api'
const files = ['countries', 'languages', 'categories', 'regions', 'streams', 'channels']

await mkdir('.scratch/data', { recursive: true })

const data = {}
for (const f of files) {
  const res = await fetch(`${API}/${f}.json`)
  console.log(f, res.status)
  if (!res.ok) continue
  data[f] = await res.json()
  await writeFile(`.scratch/data/${f}.json`, JSON.stringify(data[f]))
}

const channels = new Map((data.channels || []).map((c) => [c.id, c]))
const streams = data.streams || []
console.log('streams:', streams.length, 'channels:', channels.size)

// Count streams per country / language / category via channel metadata
const byCountry = new Map()
const byLang = new Map()
const byCat = new Map()
let noChannel = 0

const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1)

for (const s of streams) {
  const ch = s.channel ? channels.get(s.channel) : null
  if (!ch) { noChannel++; continue }
  if (ch.country) bump(byCountry, ch.country)
  for (const l of ch.languages || []) bump(byLang, l)
  for (const c of ch.categories || []) bump(byCat, c)
}

console.log('streams without channel metadata:', noChannel)

const out = {
  countries: (data.countries || []).map((c) => ({ code: c.code, name: c.name, flag: c.flag, languages: c.languages, streams: byCountry.get(c.code) || 0 })).sort((a, b) => b.streams - a.streams),
  languages: (data.languages || []).map((l) => ({ code: l.code, name: l.name, streams: byLang.get(l.code) || 0 })).sort((a, b) => b.streams - a.streams),
  categories: (data.categories || []).map((c) => ({ id: c.id, name: c.name, streams: byCat.get(c.id) || 0 })).sort((a, b) => b.streams - a.streams),
  regions: (data.regions || []).map((r) => ({ code: r.code, name: r.name, countries: (r.countries || []).length })),
}

await writeFile('.scratch/data/summary.json', JSON.stringify(out, null, 2))
console.log('countries>0:', out.countries.filter((c) => c.streams > 0).length)
console.log('languages>0:', out.languages.filter((l) => l.streams > 0).length)
console.log('categories:', out.categories.length)
console.log('top countries:', out.countries.slice(0, 15).map((c) => `${c.code}:${c.streams}`).join(' '))
console.log('top langs:', out.languages.slice(0, 15).map((c) => `${c.code}:${c.streams}`).join(' '))
console.log('cats:', out.categories.map((c) => `${c.id}:${c.streams}`).join(' '))
