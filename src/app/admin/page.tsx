'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  Tv,
  ArrowLeft,
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
  FolderOpen,
  Copy,
  GripVertical,
  Save,
} from 'lucide-react'
import {
  getAllCuratedChannelsRaw,
  getCuratedMetadata,
  updateChannelStatus,
  updateCuratedChannel,
  bulkDeleteChannels,
  getPlaylistSources,
  findDuplicateChannels,
  setPrimaryChannel,
  updateChannelOrder,
  CuratedChannel,
  PlaylistSource,
  DuplicateInfo,
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
import { DuplicateManagementModal } from '@/components/admin/DuplicateManagementModal'
import { ChannelReorderModal } from '@/components/admin/ChannelReorderModal'
import { getTotalUsersCount } from '@/lib/userService'
import { getStatsSummary, resetStats } from '@/lib/firebaseQuotaTracker'
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
  const router = useRouter()
  const { user, isAdmin, loading } = useAuthContext()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  // Data state - now using curated_channels
  const [channels, setChannels] = useState<CuratedChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ChannelStatus | 'all'>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')

  // Delete state
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)

  // Status update loading state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
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

  // Duplicates state
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false)
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateInfo | null>(null)
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)

  // Channel health check state
  const [isCheckingChannels, setIsCheckingChannels] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ checked: 0, total: 0, broken: 0 })
  const [brokenChannels, setBrokenChannels] = useState<string[]>([])
  const [selectedBrokenIds, setSelectedBrokenIds] = useState<Set<string>>(new Set())
  const [showBrokenModal, setShowBrokenModal] = useState(false)
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null)
  const brokenVideoRef = useRef<HTMLVideoElement>(null)
  const brokenHlsRef = useRef<{ destroy: () => void } | null>(null)
  const checkAbortRef = useRef(false)

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

  // Find duplicates
  const handleFindDuplicates = async () => {
    setIsLoadingDuplicates(true)
    try {
      const found = await findDuplicateChannels(playlistSources)
      setDuplicates(found)
    } catch (error) {
      console.error('Error finding duplicates:', error)
    } finally {
      setIsLoadingDuplicates(false)
    }
  }

  // Handle duplicate management
  const handleDuplicateApply = async (primaryId: string | null, idsToDeactivate: string[], type: 'name' | 'url') => {
    // Deactivate duplicates (set status to inactive) for both URL and name duplicates
    if (idsToDeactivate.length > 0) {
      const { bulkUpdateStatus } = await import('@/lib/curatedChannelService')
      await bulkUpdateStatus(idsToDeactivate, 'inactive', user?.email || undefined)
    }
    // Set primary for both types
    await setPrimaryChannel(primaryId, [])
    // Refresh duplicates list
    await handleFindDuplicates()
    // Reload channels to reflect changes
    await loadData()
  }

  // Check all channels for broken URLs
  const handleCheckChannels = async () => {
    // Only check active channels
    const activeChannels = channels.filter(ch => ch.status === 'active')
    if (activeChannels.length === 0) return

    setIsCheckingChannels(true)
    checkAbortRef.current = false
    setCheckProgress({ checked: 0, total: activeChannels.length, broken: 0 })
    setBrokenChannels([])

    const broken: string[] = []
    const BATCH_SIZE = 5 // Check 5 channels at a time

    try {
      for (let i = 0; i < activeChannels.length; i += BATCH_SIZE) {
        if (checkAbortRef.current) break

        const batch = activeChannels.slice(i, i + BATCH_SIZE)
        const batchData = batch.map(ch => ({ id: ch.id, url: ch.url }))

        try {
          const response = await fetch('/api/check-channel', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channels: batchData }),
          })

          if (response.ok) {
            const { results } = await response.json()
            for (const result of results) {
              if (!result.online) {
                broken.push(result.id)
              }
            }
          }
        } catch (error) {
          console.error('Error checking batch:', error)
        }

        setCheckProgress({
          checked: Math.min(i + BATCH_SIZE, activeChannels.length),
          total: activeChannels.length,
          broken: broken.length,
        })
        setBrokenChannels([...broken])

        // Small delay between batches to not overload
        if (i + BATCH_SIZE < activeChannels.length && !checkAbortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    } finally {
      setIsCheckingChannels(false)
    }
  }

  // Stop checking channels
  const handleStopCheck = () => {
    checkAbortRef.current = true
  }

  // Open broken channels modal
  const handleOpenBrokenModal = () => {
    // Select all broken channels by default
    setSelectedBrokenIds(new Set(brokenChannels))
    setPreviewChannelId(null)
    setShowBrokenModal(true)
  }

  // Preview channel in broken modal
  const playBrokenPreview = async (channel: CuratedChannel) => {
    // Cleanup previous HLS instance
    if (brokenHlsRef.current) {
      brokenHlsRef.current.destroy()
      brokenHlsRef.current = null
    }

    setPreviewChannelId(channel.id)

    if (!brokenVideoRef.current) return

    if (channel.url.includes('.m3u8')) {
      const Hls = (await import('hls.js')).default
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        brokenHlsRef.current = hls
        hls.loadSource(channel.url)
        hls.attachMedia(brokenVideoRef.current)
      } else if (brokenVideoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        brokenVideoRef.current.src = channel.url
      }
    } else {
      brokenVideoRef.current.src = channel.url
    }
  }

  // Toggle broken channel selection
  const toggleBrokenSelection = (id: string) => {
    setSelectedBrokenIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select/deselect all broken channels
  const toggleAllBroken = () => {
    if (selectedBrokenIds.size === brokenChannels.length) {
      setSelectedBrokenIds(new Set())
    } else {
      setSelectedBrokenIds(new Set(brokenChannels))
    }
  }

  // Mark selected broken channels
  const handleMarkSelectedBroken = async () => {
    if (selectedBrokenIds.size === 0) return

    try {
      const { bulkUpdateStatus } = await import('@/lib/curatedChannelService')
      await bulkUpdateStatus(Array.from(selectedBrokenIds), 'broken', user?.email || undefined)
      // Remove marked channels from brokenChannels list
      setBrokenChannels(prev => prev.filter(id => !selectedBrokenIds.has(id)))
      setSelectedBrokenIds(new Set())
      setShowBrokenModal(false)
      setCheckProgress({ checked: 0, total: 0, broken: 0 })
      await loadData()
    } catch (error) {
      console.error('Error marking channels as broken:', error)
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
  const isFilterActive = searchQuery !== '' || selectedStatus !== 'all' || selectedLanguage !== 'all' || selectedPlaylistId !== 'all'

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
            <h1 className="text-lg font-semibold">Channel Management</h1>
          </div>

          {/* Stats in header */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Channel Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Tv className="h-3 w-3 text-muted-foreground" />
                <span className="font-bold">{stats?.total ?? '—'}</span>
                <span className="text-muted-foreground">channels</span>
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
              <span className="text-muted-foreground">users</span>
            </div>

            {/* Database info */}
            {metadata && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3 w-3" />
                <span>v{metadata.version}</span>
                {metadata.updatedAt && (
                  <span>• {metadata.updatedAt.toLocaleString('en-US')}</span>
                )}
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
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => router.push('/admin/staging')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Staging
            </Button>
            <Button variant="default" size="sm" onClick={() => router.push('/admin/users')}>
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Firebase Quota Stats Panel */}
        {showQuotaStats && quotaStats && (
          <div className="container border-t py-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Firebase Quota (today)</h4>
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
      </header>

      <main className="container py-4">
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

            {/* Duplicates Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Duplicates
                    {duplicates.length > 0 && (
                      <span className="text-sm font-normal text-orange-500">
                        ({duplicates.length} groups)
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFindDuplicates}
                    disabled={isLoadingDuplicates}
                  >
                    {isLoadingDuplicates ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-1">Find</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {duplicates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isLoadingDuplicates ? 'Searching...' : 'Click "Find" to search for duplicates'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {duplicates.map((dup) => (
                      <div
                        key={`${dup.type}-${dup.normalizedName}`}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
                          dup.type === 'url' && 'border-red-500/30 bg-red-500/5'
                        )}
                        onClick={() => {
                          setSelectedDuplicate(dup)
                          setShowDuplicatesModal(true)
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{dup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dup.count} sources • {dup.type === 'url' ? 'Same URL' : 'Same name'}
                          </p>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          dup.type === 'url'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-orange-500/20 text-orange-500'
                        )}>
                          x{dup.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel Health Check Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Health Check
                    {brokenChannels.length > 0 && (
                      <span className="text-sm font-normal text-red-500">
                        ({brokenChannels.length} broken)
                      </span>
                    )}
                  </CardTitle>
                  {!isCheckingChannels ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckChannels}
                      disabled={channels.filter(ch => ch.status === 'active').length === 0}
                    >
                      <Play className="h-4 w-4" />
                      <span className="ml-1">Check All</span>
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopCheck}
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-1">Stop</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isCheckingChannels || checkProgress.total > 0 ? (
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Checking channels...</span>
                        <span>{checkProgress.checked} / {checkProgress.total}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(checkProgress.checked / checkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-500">
                        ✓ {checkProgress.checked - checkProgress.broken} online
                      </span>
                      <span className="text-red-500">
                        ✗ {checkProgress.broken} broken
                      </span>
                    </div>

                    {/* View broken channels button */}
                    {!isCheckingChannels && brokenChannels.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={handleOpenBrokenModal}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        View {brokenChannels.length} broken channels
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click &quot;Check All&quot; to verify channel URLs
                  </p>
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

      </main>

      {/* Duplicate Management Modal */}
      <DuplicateManagementModal
        isOpen={showDuplicatesModal}
        onClose={() => {
          setShowDuplicatesModal(false)
          setSelectedDuplicate(null)
        }}
        duplicate={selectedDuplicate}
        channelsData={channels}
        onApply={handleDuplicateApply}
      />

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

      {/* Broken Channels Modal */}
      <Dialog open={showBrokenModal} onOpenChange={(open) => {
        if (!open && brokenHlsRef.current) {
          brokenHlsRef.current.destroy()
          brokenHlsRef.current = null
        }
        setShowBrokenModal(open)
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Broken Channels ({brokenChannels.length})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Channel list */}
            <div className="flex flex-col overflow-hidden border rounded-lg">
              {/* Select all */}
              <div
                className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 shrink-0"
                onClick={toggleAllBroken}
              >
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  selectedBrokenIds.size === brokenChannels.length && brokenChannels.length > 0
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                )}>
                  {selectedBrokenIds.size === brokenChannels.length && brokenChannels.length > 0 && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm">
                  Select all ({selectedBrokenIds.size} / {brokenChannels.length})
                </span>
              </div>

              {/* Channel list */}
              <div className="flex-1 overflow-auto">
                <div className="space-y-1 p-2">
                  {brokenChannels.map(id => {
                    const channel = channels.find(ch => ch.id === id)
                    if (!channel) return null
                    const isSelected = selectedBrokenIds.has(id)
                    const isPreviewing = previewChannelId === id

                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                          isPreviewing && 'ring-2 ring-blue-500',
                          isSelected
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-border hover:bg-muted/50'
                        )}
                        onClick={() => toggleBrokenSelection(id)}
                      >
                        {/* Checkbox */}
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'border-red-500 bg-red-500'
                            : 'border-muted-foreground'
                        )}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>

                        {/* Logo */}
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tv className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{channel.name}</p>
                        </div>

                        {/* Test button */}
                        <Button
                          variant={isPreviewing ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            playBrokenPreview(channel)
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: Preview player */}
            <div className="flex flex-col gap-2">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {previewChannelId ? (
                  <video
                    ref={brokenVideoRef}
                    className="w-full h-full"
                    controls
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click Play to test channel</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview channel info */}
              {previewChannelId && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  {(() => {
                    const channel = channels.find(ch => ch.id === previewChannelId)
                    if (!channel) return null
                    return (
                      <>
                        <p className="font-medium">{channel.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {channel.url}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toggleBrokenSelection(previewChannelId)
                            }}
                          >
                            {selectedBrokenIds.has(previewChannelId) ? 'Deselect' : 'Select'}
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowBrokenModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkSelectedBroken}
              disabled={selectedBrokenIds.size === 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark {selectedBrokenIds.size} as broken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
