'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChannelStore } from '@/stores'
import { sampleChannels, channelCategories } from '@/data/channels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { parseM3U, convertToAppChannels, fetchM3UPlaylist } from '@/lib/m3uParser'
import {
  Search,
  Tv,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Link,
  Trash2,
  FileText,
  Loader2,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { languageNames } from '@/types'

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

export default function AdminPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    setChannels,
    getAllChannelsWithStatus,
    toggleChannelEnabled,
    loadDisabledChannels,
    loadCustomPlaylists,
    addCustomPlaylist,
    removeCustomPlaylist,
    togglePlaylistEnabled,
    customPlaylists,
  } = useChannelStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [showDisabledOnly, setShowDisabledOnly] = useState(false)

  // Import state
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  useEffect(() => {
    setChannels(sampleChannels)
    loadDisabledChannels()
    loadCustomPlaylists()
  }, [setChannels, loadDisabledChannels, loadCustomPlaylists])

  const allChannels = getAllChannelsWithStatus()

  // Get available languages
  const availableLanguages = Array.from(
    new Set(allChannels.map((ch) => ch.language).filter(Boolean))
  ).sort() as string[]

  // Filter channels
  const filteredChannels = allChannels.filter((channel) => {
    const matchesCategory =
      selectedCategory === 'all' || channel.group === selectedCategory
    const matchesLanguage =
      selectedLanguage === 'all' || channel.language === selectedLanguage
    const matchesSearch =
      !searchQuery ||
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDisabled = !showDisabledOnly || !channel.enabled

    return matchesCategory && matchesLanguage && matchesSearch && matchesDisabled
  })

  // Stats
  const totalChannels = allChannels.length
  const enabledChannels = allChannels.filter((ch) => ch.enabled).length
  const disabledCount = totalChannels - enabledChannels
  const customChannelsCount = customPlaylists.reduce((acc, p) => acc + p.channels.length, 0)

  const enableAll = () => {
    allChannels.forEach((ch) => {
      if (!ch.enabled) {
        toggleChannelEnabled(ch.id)
      }
    })
  }

  const disableAll = () => {
    allChannels.forEach((ch) => {
      if (ch.enabled) {
        toggleChannelEnabled(ch.id)
      }
    })
  }

  // Import M3U from URL
  const handleImportFromUrl = async () => {
    if (!playlistUrl.trim()) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const content = await fetchM3UPlaylist(playlistUrl.trim())
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Плейлист пуст или имеет неверный формат')
      }

      const playlistId = `url-${Date.now()}`
      const channels = convertToAppChannels(m3uChannels, playlistId)

      // Извлекаем имя из URL
      const urlParts = playlistUrl.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'Плейлист'

      addCustomPlaylist({
        id: playlistId,
        name: fileName.replace('.m3u8', '').replace('.m3u', ''),
        url: playlistUrl,
        channels,
        addedAt: Date.now(),
        enabled: true,
      })

      setImportSuccess(`Добавлено ${channels.length} каналов`)
      setPlaylistUrl('')
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
      const content = await file.text()
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Файл пуст или имеет неверный формат')
      }

      const playlistId = `file-${Date.now()}`
      const channels = convertToAppChannels(m3uChannels, playlistId)

      addCustomPlaylist({
        id: playlistId,
        name: file.name.replace('.m3u8', '').replace('.m3u', ''),
        channels,
        addedAt: Date.now(),
        enabled: true,
      })

      setImportSuccess(`Добавлено ${channels.length} каналов из ${file.name}`)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка чтения файла')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/watch')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Управление каналами</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего каналов</p>
                <p className="text-2xl font-bold">{totalChannels}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Включено</p>
                <p className="text-2xl font-bold text-green-500">{enabledChannels}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Выключено</p>
                <p className="text-2xl font-bold text-red-500">{disabledCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Plus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Добавлено</p>
                <p className="text-2xl font-bold text-blue-500">{customChannelsCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import M3U */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Импорт M3U плейлиста
            </CardTitle>
            <CardDescription>
              Добавьте каналы из M3U файла или по ссылке
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL import */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://example.com/playlist.m3u"
                  className="pl-9"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  disabled={isImporting}
                />
              </div>
              <Button
                onClick={handleImportFromUrl}
                disabled={isImporting || !playlistUrl.trim()}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Загрузить
                  </>
                )}
              </Button>
            </div>

            {/* File upload */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">или</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Выбрать файл
              </Button>
            </div>

            {/* Status messages */}
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

            {/* Custom playlists list */}
            {customPlaylists.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Добавленные плейлисты:</p>
                <div className="space-y-2">
                  {customPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-opacity",
                        playlist.enabled === false && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {playlist.url ? (
                          <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{playlist.name}</p>
                          {playlist.url && (
                            <p className="text-xs text-muted-foreground truncate" title={playlist.url}>
                              {playlist.url}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {playlist.channels.length} каналов • {new Date(playlist.addedAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={playlist.enabled !== false}
                          onCheckedChange={() => togglePlaylistEnabled(playlist.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => removeCustomPlaylist(playlist.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
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

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {channelCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {categoryNamesRu[cat.id] || cat.name}
                </Button>
              ))}
            </div>

            {/* Languages */}
            <div className="flex flex-wrap items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={selectedLanguage === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedLanguage('all')}
              >
                Все языки
              </Button>
              {availableLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {languageNames[lang] || lang.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Show disabled only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-disabled"
                  checked={showDisabledOnly}
                  onCheckedChange={setShowDisabledOnly}
                />
                <label htmlFor="show-disabled" className="text-sm cursor-pointer">
                  Показать только выключенные
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={enableAll}>
                  <Eye className="h-4 w-4 mr-1" />
                  Включить все
                </Button>
                <Button variant="outline" size="sm" onClick={disableAll}>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Выключить все
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channels list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Каналы ({filteredChannels.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedLanguage('all')
                  setShowDisabledOnly(false)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={cn(
                    'flex items-center gap-4 py-3 transition-opacity',
                    !channel.enabled && 'opacity-50'
                  )}
                >
                  {/* Logo */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{channel.name}</p>
                      {(channel as any).isCustom && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-medium">
                          Добавлен
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{categoryNamesRu[channel.group] || channel.group}</span>
                      <span>•</span>
                      <span>{languageNames[channel.language || ''] || channel.language}</span>
                      {channel.labels?.map((label) => (
                        <span
                          key={label}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {channel.enabled ? 'Вкл' : 'Выкл'}
                    </span>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => toggleChannelEnabled(channel.id)}
                    />
                  </div>
                </div>
              ))}

              {filteredChannels.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Каналы не найдены
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
