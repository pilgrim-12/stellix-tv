'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  FileJson,
} from 'lucide-react'
import {
  getAllChannels,
  getAllPlaylists,
  FirebaseChannel,
  Playlist,
} from '@/lib/channelService'
import {
  saveCuratedChannels,
  getCuratedMetadata,
  hasCuratedStructure,
  CuratedChannel,
  getAllCuratedChannelsRaw,
} from '@/lib/curatedChannelService'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface MigrationStats {
  total: number
  active: number
  pending: number
  broken: number
  inactive: number
  uniqueUrls: number
  duplicates: number
}

export default function MigratePage() {
  const router = useRouter()
  const { isAdmin, loading } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [isImportingJson, setIsImportingJson] = useState(false)

  const [exportedData, setExportedData] = useState<{
    channels: FirebaseChannel[]
    playlists: Playlist[]
  } | null>(null)

  const [stats, setStats] = useState<MigrationStats | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New structure status
  const [hasNewStructure, setHasNewStructure] = useState<boolean | null>(null)
  const [newStructureStats, setNewStructureStats] = useState<{
    count: number
    version: number
    updatedAt: string
  } | null>(null)

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, isAdmin, router])

  // Check for new structure on load
  useEffect(() => {
    checkNewStructure()
  }, [])

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const checkNewStructure = async () => {
    try {
      const exists = await hasCuratedStructure()
      setHasNewStructure(exists)

      if (exists) {
        const meta = await getCuratedMetadata()
        if (meta) {
          setNewStructureStats({
            count: meta.count,
            version: meta.version,
            updatedAt: meta.updatedAt?.toLocaleString() || 'Unknown',
          })
        }
      }
    } catch (err) {
      console.error('Error checking new structure:', err)
    }
  }

  // Step 1: Export all data from old structure (11,000+ reads - one time)
  const handleExportOld = async () => {
    setIsExporting(true)
    setError(null)
    setLog([])

    try {
      addLog('Экспорт из старой структуры Firebase...')
      addLog('ВНИМАНИЕ: Это прочитает ВСЕ документы (~11,000 reads)')

      const [channels, playlists] = await Promise.all([
        getAllChannels(),
        getAllPlaylists(),
      ])

      addLog(`Загружено ${channels.length} каналов`)
      addLog(`Загружено ${playlists.length} плейлистов`)

      // Calculate stats
      const urlSet = new Set<string>()
      let duplicateCount = 0

      const byStatus = { active: 0, pending: 0, broken: 0, inactive: 0 }

      channels.forEach((ch) => {
        const url = ch.url?.trim()
        if (url) {
          if (urlSet.has(url)) duplicateCount++
          else urlSet.add(url)
        }
        const status = ch.status || 'pending'
        byStatus[status as keyof typeof byStatus]++
      })

      const exportStats: MigrationStats = {
        total: channels.length,
        active: byStatus.active,
        pending: byStatus.pending,
        broken: byStatus.broken,
        inactive: byStatus.inactive,
        uniqueUrls: urlSet.size,
        duplicates: duplicateCount,
      }

      setExportedData({ channels, playlists })
      setStats(exportStats)

      addLog(`Статистика: ${exportStats.uniqueUrls} уникальных URL, ${exportStats.duplicates} дубликатов`)
      addLog(`Active: ${exportStats.active}, Pending: ${exportStats.pending}, Broken: ${exportStats.broken}`)
      addLog('Экспорт завершён! Можно скачать JSON или мигрировать.')

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Ошибка экспорта: ${message}`)
      addLog(`ОШИБКА: ${message}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Download exported data as JSON
  const handleDownload = () => {
    if (!exportedData) return

    const blob = new Blob([JSON.stringify(exportedData.channels, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stellix-channels-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    addLog('JSON файл скачан')
  }

  // Import from JSON file
  const handleJsonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImportingJson(true)
    setError(null)
    addLog(`Загрузка файла: ${file.name}`)

    try {
      const content = await file.text()
      const data = JSON.parse(content)

      // Check if it's an array of channels
      let channels: FirebaseChannel[]
      if (Array.isArray(data)) {
        channels = data
      } else if (data.channels && Array.isArray(data.channels)) {
        channels = data.channels
      } else {
        throw new Error('Неверный формат JSON. Ожидается массив каналов или объект с полем channels.')
      }

      addLog(`Найдено ${channels.length} каналов в файле`)

      // Calculate stats
      const urlSet = new Set<string>()
      let duplicateCount = 0
      const byStatus = { active: 0, pending: 0, broken: 0, inactive: 0 }

      channels.forEach((ch) => {
        const url = ch.url?.trim()
        if (url) {
          if (urlSet.has(url)) duplicateCount++
          else urlSet.add(url)
        }
        const status = ch.status || 'pending'
        byStatus[status as keyof typeof byStatus]++
      })

      setExportedData({ channels, playlists: [] })
      setStats({
        total: channels.length,
        ...byStatus,
        uniqueUrls: urlSet.size,
        duplicates: duplicateCount,
      })

      addLog(`Active: ${byStatus.active}, Pending: ${byStatus.pending}, Broken: ${byStatus.broken}`)
      addLog('Файл загружен! Нажмите "Мигрировать" для сохранения в Firebase.')

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Ошибка парсинга JSON: ${message}`)
      addLog(`ОШИБКА: ${message}`)
    } finally {
      setIsImportingJson(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Step 2: Migrate to new structure (single document)
  const handleMigrate = async () => {
    if (!exportedData) {
      setError('Сначала загрузите данные')
      return
    }

    setIsMigrating(true)
    setError(null)
    setSuccess(null)

    try {
      addLog('Начало миграции в новую структуру...')

      const channels = exportedData.channels
      addLog(`Всего каналов: ${channels.length}`)

      // Convert FirebaseChannel to CuratedChannel
      // IMPORTANT: Firestore doesn't accept undefined values, so we use null or omit fields
      const curatedChannels: CuratedChannel[] = channels.map((ch) => {
        // Parse timestamps - handle both Firestore format and ISO strings
        let createdAt: string | null = null
        let updatedAt: string | null = null
        let lastChecked: string | null = null

        if (ch.createdAt) {
          if (typeof ch.createdAt === 'string') {
            createdAt = ch.createdAt
          } else if (ch.createdAt.seconds) {
            createdAt = new Date(ch.createdAt.seconds * 1000).toISOString()
          }
        }

        if (ch.updatedAt) {
          if (typeof ch.updatedAt === 'string') {
            updatedAt = ch.updatedAt
          } else if (ch.updatedAt.seconds) {
            updatedAt = new Date(ch.updatedAt.seconds * 1000).toISOString()
          }
        } else {
          updatedAt = new Date().toISOString()
        }

        if (ch.lastChecked) {
          if (typeof ch.lastChecked === 'string') {
            lastChecked = ch.lastChecked
          } else if (ch.lastChecked.seconds) {
            lastChecked = new Date(ch.lastChecked.seconds * 1000).toISOString()
          }
        }

        // Build object without undefined values
        const result: CuratedChannel = {
          id: ch.id,
          name: ch.name,
          url: ch.url,
          logo: ch.logo || null,
          group: ch.group || 'entertainment',
          language: ch.language || null,
          country: ch.country || null,
          status: ch.status || 'pending',
          enabled: ch.enabled !== false,
        }

        // Only add optional fields if they have values
        if (ch.isPrimary) result.isPrimary = true
        if (ch.playlistId) result.playlistId = ch.playlistId
        if (ch.labels && ch.labels.length > 0) result.labels = ch.labels
        if (ch.isCustom) result.isCustom = true
        if (createdAt) result.createdAt = createdAt
        if (updatedAt) result.updatedAt = updatedAt
        if (lastChecked) result.lastChecked = lastChecked
        if (ch.checkedBy) result.checkedBy = ch.checkedBy

        return result
      })

      // Deduplicate by URL (keep first occurrence or isPrimary)
      const urlMap = new Map<string, CuratedChannel>()
      curatedChannels.forEach((ch) => {
        const url = ch.url?.trim()
        if (!url) return

        if (!urlMap.has(url)) {
          urlMap.set(url, ch)
        } else if (ch.isPrimary) {
          // Replace with primary
          urlMap.set(url, ch)
        }
      })

      const dedupedChannels = Array.from(urlMap.values())
      addLog(`После дедупликации: ${dedupedChannels.length} каналов`)

      // Check document size
      const jsonSize = JSON.stringify(dedupedChannels).length
      const sizeKB = Math.round(jsonSize / 1024)
      addLog(`Размер документа: ${sizeKB} KB`)

      if (jsonSize > 900000) {
        addLog('ВНИМАНИЕ: Документ слишком большой (>900KB). Возможны проблемы.')
      }

      // Save to Firebase
      await saveCuratedChannels(dedupedChannels)

      const activeCount = dedupedChannels.filter((ch) => ch.status === 'active').length
      setSuccess(`Миграция завершена! ${dedupedChannels.length} каналов сохранено (${activeCount} активных).`)
      addLog('Миграция завершена!')

      // Refresh status
      await checkNewStructure()

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Ошибка миграции: ${message}`)
      addLog(`ОШИБКА: ${message}`)
    } finally {
      setIsMigrating(false)
    }
  }

  // Download current curated channels
  const handleDownloadCurated = async () => {
    try {
      addLog('Загрузка каналов из новой структуры...')
      const channels = await getAllCuratedChannelsRaw()

      const blob = new Blob([JSON.stringify(channels, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stellix-curated-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      addLog(`Скачано ${channels.length} каналов`)
    } catch (err) {
      addLog(`Ошибка: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Миграция данных</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Info Card */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Редизайн хранения данных
            </CardTitle>
            <CardDescription>
              <strong>Старая структура:</strong> каждый канал = отдельный документ (11,000+ reads за запрос)
              <br />
              <strong>Новая структура:</strong> все каналы в одном документе (1 read за запрос)
              <br />
              <strong className="text-green-500">Экономия квоты: 99%+</strong>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* New Structure Status */}
        <Card className={hasNewStructure ? 'border-green-500/50 bg-green-500/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {hasNewStructure ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Новая структура существует
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  Новая структура не найдена
                </>
              )}
            </CardTitle>
            {newStructureStats && (
              <CardDescription>
                {newStructureStats.count} каналов | Версия: {newStructureStats.version} | Обновлено: {newStructureStats.updatedAt}
              </CardDescription>
            )}
            {hasNewStructure && (
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={handleDownloadCurated}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать текущие каналы
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Import from JSON file */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Загрузить JSON файл
            </CardTitle>
            <CardDescription>
              Загрузите JSON файл с каналами (тот что ты экспортировал ранее)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleJsonFileUpload}
                disabled={isImportingJson}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImportingJson}
                variant="outline"
              >
                {isImportingJson ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <FileJson className="h-4 w-4 mr-2" />
                    Выбрать JSON файл
                  </>
                )}
              </Button>

              <span className="text-muted-foreground self-center">или</span>

              <Button onClick={handleExportOld} disabled={isExporting} variant="outline">
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Экспорт из старой структуры
                  </>
                )}
              </Button>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Всего</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                  <div className="text-xs text-muted-foreground">Активных</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{stats.broken}</div>
                  <div className="text-xs text-muted-foreground">Broken</div>
                </div>
              </div>
            )}

            {exportedData && (
              <Button variant="outline" onClick={handleDownload}>
                <FileJson className="h-4 w-4 mr-2" />
                Скачать как JSON
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Migrate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Сохранить в новую структуру
            </CardTitle>
            <CardDescription>
              Сохранить загруженные каналы в один документ Firebase (дубликаты будут удалены)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleMigrate}
              disabled={!exportedData || isMigrating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Миграция...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Мигрировать в curated_channels
                </>
              )}
            </Button>

            {!exportedData && (
              <p className="text-sm text-muted-foreground">
                Сначала загрузите JSON файл (шаг 1)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Log */}
        <Card>
          <CardHeader>
            <CardTitle>Лог операций</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500 text-sm">
                {success}
              </div>
            )}
            <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
              {log.length === 0 ? (
                <span className="text-muted-foreground">Ожидание операций...</span>
              ) : (
                log.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      line.includes('ОШИБКА') && 'text-red-500',
                      line.includes('ВНИМАНИЕ') && 'text-yellow-500',
                      line.includes('завершён') && 'text-green-500',
                      line.includes('завершена') && 'text-green-500'
                    )}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
