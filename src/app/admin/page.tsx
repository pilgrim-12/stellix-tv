'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { parseM3U, convertToAppChannels, fetchM3UPlaylist } from '@/lib/m3uParser'
import {
  Search,
  Tv,
  ArrowLeft,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Link,
  Trash2,
  Loader2,
  Users,
  Play,
  AlertCircle,
  Clock,
  Ban,
  Check,
  X,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from 'lucide-react'
import {
  getAllCuratedChannelsRaw,
  getCuratedMetadata,
  importChannelsToCurated,
  updateChannelStatus,
  updateCuratedChannel,
  bulkDeleteChannels,
  getPlaylistSources,
  addPlaylistSource,
  deletePlaylistSource,
  CuratedChannel,
  ImportResult,
  PlaylistSource,
} from '@/lib/curatedChannelService'
import { getTotalUsersCount, setUserAsAdmin, removeUserAdmin, getAllUsers } from '@/lib/userService'
import { getStatsSummary, resetStats } from '@/lib/firebaseQuotaTracker'
import { Timestamp } from 'firebase/firestore'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder, categoryNames, categoryOrder, ChannelStatus } from '@/types'

const statusColors: Record<ChannelStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  active: 'bg-green-500/20 text-green-500',
  inactive: 'bg-gray-500/20 text-gray-500',
  broken: 'bg-red-500/20 text-red-500',
}

const statusNames: Record<ChannelStatus, string> = {
  pending: 'Ожидает',
  active: 'Рабочий',
  inactive: 'Отключен',
  broken: 'Нерабочий',
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin, loading } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  // Data state - now using curated_channels
  const [channels, setChannels] = useState<CuratedChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ChannelStatus | 'all'>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')

  // Import state
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)

  // Delete state
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)

  // Status update loading state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [updatingLanguageId, setUpdatingLanguageId] = useState<string | null>(null)
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null)

  // Player state
  const [selectedChannel, setSelectedChannel] = useState<CuratedChannel | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerError, setPlayerError] = useState(false)

  // Stats - calculated from channels
  const [usersCount, setUsersCount] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<{ count: number; version: number; updatedAt: Date | null } | null>(null)

  // Playlist sources (import history)
  const [playlistSources, setPlaylistSources] = useState<PlaylistSource[]>([])
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('all')
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null)

  // Users management
  interface UserInfo {
    id: string
    email?: string
    isAdmin?: boolean
    lastVisit?: Timestamp
  }
  const [allUsers, setAllUsers] = useState<UserInfo[]>([])
  const [showUsers, setShowUsers] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null)

  // Firebase Quota Tracking
  const [quotaStats, setQuotaStats] = useState<ReturnType<typeof getStatsSummary> | null>(null)
  const [showQuotaStats, setShowQuotaStats] = useState(false)

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, isAdmin, router])

  // Load all data from curated_channels (single document = 1 read)
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [channelsData, usersData, metadataData, sourcesData] = await Promise.all([
        getAllCuratedChannelsRaw(),
        getTotalUsersCount(),
        getCuratedMetadata(),
        getPlaylistSources(),
      ])
      setChannels(channelsData)
      setUsersCount(usersData)
      setMetadata(metadataData)
      setPlaylistSources(sourcesData.sort((a, b) =>
        new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
      ))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Update quota stats periodically
  useEffect(() => {
    const updateQuotaStats = () => {
      setQuotaStats(getStatsSummary())
    }
    updateQuotaStats()
    const interval = setInterval(updateQuotaStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Play channel in preview
  const playChannel = async (channel: CuratedChannel) => {
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setSelectedChannel(channel)
    setPlayerError(false)
    setIsPlaying(true)

    if (videoRef.current) {
      // Try HLS.js for m3u8
      if (channel.url.includes('.m3u8')) {
        const Hls = (await import('hls.js')).default
        if (Hls.isSupported()) {
          const hls = new Hls()
          hlsRef.current = hls
          hls.loadSource(channel.url)
          hls.attachMedia(videoRef.current)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setPlayerError(false)
          })
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setPlayerError(true)
            }
          })
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = channel.url
        }
      } else {
        videoRef.current.src = channel.url
      }
    }
  }

  // Update channel status
  const handleSetStatus = async (channelId: string, status: ChannelStatus) => {
    setUpdatingStatusId(channelId)
    try {
      await updateChannelStatus(channelId, status, user?.email || undefined)
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, status, lastChecked: new Date().toISOString() } : ch))
      )
      // Update selected channel if it's the one being updated
      if (selectedChannel?.id === channelId) {
        setSelectedChannel({ ...selectedChannel, status })
      }
    } catch (error) {
      console.error('Error setting status:', error)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Delete channel
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Удалить этот канал?')) return

    setDeletingChannelId(channelId)
    try {
      await bulkDeleteChannels([channelId])
      setChannels((prev) => prev.filter((ch) => ch.id !== channelId))
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null)
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
    } finally {
      setDeletingChannelId(null)
    }
  }

  // Import M3U from URL - adds to curated_channels with deduplication
  const handleImportFromUrl = async () => {
    if (!playlistUrl.trim()) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)
    setLastImportResult(null)

    try {
      const content = await fetchM3UPlaylist(playlistUrl.trim())
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Плейлист пуст или имеет неверный формат')
      }

      // Extract name from URL for playlistId reference
      const urlParts = playlistUrl.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'playlist'
      const playlistName = fileName.replace('.m3u8', '').replace('.m3u', '')
      const playlistId = `source-${Date.now()}`

      // Convert and import channels to curated_channels
      const appChannels = convertToAppChannels(m3uChannels, playlistId)
      const result = await importChannelsToCurated(
        appChannels.map(ch => ({
          name: ch.name,
          url: ch.url,
          logo: ch.logo,
          group: ch.group,
          language: ch.language,
          country: ch.country,
        })),
        playlistId
      )

      // Save playlist source record
      await addPlaylistSource(
        playlistName,
        playlistUrl.trim(),
        'url',
        m3uChannels.length,
        result.added,
        result.skipped
      )

      setLastImportResult(result)
      setImportSuccess(`Добавлено ${result.added} каналов, пропущено ${result.skipped} (дубликаты по URL)`)
      setPlaylistUrl('')

      // Reload data
      await loadData()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка импорта')
    } finally {
      setIsImporting(false)
    }
  }

  // Import M3U from file - adds to curated_channels with deduplication
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)
    setLastImportResult(null)

    try {
      const playlistName = file.name.replace('.m3u8', '').replace('.m3u', '')
      const playlistId = `source-${Date.now()}`

      const content = await file.text()
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Файл пуст или имеет неверный формат')
      }

      // Convert and import channels to curated_channels
      const appChannels = convertToAppChannels(m3uChannels, playlistId)
      const result = await importChannelsToCurated(
        appChannels.map(ch => ({
          name: ch.name,
          url: ch.url,
          logo: ch.logo,
          group: ch.group,
          language: ch.language,
          country: ch.country,
        })),
        playlistId
      )

      // Save playlist source record
      await addPlaylistSource(
        playlistName,
        null,
        'file',
        m3uChannels.length,
        result.added,
        result.skipped
      )

      setLastImportResult(result)
      setImportSuccess(`Добавлено ${result.added} каналов из "${file.name}", пропущено ${result.skipped} дубликатов`)

      // Reload data
      await loadData()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка чтения файла')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Delete playlist source
  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Удалить запись об импорте? Каналы из этого плейлиста останутся в базе.')) return

    setDeletingSourceId(sourceId)
    try {
      await deletePlaylistSource(sourceId)
      setPlaylistSources(prev => prev.filter(s => s.id !== sourceId))
      if (selectedPlaylistId === sourceId) {
        setSelectedPlaylistId('all')
      }
    } catch (error) {
      console.error('Error deleting source:', error)
    } finally {
      setDeletingSourceId(null)
    }
  }

  // Update channel language
  const handleUpdateLanguage = async (channelId: string, newLanguage: string) => {
    setUpdatingLanguageId(channelId)
    try {
      await updateCuratedChannel(channelId, { language: newLanguage || null })
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, language: newLanguage || null } : ch))
      )
      if (selectedChannel?.id === channelId) {
        setSelectedChannel({ ...selectedChannel, language: newLanguage || null })
      }
    } catch (error) {
      console.error('Error updating language:', error)
    } finally {
      setUpdatingLanguageId(null)
    }
  }

  // Update channel category
  const handleUpdateCategory = async (channelId: string, newCategory: string) => {
    setUpdatingCategoryId(channelId)
    try {
      await updateCuratedChannel(channelId, { group: newCategory || 'entertainment' })
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, group: newCategory || 'entertainment' } : ch))
      )
      if (selectedChannel?.id === channelId) {
        setSelectedChannel({ ...selectedChannel, group: newCategory || 'entertainment' })
      }
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      setUpdatingCategoryId(null)
    }
  }

  // Load users for admin management
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const users = await getAllUsers()
      setAllUsers(users)
      setShowUsers(true)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Toggle admin status
  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdminId(userId)
    try {
      if (currentIsAdmin) {
        await removeUserAdmin(userId)
      } else {
        await setUserAsAdmin(userId)
      }
      // Reload users
      const users = await getAllUsers()
      setAllUsers(users)
    } catch (error) {
      console.error('Error toggling admin:', error)
    } finally {
      setTogglingAdminId(null)
    }
  }

  // Calculate stats from channels
  const stats = {
    total: channels.length,
    pending: channels.filter(ch => ch.status === 'pending').length,
    active: channels.filter(ch => ch.status === 'active').length,
    inactive: channels.filter(ch => ch.status === 'inactive').length,
    broken: channels.filter(ch => ch.status === 'broken').length,
  }

  // Get unique languages from channels
  const availableLanguages = [...new Set(channels.map(ch => ch.language).filter(Boolean))] as string[]

  // Filter channels
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = !searchQuery || channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || channel.status === selectedStatus || (!channel.status && selectedStatus === 'pending')
    const matchesLanguage = selectedLanguage === 'all' || channel.language === selectedLanguage
    const matchesPlaylist = selectedPlaylistId === 'all' || channel.playlistId === selectedPlaylistId
    return matchesSearch && matchesStatus && matchesLanguage && matchesPlaylist
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/watch')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Управление каналами</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => router.push('/admin/staging')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Staging
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4">
        {/* Compact Import + Playlists bar */}
        <Card className="mb-4">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Import controls */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <Input
                  type="url"
                  placeholder="https://example.com/playlist.m3u"
                  className="h-8 text-sm flex-1"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  disabled={isImporting}
                />
                <Button onClick={handleImportFromUrl} disabled={isImporting || !playlistUrl.trim()} size="icon" className="h-8 w-8">
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                </Button>
                <input ref={fileInputRef} type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  <Upload className="h-4 w-4 mr-1" />
                  Файл
                </Button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-bold">{stats?.total ?? '—'}</span>
                  <span className="text-muted-foreground">всего</span>
                </div>
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-bold">{stats?.active ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" />
                  <span className="font-bold">{stats?.broken ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Clock className="h-3 w-3" />
                  <span className="font-bold">{stats?.pending ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-500">
                  <Users className="h-3 w-3" />
                  <span className="font-bold">{usersCount ?? '—'}</span>
                </div>
              </div>

              {/* Database info */}
              {metadata && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-3 w-3" />
                  <span>v{metadata.version}</span>
                  {metadata.updatedAt && (
                    <span>• {metadata.updatedAt.toLocaleString('ru-RU')}</span>
                  )}
                </div>
              )}

              {/* Playlists toggle */}
              <Button
                variant={showPlaylists ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowPlaylists(!showPlaylists)}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Импорты ({playlistSources.length})</span>
                {showPlaylists ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>

              {/* Firebase Quota Stats toggle */}
              <Button
                variant={showQuotaStats ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowQuotaStats(!showQuotaStats)}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Квота: {quotaStats?.total ?? 0}</span>
              </Button>
            </div>

            {/* Import messages */}
            {(importError || importSuccess) && (
              <div className="mt-2">
                {importError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {importError}
                  </p>
                )}
                {importSuccess && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {importSuccess}
                  </p>
                )}
              </div>
            )}

            {/* Playlists (Import History) Panel */}
            {showPlaylists && (
              <div className="mt-2 border-t pt-2">
                <h4 className="text-sm font-medium mb-2">История импортов</h4>
                {playlistSources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ещё нет импортированных плейлистов</p>
                ) : (
                  <div className="overflow-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1 font-medium">Название</th>
                          <th className="px-2 py-1 font-medium text-center">Тип</th>
                          <th className="px-2 py-1 font-medium text-center">Всего</th>
                          <th className="px-2 py-1 font-medium text-center text-green-500">Добавлено</th>
                          <th className="px-2 py-1 font-medium text-center text-yellow-500">Пропущено</th>
                          <th className="px-2 py-1 font-medium">Дата</th>
                          <th className="px-1 py-1"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {playlistSources.map((source) => {
                          const isSelected = selectedPlaylistId === source.id
                          return (
                            <tr
                              key={source.id}
                              className={cn(
                                "hover:bg-muted/50 cursor-pointer",
                                isSelected && "bg-primary/10"
                              )}
                              onClick={() => setSelectedPlaylistId(isSelected ? 'all' : source.id)}
                            >
                              <td className="px-2 py-1">
                                <span className="font-medium truncate block max-w-[150px]" title={source.name}>
                                  {source.name}
                                </span>
                                {source.url && (
                                  <span className="text-[10px] text-muted-foreground truncate block max-w-[150px]" title={source.url}>
                                    {source.url}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {source.type === 'url' ? (
                                  <Link className="h-3 w-3 mx-auto text-blue-500" />
                                ) : (
                                  <FileText className="h-3 w-3 mx-auto text-gray-500" />
                                )}
                              </td>
                              <td className="px-2 py-1 text-center text-muted-foreground">
                                {source.channelCount}
                              </td>
                              <td className="px-2 py-1 text-center text-green-500 font-medium">
                                {source.addedCount}
                              </td>
                              <td className="px-2 py-1 text-center text-yellow-500 font-medium">
                                {source.skippedCount}
                              </td>
                              <td className="px-2 py-1 text-muted-foreground">
                                {new Date(source.importedAt).toLocaleDateString('ru-RU')}
                              </td>
                              <td className="px-1 py-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteSource(source.id)
                                  }}
                                  disabled={deletingSourceId === source.id}
                                >
                                  {deletingSourceId === source.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedPlaylistId !== 'all' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Фильтр: {playlistSources.find(s => s.id === selectedPlaylistId)?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs px-2"
                      onClick={() => setSelectedPlaylistId('all')}
                    >
                      Сбросить
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Firebase Quota Stats Panel */}
            {showQuotaStats && quotaStats && (
              <div className="mt-2 border-t pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Firebase Quota (сегодня)</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      resetStats()
                      setQuotaStats(getStatsSummary())
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-lg">{quotaStats.total}</div>
                    <div className="text-muted-foreground">Всего</div>
                  </div>
                  <div className="bg-blue-500/10 rounded p-2 text-center">
                    <div className="font-bold text-lg text-blue-500">{quotaStats.reads}</div>
                    <div className="text-muted-foreground">Чтений</div>
                  </div>
                  <div className="bg-green-500/10 rounded p-2 text-center">
                    <div className="font-bold text-lg text-green-500">{quotaStats.writes}</div>
                    <div className="text-muted-foreground">Записей</div>
                  </div>
                  <div className="bg-red-500/10 rounded p-2 text-center">
                    <div className="font-bold text-lg text-red-500">{quotaStats.deletes}</div>
                    <div className="text-muted-foreground">Удалений</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-orange-500/10 rounded p-2 text-center">
                    <div className="font-bold">{quotaStats.last5Minutes}</div>
                    <div className="text-muted-foreground">За 5 мин</div>
                  </div>
                  <div className="bg-purple-500/10 rounded p-2 text-center">
                    <div className="font-bold">{quotaStats.lastHour}</div>
                    <div className="text-muted-foreground">За час</div>
                  </div>
                </div>
                {quotaStats.topFunctions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Топ функций:</h5>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {quotaStats.topFunctions.map((fn) => (
                        <div key={fn.name} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                          <span className="font-mono truncate">{fn.name}</span>
                          <div className="flex gap-2 text-muted-foreground">
                            <span className="text-blue-500">R:{fn.reads}</span>
                            <span className="text-green-500">W:{fn.writes}</span>
                            <span className="text-red-500">D:{fn.deletes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main content: Player + Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Player + Playlists */}
          <div className="space-y-6">
            {/* Preview Player */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Предпросмотр
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {selectedChannel ? (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full h-full"
                        controls
                        autoPlay
                        playsInline
                        onCanPlay={() => setPlayerError(false)}
                        onPlaying={() => setPlayerError(false)}
                      />
                      {playerError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-500">
                          <XCircle className="h-8 w-8 mb-2" />
                          <p className="text-sm">Ошибка воспроизведения</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">Выберите канал для просмотра</p>
                    </div>
                  )}
                </div>

                {selectedChannel && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{selectedChannel.name}</p>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', statusColors[selectedChannel.status || 'pending'])}>
                        {statusNames[selectedChannel.status || 'pending']}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleSetStatus(selectedChannel.id, 'active')}
                        disabled={updatingStatusId === selectedChannel.id}
                      >
                        {updatingStatusId === selectedChannel.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Рабочий
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleSetStatus(selectedChannel.id, 'broken')}
                        disabled={updatingStatusId === selectedChannel.id}
                      >
                        {updatingStatusId === selectedChannel.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Нерабочий
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-gray-500 hover:bg-gray-500/10"
                        onClick={() => handleSetStatus(selectedChannel.id, 'inactive')}
                        disabled={updatingStatusId === selectedChannel.id}
                      >
                        {updatingStatusId === selectedChannel.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4 mr-1" />
                        )}
                        Отключить
                      </Button>
                    </div>

                    {/* Language selector */}
                    <div className="flex items-center gap-2">
                      {updatingLanguageId === selectedChannel.id ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      <select
                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                        value={selectedChannel.language || ''}
                        disabled={updatingLanguageId === selectedChannel.id}
                        onChange={(e) => handleUpdateLanguage(selectedChannel.id, e.target.value)}
                      >
                        <option value="">Неизвестный язык</option>
                        {languageOrder.map((code) => (
                          <option key={code} value={code}>
                            {languageNames[code]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category selector */}
                    <div className="flex items-center gap-2">
                      {updatingCategoryId === selectedChannel.id ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Tv className="h-4 w-4 text-muted-foreground" />
                      )}
                      <select
                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                        value={selectedChannel.group || ''}
                        disabled={updatingCategoryId === selectedChannel.id}
                        onChange={(e) => handleUpdateCategory(selectedChannel.id, e.target.value)}
                      >
                        <option value="">Неизвестная категория</option>
                        {categoryOrder.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryNames[cat]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteChannel(selectedChannel.id)}
                      disabled={deletingChannelId === selectedChannel.id}
                    >
                      {deletingChannelId === selectedChannel.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Удалить канал
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right column - Channels list */}
          <Card>
            <CardHeader className="pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Каналы ({filteredChannels.length} из {channels.length})
                </CardTitle>
              </div>
              {/* Search and filter buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[150px] max-w-[250px]">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Поиск..."
                    className="h-6 text-xs pl-7 pr-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setSelectedStatus('all')}
                >
                  Все
                </Button>
                <Button
                  variant={selectedStatus === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'pending' && 'text-yellow-500')}
                  onClick={() => setSelectedStatus('pending')}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Ожидает
                </Button>
                <Button
                  variant={selectedStatus === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'active' && 'text-green-500')}
                  onClick={() => setSelectedStatus('active')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Рабочие
                </Button>
                <Button
                  variant={selectedStatus === 'broken' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'broken' && 'text-red-500')}
                  onClick={() => setSelectedStatus('broken')}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Нерабочие
                </Button>
                <Button
                  variant={selectedStatus === 'inactive' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'inactive' && 'text-gray-500')}
                  onClick={() => setSelectedStatus('inactive')}
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Откл.
                </Button>
                {/* Language filter */}
                {availableLanguages.length > 0 && (
                  <select
                    className="h-6 rounded-md border border-input bg-background px-2 text-xs"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="all">Все языки</option>
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {languageNames[lang] || lang}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Загрузка каналов...</span>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Импортируйте плейлист чтобы добавить каналы
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Каналы не найдены по заданным фильтрам
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-auto">
                  {filteredChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-muted/50',
                        selectedChannel?.id === channel.id && 'bg-primary/10'
                      )}
                      onClick={() => playChannel(channel)}
                    >
                      {/* Logo */}
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {channel.logo ? (
                          <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Tv className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{channel.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{categoryNames[channel.group] || channel.group}</span>
                          {channel.language && (
                            <>
                              <span>•</span>
                              <span>{languageNames[channel.language] || channel.language}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium shrink-0', statusColors[channel.status || 'pending'])}>
                        {statusNames[channel.status || 'pending']}
                      </span>

                      {/* Quick actions */}
                      <div className="flex gap-1 shrink-0">
                        {updatingStatusId === channel.id ? (
                          <div className="h-7 w-7 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetStatus(channel.id, 'active')
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetStatus(channel.id, 'broken')
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Management Section */}
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Управление пользователями
                </CardTitle>
                <Button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  size="sm"
                >
                  {loadingUsers ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {showUsers ? 'Обновить' : 'Загрузить пользователей'}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Назначение и удаление прав администратора
              </CardDescription>
            </CardHeader>

            {showUsers && allUsers.length > 0 && (
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">ID</th>
                        <th className="px-4 py-2 font-medium text-center">Админ</th>
                        <th className="px-4 py-2 font-medium">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/50">
                          <td className="px-4 py-2">
                            <span className="font-medium">{u.email || '—'}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 12)}...</span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {u.isAdmin ? (
                              <span className="text-green-500 font-medium">Да</span>
                            ) : (
                              <span className="text-muted-foreground">Нет</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant={u.isAdmin ? "destructive" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toggleAdmin(u.id, u.isAdmin || false)}
                              disabled={u.id === user?.uid || togglingAdminId === u.id}
                            >
                              {togglingAdminId === u.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Обновление...
                                </>
                              ) : (
                                u.isAdmin ? 'Убрать админа' : 'Сделать админом'
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}

            {showUsers && allUsers.length === 0 && (
              <CardContent>
                <p className="text-center text-muted-foreground py-4">
                  Пользователи не найдены
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
