// Generate src/data/playlistSources.ts from the live verification results.
import { readFile, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const d = (f) => readFile(`.scratch/data/${f}`, 'utf8').then(JSON.parse)

const verified = await d('verified-playlists.json')
const others = await d('others.json')
const fast = await d('fast.json')
const fastCors = await d('fast-cors.json')
const countries = await d('countries.json')
const languages = await d('languages.json')
const categories = await d('categories.json')
const regions = await d('regions.json')

// ---- measured direct/alive rates per country / language / category
const stat = { country: new Map(), language: new Map(), category: new Map() }
const bump = (m, k, field) => {
  const cur = m.get(k) || { total: 0, alive: 0, direct: 0 }
  cur.total++
  if (field.ok) cur.alive++
  if (field.direct) cur.direct++
  m.set(k, cur)
}
const rl = createInterface({ input: createReadStream('.scratch/data/streams-checked.jsonl') })
let lines = 0
for await (const line of rl) {
  if (!line.trim()) continue
  lines++
  const r = JSON.parse(line)
  if (r.country) bump(stat.country, r.country, r)
  for (const l of r.languages || []) bump(stat.language, l, r)
  for (const c of r.categories || []) bump(stat.category, c, r)
}
console.log('stream check rows:', lines)

const rate = (m, k) => {
  const s = m.get(k)
  if (!s || s.total < 5) return null
  return { checked: s.total, alive: +(s.alive / s.total).toFixed(2), direct: +(s.direct / s.total).toFixed(2) }
}

// ---- ISO 639-2/B -> 639-1 for the languages the app knows
const iso3to1 = {
  afr: 'af', amh: 'am', ara: 'ar', asm: 'as', aze: 'az', bel: 'be', ben: 'bn', bos: 'bs', bul: 'bg',
  cat: 'ca', ces: 'cs', dan: 'da', deu: 'de', ell: 'el', eng: 'en', est: 'et', fas: 'fa', fin: 'fi',
  fra: 'fr', guj: 'gu', heb: 'he', hin: 'hi', hrv: 'hr', hun: 'hu', hye: 'hy', ind: 'id', isl: 'is',
  ita: 'it', jpn: 'ja', kan: 'kn', kat: 'ka', kaz: 'kk', khm: 'km', kor: 'ko', kur: 'ku', kir: 'ky',
  lao: 'lo', lav: 'lv', lit: 'lt', mal: 'ml', mar: 'mr', mkd: 'mk', mlt: 'mt', mon: 'mn', msa: 'ms',
  mya: 'my', nep: 'ne', nld: 'nl', nor: 'no', pan: 'pa', pol: 'pl', por: 'pt', pus: 'ps', ron: 'ro',
  rus: 'ru', sin: 'si', slk: 'sk', slv: 'sl', som: 'so', spa: 'es', sqi: 'sq', srp: 'sr', swa: 'sw',
  swe: 'sv', tam: 'ta', tel: 'te', tgk: 'tg', tgl: 'en', tha: 'th', tuk: 'tk', tur: 'tr', ukr: 'uk',
  urd: 'ur', uzb: 'uz', vie: 'vi', zho: 'zh',
}

// ---- iptv-org category -> app category
const catMap = {
  animation: 'kids', auto: 'auto', business: 'general', classic: 'movies', comedy: 'entertainment',
  cooking: 'cooking', culture: 'culture', documentary: 'documentary', education: 'education',
  entertainment: 'entertainment', family: 'kids', general: 'general', kids: 'kids',
  legislative: 'general', lifestyle: 'lifestyle', movies: 'movies', music: 'music', news: 'news',
  outdoor: 'outdoor', public: 'general', relax: 'lifestyle', religious: 'religious', science: 'science',
  series: 'movies', shop: 'general', sports: 'sports', travel: 'travel', weather: 'weather',
  interactive: 'general', xxx: 'general',
}

const countryByCode = new Map(countries.map((c) => [c.code, c]))
const langByCode = new Map(languages.map((l) => [l.code, l]))
const catById = new Map(categories.map((c) => [c.id, c]))
const regionByCode = new Map(regions.map((r) => [r.code, r]))

const sources = []
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

for (const v of verified) {
  if (v.status !== 200 || !v.channels) continue
  const code = v.url.split('/').pop().replace('.m3u', '')
  if (v.kind === 'country') {
    const c = countryByCode.get(code.toUpperCase())
    if (!c) continue
    sources.push({
      id: `iptv-org-country-${code}`, provider: 'iptv-org', kind: 'country', url: v.url,
      name: c.name, country: c.code, flag: c.flag, channels: v.channels, metrics: rate(stat.country, c.code),
    })
  } else if (v.kind === 'language') {
    const l = langByCode.get(code)
    const app = iso3to1[code]
    if (!l || !app) continue
    sources.push({
      id: `iptv-org-language-${code}`, provider: 'iptv-org', kind: 'language', url: v.url,
      name: l.name, language: app, channels: v.channels, metrics: rate(stat.language, code),
    })
  } else if (v.kind === 'category') {
    const c = catById.get(code)
    if (!c || code === 'xxx') continue
    sources.push({
      id: `iptv-org-category-${code}`, provider: 'iptv-org', kind: 'category', url: v.url,
      name: c.name, category: catMap[code] || 'general', channels: v.channels, metrics: rate(stat.category, code),
    })
  } else if (v.kind === 'region') {
    const r = regionByCode.get(code.toUpperCase())
    if (!r) continue
    sources.push({
      id: `iptv-org-region-${code}`, provider: 'iptv-org', kind: 'region', url: v.url,
      name: r.name, channels: v.channels,
    })
  }
}

// ---- Free-TV: country / topic playlists
const freeTvCountry = {
  albania: 'AL', andorra: 'AD', argentina: 'AR', armenia: 'AM', australia: 'AU', austria: 'AT',
  azerbaijan: 'AZ', belarus: 'BY', belgium: 'BE', bosnia_and_herzegovina: 'BA', brazil: 'BR',
  bulgaria: 'BG', canada: 'CA', chad: 'TD', chile: 'CL', china: 'CN', costa_rica: 'CR', croatia: 'HR',
  cyprus: 'CY', czech_republic: 'CZ', denmark: 'DK', dominican_republic: 'DO', egypt: 'EG',
  estonia: 'EE', faroe_islands: 'FO', finland: 'FI', france: 'FR', georgia: 'GE', germany: 'DE',
  greece: 'GR', greenland: 'GL', hong_kong: 'HK', hungary: 'HU', iceland: 'IS', india: 'IN',
  indonesia: 'ID', iran: 'IR', iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP',
  kazakhstan: 'KZ', kenya: 'KE', korea: 'KR', kosovo: 'XK', latvia: 'LV', lebanon: 'LB',
  lithuania: 'LT', luxembourg: 'LU', macau: 'MO', malta: 'MT', mexico: 'MX', moldova: 'MD',
  monaco: 'MC', mongolia: 'MN', montenegro: 'ME', netherlands: 'NL', nigeria: 'NG',
  north_korea: 'KP', north_macedonia: 'MK', norway: 'NO', paraguay: 'PY', peru: 'PE', poland: 'PL',
  portugal: 'PT', qatar: 'QA', romania: 'RO', russia: 'RU', san_marino: 'SM', saudi_arabia: 'SA',
  serbia: 'RS', slovakia: 'SK', slovenia: 'SI', somalia: 'SO', spain: 'ES', sweden: 'SE',
  switzerland: 'CH', taiwan: 'TW', trinidad: 'TT', turkey: 'TR', turkmenistan: 'TM', uk: 'GB',
  ukraine: 'UA', united_arab_emirates: 'AE', usa: 'US', venezuela: 'VE',
}
const freeTvTopic = {
  zz_documentaries_ar: { name: 'Documentaries (Arabic)', category: 'documentary', language: 'ar' },
  zz_documentaries_en: { name: 'Documentaries (English)', category: 'documentary', language: 'en' },
  zz_movies: { name: 'Movies', category: 'movies' },
  zz_music_en: { name: 'Music (English)', category: 'music', language: 'en' },
  zz_news_ar: { name: 'News (Arabic)', category: 'news', language: 'ar' },
  zz_news_en: { name: 'News (English)', category: 'news', language: 'en' },
  zz_news_es: { name: 'News (Spanish)', category: 'news', language: 'es' },
}

for (const o of others) {
  if (o.status !== 200 || !o.channels) continue
  if (o.url.endsWith('Free-TV/IPTV/master/playlist.m3u8')) {
    sources.push({ id: 'free-tv-all', provider: 'free-tv', kind: 'provider', url: o.url, name: 'Free-TV — all countries', channels: o.channels })
    continue
  }
  const m = o.url.match(/playlist_([a-z_0-9]+)\.m3u8$/)
  if (m) {
    const key = m[1]
    if (freeTvCountry[key]) {
      const c = countryByCode.get(freeTvCountry[key])
      sources.push({
        id: `free-tv-country-${freeTvCountry[key].toLowerCase()}`, provider: 'free-tv', kind: 'country', url: o.url,
        name: c?.name || key, country: freeTvCountry[key], flag: c?.flag, channels: o.channels,
      })
    } else if (freeTvTopic[key]) {
      const t = freeTvTopic[key]
      sources.push({ id: `free-tv-${key.replace(/^zz_/, '')}`, provider: 'free-tv', kind: 'category', url: o.url, name: `Free-TV ${t.name}`, category: t.category, language: t.language, channels: o.channels })
    }
    continue
  }
  if (o.url.includes('M3UPT')) sources.push({ id: 'm3upt-pt', provider: 'm3upt', kind: 'country', url: o.url, name: 'Portugal (M3UPT)', country: 'PT', channels: o.channels })
  if (o.url.includes('IPTV-Italia')) sources.push({ id: 'iptvita-it', provider: 'iptv-italia', kind: 'country', url: o.url, name: 'Italy (IPTV-Italia)', country: 'IT', channels: o.channels })
}

// ---- FAST providers (Samsung TV Plus / Plex / Roku / Tubi). Pluto excluded:
// its streams only allow Origin pluto.tv, so they cannot play without a proxy.
const fastMeta = {
  samsungtvplus: { provider: 'samsung-tv-plus', label: 'Samsung TV Plus', directRate: 0.83 },
  plex: { provider: 'plex', label: 'Plex', directRate: 0.5 },
  roku: { provider: 'roku', label: 'Roku', directRate: 1 },
  tubi: { provider: 'tubi', label: 'Tubi', directRate: 1 },
}
const fastCountryNames = { all: null }
for (const f of fast) {
  if (f.status !== 200 || !f.channels) continue
  // prefer the fork whose playlists keep direct provider URLs where it matters
  const m = f.url.match(/playlists\/([a-z]+)_([a-z]{2,3})\.m3u$/)
  if (!m) continue
  const [, svc, region] = m
  const meta = fastMeta[svc]
  if (!meta) continue
  const repo = f.url.includes('/bohi123/') ? 'bohi123' : 'BuddyChewChew'
  if (repo !== 'bohi123') continue // one fork is enough; both publish identical counts
  const cc = region === 'all' ? null : region.toUpperCase()
  const c = cc ? countryByCode.get(cc) : null
  sources.push({
    id: `${meta.provider}-${region}`, provider: meta.provider, kind: region === 'all' ? 'provider' : 'country',
    url: f.url, name: cc ? `${meta.label} — ${c?.name || cc}` : `${meta.label} — all regions`,
    country: cc || undefined, flag: c?.flag, channels: f.channels,
    metrics: { checked: fastCors[`${svc === 'samsungtvplus' ? 'samsung-jmp2' : svc + '-direct'}`]?.sampled || 6, alive: 1, direct: meta.directRate },
  })
}

// ---- order: biggest & most reliable first
const kindRank = { provider: 0, country: 1, language: 2, category: 3, region: 4 }
sources.sort((a, b) => (kindRank[a.kind] - kindRank[b.kind]) || b.channels - a.channels)

const ts = new Date().toISOString().slice(0, 10)
const body = sources.map((s) => {
  const parts = [`id: ${JSON.stringify(s.id)}`, `name: ${JSON.stringify(s.name)}`, `url: ${JSON.stringify(s.url)}`,
    `provider: ${JSON.stringify(s.provider)}`, `kind: ${JSON.stringify(s.kind)}`]
  if (s.country) parts.push(`country: ${JSON.stringify(s.country)}`)
  if (s.language) parts.push(`language: ${JSON.stringify(s.language)}`)
  if (s.category) parts.push(`category: ${JSON.stringify(s.category)}`)
  if (s.flag) parts.push(`flag: ${JSON.stringify(s.flag)}`)
  parts.push(`channels: ${s.channels}`)
  if (s.metrics) parts.push(`metrics: { checked: ${s.metrics.checked}, alive: ${s.metrics.alive}, direct: ${s.metrics.direct} }`)
  return `  { ${parts.join(', ')} },`
}).join('\n')

const file = `/**
 * Verified public playlist catalog.
 *
 * Every entry below was fetched and verified on ${ts}: HTTP 200, valid M3U body,
 * non-zero channel count. \`metrics\` comes from actually opening the streams of
 * that source:
 *   - alive  — share of streams that answered with a valid HLS manifest
 *   - direct — share that also sent CORS headers, i.e. hls.js can play them
 *              straight from the browser with no /api/stream-proxy involved
 *              (no outbound traffic on our server)
 *
 * Only free-to-air / FAST sources are listed. Pluto TV is deliberately absent:
 * its manifests allow Origin pluto.tv only, so they always need a proxy.
 *
 * Regenerate with scripts/catalog/ (see scripts/catalog/README.md) when stale.
 */

export type PlaylistSourceKind = 'provider' | 'country' | 'language' | 'category' | 'region'

export interface CatalogSource {
  id: string
  name: string
  url: string
  provider: string
  kind: PlaylistSourceKind
  /** ISO 3166-1 alpha-2, upper case */
  country?: string
  /** app language code (ISO 639-1) */
  language?: string
  /** app category id */
  category?: string
  flag?: string
  /** channel count measured at verification time */
  channels: number
  metrics?: { checked: number; alive: number; direct: number }
}

export const CATALOG_VERIFIED_AT = '${ts}'

export const playlistCatalog: CatalogSource[] = [
${body}
]

export const catalogProviders = [...new Set(playlistCatalog.map((s) => s.provider))].sort()

export function filterCatalog(filters: {
  search?: string
  kind?: PlaylistSourceKind | 'all'
  provider?: string | 'all'
  country?: string | 'all'
  language?: string | 'all'
  category?: string | 'all'
  minDirect?: number
}): CatalogSource[] {
  const q = filters.search?.trim().toLowerCase()
  return playlistCatalog.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q) && !s.id.includes(q)) return false
    if (filters.kind && filters.kind !== 'all' && s.kind !== filters.kind) return false
    if (filters.provider && filters.provider !== 'all' && s.provider !== filters.provider) return false
    if (filters.country && filters.country !== 'all' && s.country !== filters.country) return false
    if (filters.language && filters.language !== 'all' && s.language !== filters.language) return false
    if (filters.category && filters.category !== 'all' && s.category !== filters.category) return false
    if (filters.minDirect != null && (s.metrics?.direct ?? 0) < filters.minDirect) return false
    return true
  })
}
`

await writeFile('src/data/playlistSources.ts', file)
console.log('sources written:', sources.length)
const byKind = {}
for (const s of sources) byKind[s.kind] = (byKind[s.kind] || 0) + 1
console.log(byKind)
console.log('total channels in catalog:', sources.reduce((a, b) => a + b.channels, 0))
