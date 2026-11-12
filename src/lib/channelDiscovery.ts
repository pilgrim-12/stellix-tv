/**
 * Channel auto-discovery.
 *
 * Walks the verified playlist catalog (src/data/playlistSources.ts), pulls the
 * channels our collection does not have yet, verifies every candidate stream
 * through /api/discover and keeps only the ones a browser can play on its own.
 *
 * Streams that would need /api/stream-proxy are never added — serving them
 * would push all of their video traffic through our server.
 */

import { CatalogSource } from '@/data/playlistSources'
import { parseM3U, convertToAppChannels, fetchM3UPlaylist } from './m3uParser'
import {
  getAllCuratedChannelsRaw,
  saveCuratedChannels,
  invalidateCuratedCache,
  CuratedChannel,
} from './curatedChannelService'

export interface StreamVerdict {
  url: string
  online: boolean
  direct: boolean
  resolved: boolean
  playUrl: string | null
  status: number
  acao: string | null
  error?: string
}

export interface DiscoveryOptions {
  /** sources to walk, in order */
  sources: CatalogSource[]
  /** stop after this many channels have been added */
  maxNewChannels: number
  /** cap how many unseen channels are verified per source (0 = no cap) */
  maxPerSource: number
  /** keep streams that only pass CORS after a redirect, storing the final URL */
  allowResolvedRedirects: boolean
  /** skip candidates whose channel name is already in the collection */
  skipExistingNames: boolean
  /** verify this many streams per request to /api/discover (max 40) */
  batchSize: number
  /** verify only, write nothing to Firestore */
  dryRun: boolean
}

export interface DiscoveryStats {
  sourcesDone: number
  sourcesTotal: number
  candidates: number
  checked: number
  online: number
  added: number
  needsProxy: number
  offline: number
  duplicates: number
  saved: number
}

export interface DiscoveredChannel extends CuratedChannel {
  sourceId: string
  sourceName: string
  /** original playlist URL when the stored URL came from following redirects */
  originalUrl?: string
}

export interface DiscoveryHandlers {
  onLog?: (message: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  onStats?: (stats: DiscoveryStats) => void
  onChannel?: (channel: DiscoveredChannel) => void
  shouldStop?: () => boolean
}

const VERIFY_ENDPOINT = '/api/discover'
const SAVE_EVERY = 50

/** Verify a batch of stream URLs (liveness + browser playability). */
export async function verifyStreams(urls: string[]): Promise<StreamVerdict[]> {
  const response = await fetch(VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  })

  if (!response.ok) {
    throw new Error(`Verification failed: ${response.status}`)
  }

  const data = (await response.json()) as { results: StreamVerdict[] }
  return data.results || []
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(hd|fhd|uhd|sd|4k|1080p?|720p?|576p?|480p?)\b/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '')
    .trim()
}

/** Channels of one catalog source, with the source metadata filled in. */
export async function loadSourceChannels(source: CatalogSource): Promise<
  Array<{ name: string; url: string; logo: string; group: string; language: string; country: string }>
> {
  const content = await fetchM3UPlaylist(source.url)
  const parsed = parseM3U(content)
  const hint = source.country ? source.country.toLowerCase() : source.name
  const channels = convertToAppChannels(parsed, '', hint)

  return channels.map((ch) => ({
    name: ch.name,
    url: ch.url,
    logo: ch.logo || '',
    // A category playlist is the strongest hint we have for a generic group.
    group: source.category && (!ch.group || ch.group === 'entertainment') ? source.category : ch.group,
    language: ch.language || source.language || '',
    country: ch.country || source.country || '',
  }))
}

export async function runDiscovery(
  options: DiscoveryOptions,
  handlers: DiscoveryHandlers = {}
): Promise<{ stats: DiscoveryStats; channels: DiscoveredChannel[] }> {
  const { onLog, onStats, onChannel, shouldStop } = handlers
  const log = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') =>
    onLog?.(message, level)

  const stats: DiscoveryStats = {
    sourcesDone: 0,
    sourcesTotal: options.sources.length,
    candidates: 0,
    checked: 0,
    online: 0,
    added: 0,
    needsProxy: 0,
    offline: 0,
    duplicates: 0,
    saved: 0,
  }
  const emit = () => onStats?.({ ...stats })

  log(`Loading current collection…`)
  const curated = await getAllCuratedChannelsRaw()
  const knownUrls = new Set(curated.map((ch) => ch.url?.trim().toLowerCase()).filter(Boolean))
  const knownNames = new Set(curated.map((ch) => normalizeName(ch.name || '')).filter(Boolean))
  log(`Collection has ${curated.length} channels`, 'info')
  emit()

  const added: DiscoveredChannel[] = []
  let unsaved = 0

  const persist = async () => {
    if (options.dryRun || unsaved === 0) return
    await saveCuratedChannels([...curated, ...added])
    invalidateCuratedCache()
    stats.saved = added.length
    unsaved = 0
    log(`Saved ${added.length} new channels to the collection`, 'success')
    emit()
  }

  for (const source of options.sources) {
    if (shouldStop?.()) {
      log('Stopped by user', 'warn')
      break
    }
    if (stats.added >= options.maxNewChannels) break

    log(`[${source.id}] fetching ${source.channels} channels…`)

    let sourceChannels: Awaited<ReturnType<typeof loadSourceChannels>>
    try {
      sourceChannels = await loadSourceChannels(source)
    } catch (error) {
      log(`[${source.id}] fetch failed: ${error instanceof Error ? error.message : 'unknown'}`, 'error')
      stats.sourcesDone++
      emit()
      continue
    }

    // Keep only what we do not have yet.
    const seenInSource = new Set<string>()
    const candidates = sourceChannels.filter((ch) => {
      const url = ch.url?.trim().toLowerCase()
      if (!url || seenInSource.has(url)) return false
      if (knownUrls.has(url)) {
        stats.duplicates++
        return false
      }
      if (options.skipExistingNames && knownNames.has(normalizeName(ch.name))) {
        stats.duplicates++
        return false
      }
      seenInSource.add(url)
      return true
    })

    const limited =
      options.maxPerSource > 0 ? candidates.slice(0, options.maxPerSource) : candidates
    stats.candidates += limited.length
    log(`[${source.id}] ${limited.length} new candidates (${stats.duplicates} dupes so far)`)
    emit()

    const batchSize = Math.min(Math.max(options.batchSize, 1), 40)

    for (let i = 0; i < limited.length; i += batchSize) {
      if (shouldStop?.()) break
      if (stats.added >= options.maxNewChannels) break

      const batch = limited.slice(i, i + batchSize)
      let verdicts: StreamVerdict[]
      try {
        verdicts = await verifyStreams(batch.map((ch) => ch.url))
      } catch (error) {
        log(`[${source.id}] verification failed: ${error instanceof Error ? error.message : 'unknown'}`, 'error')
        continue
      }

      verdicts.forEach((verdict, index) => {
        const candidate = batch[index]
        stats.checked++

        if (!verdict.online) {
          stats.offline++
          return
        }
        stats.online++

        const usable = verdict.direct || (verdict.resolved && options.allowResolvedRedirects)
        if (!usable || !verdict.playUrl) {
          // Playable, but only through our proxy — skip it on purpose.
          stats.needsProxy++
          return
        }
        if (stats.added >= options.maxNewChannels) return

        const playUrl = verdict.playUrl
        if (knownUrls.has(playUrl.trim().toLowerCase())) {
          stats.duplicates++
          return
        }

        const channel: DiscoveredChannel = {
          id: `curated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: candidate.name || 'Unknown',
          url: playUrl,
          logo: candidate.logo || null,
          group: candidate.group || 'entertainment',
          language: candidate.language || null,
          country: candidate.country || null,
          status: 'active',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          checkedBy: 'auto-discovery',
          playlistId: `discovery:${source.id}`,
          sourceId: source.id,
          sourceName: source.name,
          originalUrl: verdict.resolved ? verdict.url : undefined,
        }

        added.push(channel)
        knownUrls.add(playUrl.trim().toLowerCase())
        knownNames.add(normalizeName(channel.name))
        stats.added++
        unsaved++
        onChannel?.(channel)
      })

      emit()

      if (unsaved >= SAVE_EVERY) {
        try {
          await persist()
        } catch (error) {
          log(`Save failed: ${error instanceof Error ? error.message : 'unknown'}`, 'error')
        }
      }
    }

    stats.sourcesDone++
    log(
      `[${source.id}] done — added ${stats.added}, offline ${stats.offline}, proxy-only ${stats.needsProxy}`,
      'info'
    )
    emit()
  }

  try {
    await persist()
  } catch (error) {
    log(`Final save failed: ${error instanceof Error ? error.message : 'unknown'}`, 'error')
  }

  log(
    `Finished: ${stats.added} added, ${stats.checked} streams checked, ${stats.needsProxy} skipped as proxy-only`,
    'success'
  )
  return { stats, channels: added }
}
