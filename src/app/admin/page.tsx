'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
  FileText,
  Loader2,
  Users,
  Play,
  AlertCircle,
  Clock,
  Ban,
  Check,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  getAllChannels,
  getAllPlaylists,
  createPlaylist,
  deletePlaylist,
  importChannels,
  getChannelsStats,
  setChannelStatus,
  updateChannelLanguage,
  FirebaseChannel,
  Playlist,
} from '@/lib/channelService'
import { getTotalUsersCount, setUserAsAdmin, removeUserAdmin, getAllUsers } from '@/lib/userService'
import { Timestamp } from 'firebase/firestore'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder, ChannelStatus } from '@/types'

const categoryNamesRu: Record<string, string> = {
  all: 'Все',
  news: 'Новости',
  sports: 'Спорт',
  movies: 'Кино',
  kids: 'Детям',
  music: 'Музыка',
  entertainment: 'Развлечения',
  documentary: 'Документальное',
  nature: 'Природа',
  lifestyle: 'Стиль жизни',
  cooking: 'Кулинария',
  gaming: 'Игры',
}

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

  // Data state
  const [channels, setChannels] = useState<FirebaseChannel[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ChannelStatus | 'all'>('all')
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('all')

  // Import state
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Deleting playlist state
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null)

  // Player state
  const [selectedChannel, setSelectedChannel] = useState<FirebaseChannel | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerError, setPlayerError] = useState(false)

  // Stats
  const [usersCount, setUsersCount] = useState<number | null>(null)
  const [stats, setStats] = useState<{ total: number; pending: number; active: number; inactive: number; broken: number } | null>(null)

  // Duplicates analysis
  interface DuplicateInfo {
    name: string
    normalizedName: string
    count: number
    channels: { id: string; playlistId: string; playlistName: string; status: string }[]
  }
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)

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

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, isAdmin, router])

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [channelsData, playlistsData, usersData, statsData] = await Promise.all([
        getAllChannels(),
        getAllPlaylists(),
        getTotalUsersCount(),
        getChannelsStats(),
      ])
      setChannels(channelsData)
      setPlaylists(playlistsData)
      setUsersCount(usersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Play channel in preview
  const playChannel = async (channel: FirebaseChannel) => {
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
    try {
      await setChannelStatus(channelId, status)
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, status } : ch))
      )
      // Update stats
      const newStats = await getChannelsStats()
      setStats(newStats)
    } catch (error) {
      console.error('Error setting status:', error)
    }
  }

  // Import M3U from URL
  const handleImportFromUrl = async () => {
    if (!playlistUrl.trim()) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      // Check if playlist with this URL already exists
      const existingPlaylist = playlists.find((p) => p.url === playlistUrl.trim())
      if (existingPlaylist) {
        throw new Error(`Плейлист "${existingPlaylist.name}" с этим URL уже добавлен`)
      }

      const content = await fetchM3UPlaylist(playlistUrl.trim())
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Плейлист пуст или имеет неверный формат')
      }

      // Extract name from URL
      const urlParts = playlistUrl.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'Плейлист'
      const playlistName = fileName.replace('.m3u8', '').replace('.m3u', '')

      // Check if playlist with same name exists
      const existingByName = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase())
      if (existingByName) {
        throw new Error(`Плейлист с именем "${playlistName}" уже существует`)
      }

      // Create playlist in Firebase
      const playlistId = await createPlaylist(playlistName, m3uChannels.length, playlistUrl)

      // Convert and import channels
      const appChannels = convertToAppChannels(m3uChannels, playlistId)
      const result = await importChannels(appChannels, playlistId)

      setImportSuccess(`Добавлено ${result.success} каналов в плейлист "${playlistName}"`)
      setPlaylistUrl('')

      // Reload data
      await loadData()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка импорта')
    } finally {
      setIsImporting(false)
    }
  }

  // Import M3U from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const playlistName = file.name.replace('.m3u8', '').replace('.m3u', '')

      // Check if playlist with same name already exists
      const existingByName = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase())
      if (existingByName) {
        throw new Error(`Плейлист с именем "${playlistName}" уже существует`)
      }

      const content = await file.text()
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Файл пуст или имеет неверный формат')
      }

      // Create playlist in Firebase
      const playlistId = await createPlaylist(playlistName, m3uChannels.length)

      // Convert and import channels
      const appChannels = convertToAppChannels(m3uChannels, playlistId)
      const result = await importChannels(appChannels, playlistId)

      setImportSuccess(`Добавлено ${result.success} каналов из "${file.name}"`)

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

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string, channelCount: number) => {
    if (!confirm(`Удалить плейлист и все его ${channelCount} каналов? Это может занять некоторое время.`)) return

    setDeletingPlaylistId(playlistId)
    setImportError(null)
    setImportSuccess(null)

    try {
      await deletePlaylist(playlistId)
      setImportSuccess(`Плейлист и ${channelCount} каналов удалены`)
      await loadData()
    } catch (error) {
      console.error('Error deleting playlist:', error)
      setImportError('Ошибка при удалении плейлиста')
    } finally {
      setDeletingPlaylistId(null)
    }
  }

  // Analyze duplicates
  const analyzeDuplicates = () => {
    setIsAnalyzing(true)

    // Normalize channel name for comparison
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/\s*(hd|sd|fhd|4k|uhd|\d+p)\s*/gi, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .replace(/\s*\[[^\]]*\]\s*/g, '')
        .replace(/[^a-zа-яё0-9]/gi, '')
        .trim()
    }

    // Create playlist map for quick lookup
    const playlistMap = new Map(playlists.map(p => [p.id, p.name]))

    // Group channels by normalized name
    const groups = new Map<string, DuplicateInfo>()

    channels.forEach(channel => {
      const normalized = normalizeName(channel.name)
      if (!normalized) return

      if (!groups.has(normalized)) {
        groups.set(normalized, {
          name: channel.name,
          normalizedName: normalized,
          count: 0,
          channels: []
        })
      }

      const group = groups.get(normalized)!
      group.count++
      group.channels.push({
        id: channel.id,
        playlistId: channel.playlistId || '',
        playlistName: playlistMap.get(channel.playlistId || '') || 'Неизвестный',
        status: channel.status || 'pending'
      })
    })

    // Filter only duplicates (count > 1) and sort by count
    const duplicatesList = Array.from(groups.values())
      .filter(g => g.count > 1)
      .sort((a, b) => b.count - a.count)

    setDuplicates(duplicatesList)
    setShowDuplicates(true)
    setIsAnalyzing(false)
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
    }
  }

  // Filter channels
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = !searchQuery || channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || channel.status === selectedStatus || (!channel.status && selectedStatus === 'pending')
    const matchesPlaylist = selectedPlaylist === 'all' || channel.playlistId === selectedPlaylist
    return matchesSearch && matchesStatus && matchesPlaylist
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
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Player + Stats */}
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
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Рабочий
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleSetStatus(selectedChannel.id, 'broken')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Нерабочий
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-gray-500 hover:bg-gray-500/10"
                        onClick={() => handleSetStatus(selectedChannel.id, 'inactive')}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Отключить
                      </Button>
                    </div>

                    {/* Language selector */}
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <select
                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={selectedChannel.language || ''}
                        onChange={async (e) => {
                          const newLanguage = e.target.value
                          try {
                            await updateChannelLanguage(selectedChannel.id, newLanguage)
                            setChannels((prev) =>
                              prev.map((ch) =>
                                ch.id === selectedChannel.id ? { ...ch, language: newLanguage } : ch
                              )
                            )
                            setSelectedChannel({ ...selectedChannel, language: newLanguage })
                          } catch (error) {
                            console.error('Error updating language:', error)
                          }
                        }}
                      >
                        <option value="">Неизвестный язык</option>
                        {languageOrder.map((code) => (
                          <option key={code} value={code}>
                            {languageNames[code]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats - compact inline */}
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{stats?.total ?? '—'}</span>
                    <span className="text-muted-foreground">всего</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="font-bold">{stats?.active ?? '—'}</span>
                    <span className="text-muted-foreground">рабочих</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-3 w-3" />
                    <span className="font-bold">{stats?.broken ?? '—'}</span>
                    <span className="text-muted-foreground">сломано</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Clock className="h-3 w-3" />
                    <span className="font-bold">{stats?.pending ?? '—'}</span>
                    <span className="text-muted-foreground">ожидает</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Ban className="h-3 w-3" />
                    <span className="font-bold">{stats?.inactive ?? '—'}</span>
                    <span className="text-muted-foreground">откл.</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-500">
                    <Users className="h-3 w-3" />
                    <span className="font-bold">{usersCount ?? '—'}</span>
                    <span className="text-muted-foreground">юзеров</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import M3U */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Импорт M3U
                </CardTitle>
                <CardDescription>Добавьте плейлист по ссылке или файлу</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    className="text-sm"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    disabled={isImporting}
                  />
                  <Button onClick={handleImportFromUrl} disabled={isImporting || !playlistUrl.trim()} size="icon">
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                  </Button>
                </div>

                <input ref={fileInputRef} type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить файл
                </Button>

                {importError && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {importError}
                  </p>
                )}
                {importSuccess && (
                  <p className="text-sm text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {importSuccess}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Playlists */}
            {playlists.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Плейлисты ({playlists.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2 font-medium">Название</th>
                          <th className="px-2 py-2 font-medium text-center">Всего</th>
                          <th className="px-2 py-2 font-medium text-center text-green-500">
                            <CheckCircle2 className="h-3 w-3 mx-auto" />
                          </th>
                          <th className="px-2 py-2 font-medium text-center text-red-500">
                            <XCircle className="h-3 w-3 mx-auto" />
                          </th>
                          <th className="px-2 py-2 font-medium text-center text-yellow-500">
                            <Clock className="h-3 w-3 mx-auto" />
                          </th>
                          <th className="px-2 py-2 font-medium text-center text-gray-500">
                            <Ban className="h-3 w-3 mx-auto" />
                          </th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {playlists.map((playlist) => {
                          const playlistChannels = channels.filter((ch) => ch.playlistId === playlist.id)
                          const activeCount = playlistChannels.filter((ch) => ch.status === 'active').length
                          const brokenCount = playlistChannels.filter((ch) => ch.status === 'broken').length
                          const pendingCount = playlistChannels.filter((ch) => !ch.status || ch.status === 'pending').length
                          const inactiveCount = playlistChannels.filter((ch) => ch.status === 'inactive').length
                          const isDeleting = deletingPlaylistId === playlist.id

                          return (
                            <tr
                              key={playlist.id}
                              className={cn(
                                "hover:bg-muted/50 transition-colors",
                                isDeleting && "opacity-50",
                                selectedPlaylist === playlist.id && "bg-primary/10"
                              )}
                            >
                              <td className="px-4 py-2">
                                <button
                                  className="text-left hover:text-primary transition-colors"
                                  onClick={() => setSelectedPlaylist(selectedPlaylist === playlist.id ? 'all' : playlist.id)}
                                >
                                  <span className="font-medium truncate block max-w-[120px]" title={playlist.name}>
                                    {playlist.name}
                                  </span>
                                </button>
                              </td>
                              <td className="px-2 py-2 text-center text-muted-foreground">
                                {playlistChannels.length}
                              </td>
                              <td className="px-2 py-2 text-center text-green-500 font-medium">
                                {activeCount || '-'}
                              </td>
                              <td className="px-2 py-2 text-center text-red-500 font-medium">
                                {brokenCount || '-'}
                              </td>
                              <td className="px-2 py-2 text-center text-yellow-500 font-medium">
                                {pendingCount || '-'}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-500 font-medium">
                                {inactiveCount || '-'}
                              </td>
                              <td className="px-2 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  onClick={() => handleDeletePlaylist(playlist.id, playlistChannels.length)}
                                  disabled={isDeleting || deletingPlaylistId !== null}
                                >
                                  {isDeleting ? (
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Channels list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Поиск каналов..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('all')}
                  >
                    Все
                  </Button>
                  <Button
                    variant={selectedStatus === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('pending')}
                    className={selectedStatus !== 'pending' ? 'text-yellow-500 border-yellow-500/30' : ''}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Ожидает
                  </Button>
                  <Button
                    variant={selectedStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('active')}
                    className={selectedStatus !== 'active' ? 'text-green-500 border-green-500/30' : ''}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Рабочие
                  </Button>
                  <Button
                    variant={selectedStatus === 'broken' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('broken')}
                    className={selectedStatus !== 'broken' ? 'text-red-500 border-red-500/30' : ''}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Нерабочие
                  </Button>
                  <Button
                    variant={selectedStatus === 'inactive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('inactive')}
                    className={selectedStatus !== 'inactive' ? 'text-gray-500 border-gray-500/30' : ''}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Отключено
                  </Button>
                </div>

                {playlists.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Плейлист:</span>
                    <Button
                      variant={selectedPlaylist === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedPlaylist('all')}
                    >
                      Все
                    </Button>
                    {playlists.map((p) => (
                      <Button
                        key={p.id}
                        variant={selectedPlaylist === p.id ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSelectedPlaylist(p.id)}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channels */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Каналы ({filteredChannels.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {channels.length === 0 ? 'Импортируйте плейлист чтобы добавить каналы' : 'Каналы не найдены'}
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
                            <span>{categoryNamesRu[channel.group] || channel.group}</span>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Duplicates Analysis Section */}
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Анализ дубликатов
                </CardTitle>
                <div className="flex items-center gap-2">
                  {duplicates.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      Найдено {duplicates.length} групп дубликатов
                    </span>
                  )}
                  <Button
                    onClick={analyzeDuplicates}
                    disabled={isAnalyzing || channels.length === 0}
                    size="sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Анализ...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Найти дубликаты
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription>
                Поиск каналов с одинаковыми или похожими названиями в разных плейлистах
              </CardDescription>
            </CardHeader>

            {showDuplicates && duplicates.length > 0 && (
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Канал</th>
                        <th className="px-2 py-2 font-medium text-center">Повторов</th>
                        <th className="px-4 py-2 font-medium">Плейлисты</th>
                        <th className="px-4 py-2 font-medium">Статусы</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {duplicates.map((dup, idx) => (
                        <tr key={idx} className="hover:bg-muted/50">
                          <td className="px-4 py-2">
                            <div>
                              <span className="font-medium">{dup.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({dup.normalizedName})
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={cn(
                              "font-bold",
                              dup.count >= 5 ? "text-red-500" : dup.count >= 3 ? "text-yellow-500" : "text-muted-foreground"
                            )}>
                              {dup.count}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(dup.channels.map(c => c.playlistName))].map((name, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2 text-xs">
                              {(() => {
                                const statusCounts = dup.channels.reduce((acc, c) => {
                                  acc[c.status] = (acc[c.status] || 0) + 1
                                  return acc
                                }, {} as Record<string, number>)
                                return (
                                  <>
                                    {statusCounts.active && (
                                      <span className="text-green-500">{statusCounts.active} рабочих</span>
                                    )}
                                    {statusCounts.broken && (
                                      <span className="text-red-500">{statusCounts.broken} сломано</span>
                                    )}
                                    {statusCounts.pending && (
                                      <span className="text-yellow-500">{statusCounts.pending} ожидает</span>
                                    )}
                                    {statusCounts.inactive && (
                                      <span className="text-gray-500">{statusCounts.inactive} откл.</span>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}

            {showDuplicates && duplicates.length === 0 && (
              <CardContent>
                <p className="text-center text-muted-foreground py-4">
                  Дубликаты не найдены
                </p>
              </CardContent>
            )}
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
                              disabled={u.id === user?.uid}
                            >
                              {u.isAdmin ? 'Убрать админа' : 'Сделать админом'}
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
