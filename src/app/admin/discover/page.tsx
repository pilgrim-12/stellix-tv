'use client'

import { useMemo, useRef, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Radar,
  Play,
  Square,
  Loader2,
  Search,
  Download,
  ShieldCheck,
  Globe,
  Languages,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CATALOG_VERIFIED_AT,
  CatalogSource,
  PlaylistSourceKind,
  catalogProviders,
  playlistCatalog,
} from '@/data/playlistSources'
import {
  DiscoveredChannel,
  DiscoveryStats,
  loadSourceChannels,
  runDiscovery,
} from '@/lib/channelDiscovery'
import { createStagingPlaylist } from '@/lib/stagingPlaylistService'
import { categoryNamesEn, languageNames } from '@/types'

type LogLevel = 'info' | 'warn' | 'error' | 'success'
interface LogLine {
  id: number
  message: string
  level: LogLevel
}

const emptyStats: DiscoveryStats = {
  sourcesDone: 0,
  sourcesTotal: 0,
  candidates: 0,
  checked: 0,
  online: 0,
  added: 0,
  needsProxy: 0,
  offline: 0,
  duplicates: 0,
  saved: 0,
}

const kinds: Array<{ value: PlaylistSourceKind | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'provider', label: 'Providers' },
  { value: 'country', label: 'Countries' },
  { value: 'language', label: 'Languages' },
  { value: 'category', label: 'Categories' },
  { value: 'region', label: 'Regions' },
]

const logColors: Record<LogLevel, string> = {
  info: 'text-muted-foreground',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500',
}

export default function DiscoverPage() {
  // Filters for the catalog / discovery scope
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<PlaylistSourceKind | 'all'>('all')
  const [provider, setProvider] = useState<string>('all')
  const [country, setCountry] = useState<string>('all')
  const [language, setLanguage] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')

  // Discovery options
  const [maxNew, setMaxNew] = useState(300)
  const [maxPerSource, setMaxPerSource] = useState(150)
  const [batchSize, setBatchSize] = useState(25)
  const [allowResolved, setAllowResolved] = useState(true)
  const [skipExistingNames, setSkipExistingNames] = useState(true)
  const [dryRun, setDryRun] = useState(false)

  // Run state
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<DiscoveryStats>(emptyStats)
  const [log, setLog] = useState<LogLine[]>([])
  const [found, setFound] = useState<DiscoveredChannel[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const stopRef = useRef(false)
  const logId = useRef(0)

  const countries = useMemo(() => {
    const map = new Map<string, string>()
    playlistCatalog.forEach((s) => {
      if (s.country) map.set(s.country, `${s.flag ? s.flag + ' ' : ''}${s.country}`)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [])

  const languages = useMemo(() => {
    const set = new Set<string>()
    playlistCatalog.forEach((s) => s.language && set.add(s.language))
    return [...set].sort((a, b) => (languageNames[a] || a).localeCompare(languageNames[b] || b))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    playlistCatalog.forEach((s) => s.category && set.add(s.category))
    return [...set].sort()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return playlistCatalog
      .filter((s) => {
        if (q && !s.name.toLowerCase().includes(q) && !s.id.includes(q)) return false
        if (kind !== 'all' && s.kind !== kind) return false
        if (provider !== 'all' && s.provider !== provider) return false
        if (country !== 'all' && s.country !== country) return false
        if (language !== 'all' && s.language !== language) return false
        if (category !== 'all' && s.category !== category) return false
        return true
      })
      // best yield first: measured share of browser-playable streams, then size
      .sort((a, b) => (b.metrics?.direct ?? 0.5) - (a.metrics?.direct ?? 0.5) || b.channels - a.channels)
  }, [search, kind, provider, country, language, category])

  const scope = useMemo(
    () => (selected.size > 0 ? filtered.filter((s) => selected.has(s.id)) : filtered),
    [filtered, selected]
  )

  const addLog = (message: string, level: LogLevel = 'info') => {
    setLog((prev) => [{ id: logId.current++, message, level }, ...prev].slice(0, 300))
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStart = async () => {
    if (running) return
    setRunning(true)
    stopRef.current = false
    setStats({ ...emptyStats, sourcesTotal: scope.length })
    setFound([])
    setLog([])
    addLog(`Starting discovery over ${scope.length} sources`, 'info')

    try {
      await runDiscovery(
        {
          sources: scope,
          maxNewChannels: Math.max(1, maxNew),
          maxPerSource: Math.max(0, maxPerSource),
          allowResolvedRedirects: allowResolved,
          skipExistingNames,
          batchSize,
          dryRun,
        },
        {
          onLog: (message, level) => addLog(message, level || 'info'),
          onStats: setStats,
          onChannel: (channel) => setFound((prev) => [channel, ...prev].slice(0, 500)),
          shouldStop: () => stopRef.current,
        }
      )
    } catch (error) {
      addLog(`Discovery failed: ${error instanceof Error ? error.message : 'unknown error'}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  const handleImportToStaging = async (source: CatalogSource) => {
    setImportingId(source.id)
    setImportMessage(null)
    try {
      const channels = await loadSourceChannels(source)
      const result = await createStagingPlaylist(source.name, source.url, 'url', channels)
      setImportMessage(`"${source.name}" → staging: ${result.channelCount} channels`)
    } catch (error) {
      setImportMessage(`Import failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      setImportingId(null)
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {running ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-red-500"
          onClick={() => {
            stopRef.current = true
            addLog('Stopping after the current batch…', 'warn')
          }}
        >
          <Square className="h-4 w-4 mr-1" />
          Stop
        </Button>
      ) : (
        <Button size="sm" className="h-8" onClick={handleStart} disabled={scope.length === 0}>
          <Play className="h-4 w-4 mr-1" />
          Start discovery ({scope.length})
        </Button>
      )}
    </div>
  )

  const statCards: Array<{ label: string; value: number; tone?: string }> = [
    { label: 'Sources', value: stats.sourcesDone },
    { label: 'Candidates', value: stats.candidates },
    { label: 'Checked', value: stats.checked },
    { label: 'Live', value: stats.online, tone: 'text-green-500' },
    { label: 'Added', value: stats.added, tone: 'text-primary' },
    { label: 'Proxy-only (skipped)', value: stats.needsProxy, tone: 'text-yellow-500' },
    { label: 'Dead', value: stats.offline, tone: 'text-red-500' },
    { label: 'Duplicates', value: stats.duplicates },
  ]

  return (
    <AdminLayout title="Discover" icon={<Radar className="h-5 w-5 text-primary" />} headerActions={headerActions}>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>
            Only streams the browser can play on its own are added — anything that would need
            /api/stream-proxy is skipped, so discovered channels cost no server traffic.
          </span>
          <span className="ml-auto">
            Catalog: {playlistCatalog.length} verified sources · checked {CATALOG_VERIFIED_AT}
          </span>
        </div>

        {/* Filters define both the catalog view and the discovery scope */}
        <Card>
          <CardContent className="py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-sm"
                  placeholder="Search sources…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                {kinds.map((k) => (
                  <Button
                    key={k.value}
                    size="sm"
                    variant={kind === k.value ? 'secondary' : 'ghost'}
                    className={cn('h-8 px-2 text-xs', kind === k.value && 'bg-primary/10 text-primary')}
                    onClick={() => setKind(k.value)}
                  >
                    {k.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="all">All providers</option>
                {catalogProviders.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="all">All countries</option>
                {countries.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="all">All languages</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {languageNames[code] || code}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryNamesEn[c] || c}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 ml-auto text-xs">
                <label className="flex items-center gap-1">
                  Max new
                  <Input
                    type="number"
                    className="h-8 w-20 text-xs"
                    value={maxNew}
                    min={1}
                    onChange={(e) => setMaxNew(Number(e.target.value) || 1)}
                  />
                </label>
                <label className="flex items-center gap-1">
                  Per source
                  <Input
                    type="number"
                    className="h-8 w-20 text-xs"
                    value={maxPerSource}
                    min={0}
                    onChange={(e) => setMaxPerSource(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="flex items-center gap-1">
                  Batch
                  <Input
                    type="number"
                    className="h-8 w-16 text-xs"
                    value={batchSize}
                    min={1}
                    max={40}
                    onChange={(e) => setBatchSize(Math.min(40, Number(e.target.value) || 1))}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Switch checked={allowResolved} onCheckedChange={setAllowResolved} />
                Resolve redirects (store the final CORS-capable URL)
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={skipExistingNames} onCheckedChange={setSkipExistingNames} />
                Skip names already in the collection
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
                Dry run (verify only, save nothing)
              </label>
              {selected.size > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                  Clear selection ({selected.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="py-3 text-center">
                <p className={cn('text-xl font-semibold', card.tone)}>{card.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="run">
          <TabsList>
            <TabsTrigger value="run">Run</TabsTrigger>
            <TabsTrigger value="catalog">Catalog ({filtered.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="run">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                    Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[420px] overflow-auto font-mono text-[11px] space-y-1">
                    {log.length === 0 && (
                      <p className="text-muted-foreground font-sans text-sm">
                        Pick a scope above and press “Start discovery”. Nothing is added before it
                        has been verified live.
                      </p>
                    )}
                    {log.map((line) => (
                      <p key={line.id} className={logColors[line.level]}>
                        {line.message}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Added channels ({found.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[420px] overflow-auto divide-y">
                    {found.length === 0 && (
                      <p className="text-muted-foreground text-sm">No channels added yet.</p>
                    )}
                    {found.map((channel) => (
                      <div key={channel.id} className="py-1.5 flex items-center gap-2 text-xs">
                        <span className="flex-1 truncate font-medium">{channel.name}</span>
                        <span className="text-muted-foreground">{channel.country || '—'}</span>
                        <span className="text-muted-foreground">{channel.language || '—'}</span>
                        <span className="text-muted-foreground">{channel.group}</span>
                        {channel.originalUrl && (
                          <span className="text-[10px] text-blue-500" title={`resolved from ${channel.originalUrl}`}>
                            resolved
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="catalog">
            {importMessage && (
              <p className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {importMessage}
              </p>
            )}
            <Card>
              <CardContent className="py-2">
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-muted-foreground">
                        <th className="w-8 py-2"></th>
                        <th className="py-2">Source</th>
                        <th className="py-2">Provider</th>
                        <th className="py-2">Kind</th>
                        <th className="py-2">Meta</th>
                        <th className="py-2 text-right">Channels</th>
                        <th className="py-2 text-right">Live</th>
                        <th className="py-2 text-right">Direct</th>
                        <th className="py-2 text-right">Import</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((source) => (
                        <tr key={source.id} className="border-t hover:bg-muted/40">
                          <td className="py-1.5">
                            <input
                              type="checkbox"
                              checked={selected.has(source.id)}
                              onChange={() => toggleSelected(source.id)}
                            />
                          </td>
                          <td className="py-1.5">
                            <span className="font-medium">
                              {source.flag ? `${source.flag} ` : ''}
                              {source.name}
                            </span>
                          </td>
                          <td className="py-1.5 text-muted-foreground">{source.provider}</td>
                          <td className="py-1.5 text-muted-foreground">{source.kind}</td>
                          <td className="py-1.5 text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              {source.country && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Globe className="h-3 w-3" />
                                  {source.country}
                                </span>
                              )}
                              {source.language && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Languages className="h-3 w-3" />
                                  {languageNames[source.language] || source.language}
                                </span>
                              )}
                              {source.category && (
                                <span>{categoryNamesEn[source.category] || source.category}</span>
                              )}
                            </span>
                          </td>
                          <td className="py-1.5 text-right">{source.channels}</td>
                          <td className="py-1.5 text-right">
                            {source.metrics ? `${Math.round(source.metrics.alive * 100)}%` : '—'}
                          </td>
                          <td
                            className={cn(
                              'py-1.5 text-right',
                              source.metrics && source.metrics.direct >= 0.6 && 'text-green-500',
                              source.metrics && source.metrics.direct < 0.3 && 'text-yellow-500'
                            )}
                          >
                            {source.metrics ? `${Math.round(source.metrics.direct * 100)}%` : '—'}
                          </td>
                          <td className="py-1.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              disabled={importingId === source.id}
                              onClick={() => handleImportToStaging(source)}
                              title="Import this playlist into staging for manual review"
                            >
                              {importingId === source.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-muted-foreground">
                            <XCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                            No sources match the filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
