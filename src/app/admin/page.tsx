'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Search,
  Tv,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
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
  GripVertical,
  Save,
  Languages,
} from 'lucide-react'
import {
  getAllCuratedChannelsRaw,
  getCuratedMetadata,
  updateChannelStatus,
  updateCuratedChannel,
  bulkDeleteChannels,
  getPlaylistSources,
  updateChannelOrder,
  migrateLanguages,
  CuratedChannel,
  PlaylistSource,
} from '@/lib/curatedChannelService'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChannelReorderModal } from '@/components/admin/ChannelReorderModal'
import { getTotalUsersCount } from '@/lib/userService'
import { getStatsSummary, resetStats } from '@/lib/firebaseQuotaTracker'
import { useAuthContext } from '@/contexts/AuthContext'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder, categoryNames, categoryOrder, ChannelStatus } from '@/types'

const statusColors: Record<ChannelStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  active: 'bg-green-500/20 text-green-500',
  inactive: 'bg-gray-500/20 text-gray-500',
  broken: 'bg-red-500/20 text-red-500',
}

const statusNames: Record<ChannelStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  inactive: 'Disabled',
  broken: 'Broken',
}

// Sortable Channel Item Component
interface SortableChannelItemProps {
  channel: CuratedChannel
  isSelected: boolean
  onClick: () => void
  onSetStatus: (status: ChannelStatus) => void
  updatingStatusId: string | null
  isDragDisabled: boolean
}

function SortableChannelItem({
  channel,
  isSelected,
  onClick,
  onSetStatus,
  updatingStatusId,
  isDragDisabled,
}: SortableChannelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: channel.id, disabled: isDragDisabled })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 border-b bg-background',
        isSelected && 'bg-primary/10',
        isDragging && 'bg-muted shadow-lg opacity-90'
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      {!isDragDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

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
          {channel.country && (
            <>
              <span>•</span>
              <span className="text-sky-400">{channel.country}</span>
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
                onSetStatus('active')
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
                onSetStatus('broken')
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuthContext()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  // Data state - now using curated_channels
  const [channels, setChannels] = useState<CuratedChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ChannelStatus | 'all'>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')

  // Delete state
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)

  // Status update loading state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [updatingNameId, setUpdatingNameId] = useState<string | null>(null)
  const [updatingLanguageId, setUpdatingLanguageId] = useState<string | null>(null)
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null)
  const [updatingCountryId, setUpdatingCountryId] = useState<string | null>(null)

  // Player state
  const [selectedChannel, setSelectedChannel] = useState<CuratedChannel | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerError, setPlayerError] = useState(false)

  // Stats - calculated from channels
  const [usersCount, setUsersCount] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<{ count: number; version: number; updatedAt: Date | null } | null>(null)

  // Playlist sources (for filtering by playlist)
  const [playlistSources, setPlaylistSources] = useState<PlaylistSource[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('all')

  // Firebase Quota Tracking
  const [quotaStats, setQuotaStats] = useState<ReturnType<typeof getStatsSummary> | null>(null)
  const [showQuotaStats, setShowQuotaStats] = useState(false)

  // Language migration state
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{ updated: number; unchanged: number } | null>(null)

  // Drag and drop state
  const [hasOrderChanged, setHasOrderChanged] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [showReorderModal, setShowReorderModal] = useState(false)

  // DnD sensors - minimal activation constraints for instant response
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
    if (!confirm('Delete this channel?')) return

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

  // Update channel name
  const handleUpdateName = async (channelId: string, newName: string) => {
    if (!newName.trim()) return
    setUpdatingNameId(channelId)
    try {
      await updateCuratedChannel(channelId, { name: newName.trim() })
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, name: newName.trim() } : ch))
      )
      if (selectedChannel?.id === channelId) {
        setSelectedChannel({ ...selectedChannel, name: newName.trim() })
      }
    } catch (error) {
      console.error('Error updating name:', error)
    } finally {
      setUpdatingNameId(null)
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

  // Update channel country
  const handleUpdateCountry = async (channelId: string, newCountry: string) => {
    setUpdatingCountryId(channelId)
    try {
      await updateCuratedChannel(channelId, { country: newCountry || null })
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, country: newCountry || null } : ch))
      )
      if (selectedChannel?.id === channelId) {
        setSelectedChannel({ ...selectedChannel, country: newCountry || null })
      }
    } catch (error) {
      console.error('Error updating country:', error)
    } finally {
      setUpdatingCountryId(null)
    }
  }

  // Migrate languages to ISO codes
  const handleMigrateLanguages = async () => {
    if (!confirm('Migrate all channel languages to ISO codes? This will update all channels with old language formats.')) return

    setIsMigrating(true)
    setMigrationResult(null)
    try {
      const result = await migrateLanguages()
      setMigrationResult(result)
      // Reload data to reflect changes
      await loadData()
    } catch (error) {
      console.error('Error migrating languages:', error)
      alert('Error migrating languages. Check console for details.')
    } finally {
      setIsMigrating(false)
    }
  }

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setChannels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
      setHasOrderChanged(true)
    }
  }

  // Save channel order to Firebase
  const handleSaveOrder = async () => {
    setIsSavingOrder(true)
    try {
      const orderedIds = channels.map((ch) => ch.id)
      await updateChannelOrder(orderedIds)
      setHasOrderChanged(false)
    } catch (error) {
      console.error('Error saving channel order:', error)
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Check if filters are active (drag disabled when filtering)
  const isFilterActive = searchQuery !== '' || selectedStatus !== 'all' || selectedLanguage !== 'all' || selectedPlaylistId !== 'all' || selectedCountry !== 'all'

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

  // Get unique countries from channels (including count of channels without country)
  const availableCountries = [...new Set(channels.map(ch => ch.country).filter(Boolean))] as string[]
  const channelsWithoutCountry = channels.filter(ch => !ch.country).length

  // Filter channels
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = !searchQuery || channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || channel.status === selectedStatus || (!channel.status && selectedStatus === 'pending')
    const matchesLanguage = selectedLanguage === 'all' || channel.language === selectedLanguage
    const matchesPlaylist = selectedPlaylistId === 'all' || channel.playlistId === selectedPlaylistId
    const matchesCountry = selectedCountry === 'all' ||
      (selectedCountry === '__none__' ? !channel.country : channel.country === selectedCountry)
    return matchesSearch && matchesStatus && matchesLanguage && matchesPlaylist && matchesCountry
  })

  const headerActions = (
    <div className="flex items-center gap-4">
      {/* Channel Stats */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Tv className="h-3 w-3 text-muted-foreground" />
          <span className="font-bold">{stats?.total ?? '—'}</span>
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
      </div>

      {/* Users count */}
      <div className="flex items-center gap-1 text-xs text-purple-500">
        <Users className="h-3 w-3" />
        <span className="font-bold">{usersCount ?? '—'}</span>
      </div>

      {/* Database info */}
      {metadata && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>v{metadata.version}</span>
        </div>
      )}

      {/* Firebase Quota Stats toggle */}
      <Button
        variant={showQuotaStats ? "secondary" : "ghost"}
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setShowQuotaStats(!showQuotaStats)}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Quota: {quotaStats?.total ?? 0}</span>
      </Button>

      {/* Migrate Languages button */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={handleMigrateLanguages}
        disabled={isMigrating}
      >
        {isMigrating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Languages className="h-3.5 w-3.5" />
        )}
        <span>Migrate</span>
      </Button>

      <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
        <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )

  return (
    <AdminLayout
      title="Channel Management"
      icon={<Tv className="h-5 w-5 text-primary" />}
      headerActions={headerActions}
    >
      <div className="p-4">
        {/* Firebase Quota Stats Panel */}
        {showQuotaStats && quotaStats && (
          <div className="mb-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Firebase Quota (today)</h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-sm gap-2 bg-purple-600 hover:bg-purple-700"
                  onClick={handleMigrateLanguages}
                  disabled={isMigrating}
                >
                  {isMigrating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  Migrate Languages
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    resetStats()
                    setQuotaStats(getStatsSummary())
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs mb-3">
              <div className="bg-muted/50 rounded p-2 text-center">
                <div className="font-bold text-lg">{quotaStats.total}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="bg-blue-500/10 rounded p-2 text-center">
                <div className="font-bold text-lg text-blue-500">{quotaStats.reads}</div>
                <div className="text-muted-foreground">Reads</div>
              </div>
              <div className="bg-green-500/10 rounded p-2 text-center">
                <div className="font-bold text-lg text-green-500">{quotaStats.writes}</div>
                <div className="text-muted-foreground">Writes</div>
              </div>
              <div className="bg-red-500/10 rounded p-2 text-center">
                <div className="font-bold text-lg text-red-500">{quotaStats.deletes}</div>
                <div className="text-muted-foreground">Deletes</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-orange-500/10 rounded p-2 text-center">
                <div className="font-bold">{quotaStats.last5Minutes}</div>
                <div className="text-muted-foreground">Last 5 min</div>
              </div>
              <div className="bg-purple-500/10 rounded p-2 text-center">
                <div className="font-bold">{quotaStats.lastHour}</div>
                <div className="text-muted-foreground">Last hour</div>
              </div>
            </div>
            {quotaStats.topFunctions.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Top functions:</h5>
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
        {/* Migration result notification */}
        {migrationResult && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
            <span className="text-green-500 font-medium">Language migration complete:</span>{' '}
            {migrationResult.updated} channels updated, {migrationResult.unchanged} unchanged
          </div>
        )}
        {/* Main content: Player + Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Player + Playlists */}
          <div className="space-y-6">
            {/* Preview Player */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Preview
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
                          <p className="text-sm">Playback error</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">Select a channel to preview</p>
                    </div>
                  )}
                </div>

                {selectedChannel && (
                  <div className="mt-3 space-y-2">
                    {/* Channel name - editable */}
                    <div className="flex items-center gap-2">
                      {updatingNameId === selectedChannel.id ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                      ) : (
                        <Tv className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <Input
                        className="flex-1 h-8 text-sm font-medium"
                        value={selectedChannel.name}
                        disabled={updatingNameId === selectedChannel.id}
                        onChange={(e) => {
                          setSelectedChannel({ ...selectedChannel, name: e.target.value })
                        }}
                        onBlur={(e) => {
                          const newName = e.target.value.trim()
                          const oldName = channels.find(ch => ch.id === selectedChannel.id)?.name || ''
                          if (newName && newName !== oldName) {
                            handleUpdateName(selectedChannel.id, newName)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium shrink-0', statusColors[selectedChannel.status || 'pending'])}>
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
                        Active
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
                        Broken
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
                        Disable
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
                        <option value="">Unknown language</option>
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
                        <option value="">Unknown category</option>
                        {categoryOrder.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryNames[cat]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Country input */}
                    <div className="flex items-center gap-2">
                      {updatingCountryId === selectedChannel.id ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4 text-sky-400" />
                      )}
                      <Input
                        className="flex-1 h-8 text-sm"
                        placeholder="Country (e.g., USA, Russia, Spain)"
                        value={selectedChannel.country || ''}
                        disabled={updatingCountryId === selectedChannel.id}
                        onChange={(e) => {
                          // Update local state immediately
                          setSelectedChannel({ ...selectedChannel, country: e.target.value || null })
                        }}
                        onBlur={(e) => {
                          // Save to Firebase on blur
                          const newCountry = e.target.value.trim()
                          const oldCountry = channels.find(ch => ch.id === selectedChannel.id)?.country || ''
                          if (newCountry !== oldCountry) {
                            handleUpdateCountry(selectedChannel.id, newCountry)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
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
                      Delete channel
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
                <CardTitle className="text-base flex items-center gap-2">
                  Channels ({filteredChannels.length} of {channels.length})
                  {hasOrderChanged && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={handleSaveOrder}
                      disabled={isSavingOrder}
                    >
                      {isSavingOrder ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Save Order
                    </Button>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isFilterActive && (
                    <span className="text-xs text-muted-foreground">
                      Drag disabled while filtering
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setShowReorderModal(true)}
                  >
                    <GripVertical className="h-3 w-3" />
                    Сортировка
                  </Button>
                </div>
              </div>
              {/* Search and filter buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[150px] max-w-[250px]">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
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
                  All
                </Button>
                <Button
                  variant={selectedStatus === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'pending' && 'text-yellow-500')}
                  onClick={() => setSelectedStatus('pending')}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Button>
                <Button
                  variant={selectedStatus === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'active' && 'text-green-500')}
                  onClick={() => setSelectedStatus('active')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Button>
                <Button
                  variant={selectedStatus === 'broken' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'broken' && 'text-red-500')}
                  onClick={() => setSelectedStatus('broken')}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Broken
                </Button>
                <Button
                  variant={selectedStatus === 'inactive' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-6 text-xs px-2', selectedStatus !== 'inactive' && 'text-gray-500')}
                  onClick={() => setSelectedStatus('inactive')}
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Off
                </Button>
                {/* Language filter */}
                {availableLanguages.length > 0 && (
                  <select
                    className="h-6 rounded-md border border-input bg-background px-2 text-xs"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="all">All languages</option>
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {languageNames[lang] || lang}
                      </option>
                    ))}
                  </select>
                )}
                {/* Country filter */}
                <select
                  className="h-6 rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="all">All countries</option>
                  <option value="__none__">⚠️ No country ({channelsWithoutCountry})</option>
                  {availableCountries.sort().map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading channels...</span>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Import a playlist to add channels
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No channels match the filters
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={filteredChannels.map((ch) => ch.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="max-h-[600px] overflow-auto">
                      {filteredChannels.map((channel) => (
                        <SortableChannelItem
                          key={channel.id}
                          channel={channel}
                          isSelected={selectedChannel?.id === channel.id}
                          onClick={() => playChannel(channel)}
                          onSetStatus={(status) => handleSetStatus(channel.id, status)}
                          updatingStatusId={updatingStatusId}
                          isDragDisabled={isFilterActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Channel Reorder Modal */}
      <ChannelReorderModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        channels={channels}
        onSave={async (orderedIds) => {
          await updateChannelOrder(orderedIds)
          // Update local state to reflect the new order
          const orderMap = new Map<string, number>()
          orderedIds.forEach((id, index) => orderMap.set(id, index))
          setChannels((prev) => {
            const updated = prev.map((ch) => ({
              ...ch,
              order: orderMap.get(ch.id) ?? ch.order,
            }))
            return updated.sort((a, b) => {
              const orderA = a.order ?? Number.MAX_SAFE_INTEGER
              const orderB = b.order ?? Number.MAX_SAFE_INTEGER
              return orderA - orderB
            })
          })
        }}
      />
    </AdminLayout>
  )
}
