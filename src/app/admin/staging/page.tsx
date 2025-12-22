'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Play,
  AlertCircle,
  Clock,
  Check,
  X,
  Merge,
  FolderOpen,
  Edit3,
  MapPin,
} from 'lucide-react'
import {
  getStagingPlaylistsList,
  getStagingPlaylist,
  createStagingPlaylist,
  updateStagingChannelStatus,
  updateStagingChannel,
  mergeStagingToCurated,
  deleteStagingPlaylist,
  StagingPlaylist,
  StagingChannel,
  StagingChannelStatus,
} from '@/lib/stagingPlaylistService'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder, categoryNames, categoryOrder } from '@/types'

const statusColors: Record<StagingChannelStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  working: 'bg-green-500/20 text-green-500',
  broken: 'bg-red-500/20 text-red-500',
  merged: 'bg-blue-500/20 text-blue-500',
}

const statusNames: Record<StagingChannelStatus, string> = {
  pending: 'Pending',
  working: 'Working',
  broken: 'Broken',
  merged: 'Merged',
}

export default function StagingPage() {
  const router = useRouter()
  const { user, isAdmin, loading } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  // Playlists list
  const [playlists, setPlaylists] = useState<
    Array<{
      id: string
      name: string
      url: string | null
      type: 'url' | 'file'
      importedAt: string
      stats: StagingPlaylist['stats']
    }>
  >([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  // Current playlist
  const [currentPlaylist, setCurrentPlaylist] = useState<StagingPlaylist | null>(null)
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<StagingChannelStatus | 'all'>('all')

  // Import state
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Player state
  const [selectedChannel, setSelectedChannel] = useState<StagingChannel | null>(null)
  const [playerError, setPlayerError] = useState(false)

  // Edit state
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingField, setSavingField] = useState<string | null>(null)

  // Action states
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ merged: number; skipped: number } | null>(null)
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null)

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, isAdmin, router])

  // Load playlists list
  const loadPlaylists = async () => {
    setIsLoadingList(true)
    try {
      const list = await getStagingPlaylistsList()
      setPlaylists(list.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()))
    } catch (error) {
      console.error('Error loading playlists:', error)
    } finally {
      setIsLoadingList(false)
    }
  }

  // Load specific playlist
  const loadPlaylist = async (id: string) => {
    setIsLoadingPlaylist(true)
    setSelectedChannel(null)
    try {
      const playlist = await getStagingPlaylist(id)
      setCurrentPlaylist(playlist)
    } catch (error) {
      console.error('Error loading playlist:', error)
    } finally {
      setIsLoadingPlaylist(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  // Play channel in preview
  const playChannel = async (channel: StagingChannel) => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setSelectedChannel(channel)
    setEditingName(false)
    setEditName(channel.name)
    setPlayerError(false)

    if (videoRef.current) {
      if (channel.url.includes('.m3u8')) {
        const Hls = (await import('hls.js')).default
        if (Hls.isSupported()) {
          const hls = new Hls()
          hlsRef.current = hls
          hls.loadSource(channel.url)
          hls.attachMedia(videoRef.current)
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
  const handleSetStatus = async (channelId: string, status: StagingChannelStatus) => {
    if (!currentPlaylist) return

    setUpdatingStatusId(channelId)
    try {
      await updateStagingChannelStatus(currentPlaylist.id, channelId, status, user?.email || undefined)

      // Update local state
      setCurrentPlaylist((prev) => {
        if (!prev) return prev
        const channels = prev.channels.map((ch) => (ch.id === channelId ? { ...ch, status } : ch))
        return {
          ...prev,
          channels,
          stats: {
            total: channels.length,
            pending: channels.filter((ch) => ch.status === 'pending').length,
            working: channels.filter((ch) => ch.status === 'working').length,
            broken: channels.filter((ch) => ch.status === 'broken').length,
            merged: channels.filter((ch) => ch.status === 'merged').length,
          },
        }
      })

      if (selectedChannel?.id === channelId) {
        setSelectedChannel((prev) => (prev ? { ...prev, status } : prev))
      }
    } catch (error) {
      console.error('Error setting status:', error)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Update channel field
  const handleUpdateChannel = async (field: 'name' | 'language' | 'group' | 'country', value: string) => {
    if (!currentPlaylist || !selectedChannel) return

    setSavingField(field)
    try {
      await updateStagingChannel(currentPlaylist.id, selectedChannel.id, { [field]: value || null })

      // Update local state
      setCurrentPlaylist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          channels: prev.channels.map((ch) =>
            ch.id === selectedChannel.id ? { ...ch, [field]: value || null } : ch
          ),
        }
      })

      setSelectedChannel((prev) => (prev ? { ...prev, [field]: value || null } : prev))

      if (field === 'name') {
        setEditingName(false)
      }
    } catch (error) {
      console.error('Error updating channel:', error)
    } finally {
      setSavingField(null)
    }
  }

  // Import from URL
  const handleImportFromUrl = async () => {
    if (!playlistUrl.trim()) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const content = await fetchM3UPlaylist(playlistUrl.trim())
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('Playlist is empty or has invalid format')
      }

      const urlParts = playlistUrl.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'playlist'
      const playlistName = fileName.replace('.m3u8', '').replace('.m3u', '')

      const appChannels = convertToAppChannels(m3uChannels, '')

      const result = await createStagingPlaylist(
        playlistName,
        playlistUrl.trim(),
        'url',
        appChannels.map((ch) => ({
          name: ch.name,
          url: ch.url,
          logo: ch.logo,
          group: ch.group,
          language: ch.language,
          country: ch.country,
        }))
      )

      setImportSuccess(`Created staging "${playlistName}" with ${result.channelCount} channels`)
      setPlaylistUrl('')
      await loadPlaylists()
      loadPlaylist(result.id)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import error')
    } finally {
      setIsImporting(false)
    }
  }

  // Import from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const playlistName = file.name.replace('.m3u8', '').replace('.m3u', '')
      const content = await file.text()
      const m3uChannels = parseM3U(content)

      if (m3uChannels.length === 0) {
        throw new Error('File is empty or has invalid format')
      }

      const appChannels = convertToAppChannels(m3uChannels, '')

      const result = await createStagingPlaylist(
        playlistName,
        null,
        'file',
        appChannels.map((ch) => ({
          name: ch.name,
          url: ch.url,
          logo: ch.logo,
          group: ch.group,
          language: ch.language,
          country: ch.country,
        }))
      )

      setImportSuccess(`Created staging "${playlistName}" with ${result.channelCount} channels`)
      await loadPlaylists()
      loadPlaylist(result.id)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'File read error')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Merge working channels to curated
  const handleMerge = async () => {
    if (!currentPlaylist) return

    const workingCount = currentPlaylist.stats.working
    if (workingCount === 0) {
      alert('No working channels to merge')
      return
    }

    if (!confirm(`Merge ${workingCount} working channels to curated collection?`)) {
      return
    }

    setIsMerging(true)
    setMergeResult(null)

    try {
      const result = await mergeStagingToCurated(currentPlaylist.id)
      setMergeResult({ merged: result.merged, skipped: result.skipped })
      await loadPlaylist(currentPlaylist.id)
      await loadPlaylists()
    } catch (error) {
      console.error('Error merging:', error)
      alert('Merge error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsMerging(false)
    }
  }

  // Delete playlist
  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Delete this staging playlist?')) return

    setDeletingPlaylistId(id)
    try {
      await deleteStagingPlaylist(id)
      setPlaylists((prev) => prev.filter((p) => p.id !== id))

      if (currentPlaylist?.id === id) {
        setCurrentPlaylist(null)
        setSelectedChannel(null)
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
    } finally {
      setDeletingPlaylistId(null)
    }
  }

  // Filter channels
  const filteredChannels = currentPlaylist?.channels.filter((channel) => {
    const matchesSearch = !searchQuery || channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || channel.status === selectedStatus
    return matchesSearch && matchesStatus
  }) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="px-4 flex h-12 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Staging</h1>
          </div>

          {/* Import controls in header */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <Input
              type="url"
              placeholder="https://example.com/playlist.m3u"
              className="h-8 text-sm"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              disabled={isImporting}
            />
            <Button onClick={handleImportFromUrl} disabled={isImporting || !playlistUrl.trim()} size="sm" className="h-8">
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            </Button>
            <input ref={fileInputRef} type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
            <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="h-8" onClick={loadPlaylists} disabled={isLoadingList}>
            <RefreshCw className={cn('h-4 w-4', isLoadingList && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <main className="px-4 py-3">
        {/* Import messages */}
        {(importError || importSuccess) && (
          <div className="mb-3">
            {importError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {importError}
              </p>
            )}
            {importSuccess && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {importSuccess}
              </p>
            )}
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Player */}
          <div className="space-y-4">
            {!currentPlaylist || isLoadingPlaylist ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {isLoadingPlaylist ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a playlist</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {currentPlaylist.name}
                    </CardTitle>
                    <Button
                      onClick={handleMerge}
                      disabled={isMerging || currentPlaylist.stats.working === 0}
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700"
                    >
                      {isMerging ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Merge className="h-4 w-4 mr-1" />
                      )}
                      Merge {currentPlaylist.stats.working}
                    </Button>
                  </div>
                  {mergeResult && (
                    <p className="text-xs text-green-500">
                      Merged: {mergeResult.merged}, skipped: {mergeResult.skipped}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
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
                        />
                        {playerError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-500">
                            <XCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm">Playback error</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">Select a channel</p>
                      </div>
                    )}
                  </div>

                  {selectedChannel && (
                    <div className="mt-3 space-y-3">
                      {/* Status buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-500 hover:bg-green-500/10"
                          onClick={() => handleSetStatus(selectedChannel.id, 'working')}
                          disabled={updatingStatusId === selectedChannel.id || selectedChannel.status === 'merged'}
                        >
                          {updatingStatusId === selectedChannel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Working
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleSetStatus(selectedChannel.id, 'broken')}
                          disabled={updatingStatusId === selectedChannel.id || selectedChannel.status === 'merged'}
                        >
                          {updatingStatusId === selectedChannel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Broken
                        </Button>
                        <span className={cn('text-xs px-3 py-2 rounded font-medium', statusColors[selectedChannel.status])}>
                          {statusNames[selectedChannel.status]}
                        </span>
                      </div>

                      {/* Editable name */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Name:</span>
                        {editingName ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              className="h-8 text-sm flex-1"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateChannel('name', editName)
                                if (e.key === 'Escape') setEditingName(false)
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleUpdateChannel('name', editName)}
                              disabled={savingField === 'name'}
                            >
                              {savingField === 'name' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => setEditingName(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                            onClick={() => {
                              setEditName(selectedChannel.name)
                              setEditingName(true)
                            }}
                          >
                            <span className="text-sm truncate">{selectedChannel.name}</span>
                            <Edit3 className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Language selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Language:</span>
                        {savingField === 'language' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                        <select
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedChannel.language || ''}
                          disabled={savingField === 'language'}
                          onChange={(e) => handleUpdateChannel('language', e.target.value)}
                        >
                          <option value="">Not specified</option>
                          {languageOrder.map((code) => (
                            <option key={code} value={code}>
                              {languageNames[code]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Category:</span>
                        {savingField === 'group' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Tv className="h-4 w-4 text-muted-foreground" />
                        )}
                        <select
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedChannel.group || ''}
                          disabled={savingField === 'group'}
                          onChange={(e) => handleUpdateChannel('group', e.target.value)}
                        >
                          <option value="">Not specified</option>
                          {categoryOrder.map((cat) => (
                            <option key={cat} value={cat}>
                              {categoryNames[cat]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Country input */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Country:</span>
                        {savingField === 'country' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Input
                          className="flex-1 h-8 text-sm"
                          placeholder="e.g. Russia, USA, Germany..."
                          value={selectedChannel.country || ''}
                          disabled={savingField === 'country'}
                          onChange={(e) => setSelectedChannel({ ...selectedChannel, country: e.target.value || null })}
                          onBlur={(e) => {
                            const oldCountry = currentPlaylist?.channels.find(ch => ch.id === selectedChannel.id)?.country || ''
                            if (e.target.value !== oldCountry) {
                              handleUpdateChannel('country', e.target.value)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateChannel('country', (e.target as HTMLInputElement).value)
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Middle column - Channels list */}
          {!currentPlaylist || isLoadingPlaylist ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {isLoadingPlaylist ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                ) : (
                  <>
                    <Tv className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Channels will appear after selecting a playlist</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[120px]">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      className="h-7 text-xs pl-7"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    variant={selectedStatus === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setSelectedStatus('all')}
                  >
                    All ({currentPlaylist.stats.total})
                  </Button>
                  <Button
                    variant={selectedStatus === 'pending' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn('h-7 text-xs px-2', selectedStatus !== 'pending' && 'text-yellow-500')}
                    onClick={() => setSelectedStatus('pending')}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {currentPlaylist.stats.pending}
                  </Button>
                  <Button
                    variant={selectedStatus === 'working' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn('h-7 text-xs px-2', selectedStatus !== 'working' && 'text-green-500')}
                    onClick={() => setSelectedStatus('working')}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {currentPlaylist.stats.working}
                  </Button>
                  <Button
                    variant={selectedStatus === 'broken' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn('h-7 text-xs px-2', selectedStatus !== 'broken' && 'text-red-500')}
                    onClick={() => setSelectedStatus('broken')}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {currentPlaylist.stats.broken}
                  </Button>
                  <Button
                    variant={selectedStatus === 'merged' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn('h-7 text-xs px-2', selectedStatus !== 'merged' && 'text-blue-500')}
                    onClick={() => setSelectedStatus('merged')}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    {currentPlaylist.stats.merged}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No channels found
                  </div>
                ) : (
                  <div className="divide-y max-h-[calc(100vh-280px)] overflow-auto">
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
                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tv className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{channel.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {categoryNames[channel.group] || channel.group}
                            {channel.language && ` • ${languageNames[channel.language] || channel.language}`}
                            {channel.country && <span className="text-sky-400"> • {channel.country}</span>}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium shrink-0', statusColors[channel.status])}>
                          {statusNames[channel.status]}
                        </span>

                        {/* Quick actions */}
                        {channel.status !== 'merged' && (
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
                                    handleSetStatus(channel.id, 'working')
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
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Right column - Playlists */}
          <Card className="h-fit">
            <CardHeader className="pb-2 py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Playlists ({playlists.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm px-4">
                  Import a playlist using the field in the header
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-200px)] overflow-auto">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={cn(
                        'p-3 cursor-pointer transition-colors hover:bg-muted/50',
                        currentPlaylist?.id === playlist.id && 'bg-primary/10'
                      )}
                      onClick={() => loadPlaylist(playlist.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{playlist.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(playlist.importedAt).toLocaleDateString('en-US')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:bg-red-500/10 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePlaylist(playlist.id)
                          }}
                          disabled={deletingPlaylistId === playlist.id}
                        >
                          {deletingPlaylistId === playlist.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px]">
                        <span className="text-muted-foreground">{playlist.stats.total}</span>
                        <span className="text-yellow-500">{playlist.stats.pending} pend.</span>
                        <span className="text-green-500">{playlist.stats.working} work.</span>
                        <span className="text-red-500">{playlist.stats.broken} brok.</span>
                        <span className="text-blue-500">{playlist.stats.merged} merg.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
