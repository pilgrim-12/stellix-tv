'use client'

import { useEffect, useState, useRef, useCallback, useMemo, CSSProperties, ReactElement } from 'react'
import { List, ListImperativeAPI } from 'react-window'
import { useChannelStore } from '@/stores'
import { GroupByMode } from '@/stores/channelStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { sampleChannels } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Tv, CheckCircle2, XCircle, Loader2, Star, History, GripVertical, Layers } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Channel, languageNames } from '@/types'

const ITEM_HEIGHT = 66 // p-2 (16px) + h-12 (48px) + gap (2px)
const HEADER_HEIGHT = 32

type ListItem = { type: 'header'; label: string; count: number } | { type: 'channel'; channel: Channel }

// Custom row props type
interface GroupedRowProps {
  items: ListItem[]
}

// Row component for virtualized list (channels + group headers)
function RowComponent(props: {
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" }
  index: number
  style: CSSProperties
} & GroupedRowProps): ReactElement {
  const { index, style, items } = props
  const item = items[index]
  if (item.type === 'header') {
    return (
      <div style={style} className="flex items-center gap-2 px-3 pt-1">
        <span className="text-[11px] font-semibold text-muted-foreground truncate">{item.label}</span>
        <span className="text-[10px] text-muted-foreground/60">{item.count}</span>
        <div className="flex-1 border-b border-border/30" />
      </div>
    )
  }
  return (
    <div style={style}>
      <ChannelCard channel={item.channel} />
    </div>
  )
}

function buildGroupedList(channels: Channel[], groupBy: GroupByMode): ListItem[] {
  if (groupBy === 'none') {
    return channels.map(ch => ({ type: 'channel', channel: ch }))
  }
  const groups = new Map<string, Channel[]>()
  for (const ch of channels) {
    const key = groupBy === 'language'
      ? (ch.language || 'unknown')
      : (ch.country || 'Unknown')
    let arr = groups.get(key)
    if (!arr) { arr = []; groups.set(key, arr) }
    arr.push(ch)
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  const result: ListItem[] = []
  for (const [key, chs] of sorted) {
    const label = groupBy === 'language'
      ? (languageNames[key] || key)
      : key
    result.push({ type: 'header', label, count: chs.length })
    for (const ch of chs) result.push({ type: 'channel', channel: ch })
  }
  return result
}

export function ChannelList() {
  // Use individual selectors to prevent unnecessary re-renders
  const setChannels = useChannelStore((state) => state.setChannels)
  const loadChannelsFromFirebase = useChannelStore((state) => state.loadChannelsFromFirebase)
  const getFilteredChannels = useChannelStore((state) => state.getFilteredChannels)
  const searchQuery = useChannelStore((state) => state.searchQuery)
  const setSearchQuery = useChannelStore((state) => state.setSearchQuery)
  const loadDisabledChannels = useChannelStore((state) => state.loadDisabledChannels)
  const loadCustomPlaylists = useChannelStore((state) => state.loadCustomPlaylists)
  const loadSavedFilters = useChannelStore((state) => state.loadSavedFilters)
  const loadWatchHistory = useChannelStore((state) => state.loadWatchHistory)
  const initLanguageFromGeo = useChannelStore((state) => state.initLanguageFromGeo)
  const setLanguage = useChannelStore((state) => state.setLanguage)
  const setCategory = useChannelStore((state) => state.setCategory)
  const isLoading = useChannelStore((state) => state.isLoading)
  const isRefreshing = useChannelStore((state) => state.isRefreshing)
  const showOnlyFavorites = useChannelStore((state) => state.showOnlyFavorites)
  const setShowOnlyFavorites = useChannelStore((state) => state.setShowOnlyFavorites)
  const favorites = useChannelStore((state) => state.favorites)
  const currentChannel = useChannelStore((state) => state.currentChannel)
  const watchHistory = useChannelStore((state) => state.watchHistory)
  const getRecentChannels = useChannelStore((state) => state.getRecentChannels)

  const setFavoriteOrder = useChannelStore((state) => state.setFavoriteOrder)
  const loadFavoriteOrder = useChannelStore((state) => state.loadFavoriteOrder)
  const groupBy = useChannelStore((state) => state.groupBy)
  const setGroupBy = useChannelStore((state) => state.setGroupBy)

  const { user } = useAuthContext()
  const { t } = useSettings()

  const [initialized, setInitialized] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [showRecentChannels, setShowRecentChannels] = useState(false)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const listRef = useRef<ListImperativeAPI>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search query updates to store (150ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(localSearchQuery)
    }, 150)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [localSearchQuery, setSearchQuery])

  // Sync local state if store changes externally
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const initChannels = async () => {
      loadDisabledChannels()
      loadCustomPlaylists()
      loadSavedFilters()
      loadWatchHistory()

      // Check URL params for lang/category (from landing page links)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const langParam = params.get('lang')
        const categoryParam = params.get('category')

        if (langParam) {
          // Set language from URL param (this saves as manual choice)
          setLanguage(langParam)
        } else {
          // Initialize language from geo-detection (async, non-blocking)
          // This will only run if no manual preference exists
          initLanguageFromGeo()
        }

        if (categoryParam) {
          setCategory(categoryParam as import('@/types').ChannelCategory)
        }
      } else {
        // Fallback: Initialize language from geo-detection
        initLanguageFromGeo()
      }

      // Try loading from Firebase first
      try {
        await loadChannelsFromFirebase()
        const { channels: loadedChannels } = useChannelStore.getState()

        // If no channels from Firebase, use sample channels as fallback
        if (loadedChannels.length === 0) {
          setChannels(sampleChannels)
        }
      } catch {
        // Firebase failed, use sample channels
        setChannels(sampleChannels)
      }

      // Load favorites and settings from localStorage
      if (typeof window !== 'undefined') {
        const savedFavorites = localStorage.getItem('stellix-favorites')
        if (savedFavorites) {
          try {
            const parsed = JSON.parse(savedFavorites)
            if (Array.isArray(parsed)) {
              useChannelStore.setState({ favorites: parsed })
            }
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Load favorite order AFTER favorites are loaded (to avoid corruption)
        loadFavoriteOrder()

        // Load showOnlyFavorites setting
        const savedShowFavorites = localStorage.getItem('stellix-show-only-favorites')
        if (savedShowFavorites) {
          try {
            const parsed = JSON.parse(savedShowFavorites)
            if (typeof parsed === 'boolean') {
              useChannelStore.setState({ showOnlyFavorites: parsed })
            }
          } catch {
            // Invalid JSON, ignore
          }
        }
      }

      setInitialized(true)
    }

    initChannels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get channels based on current mode
  const recentChannels = getRecentChannels()
  const filteredChannels = showRecentChannels ? recentChannels : getFilteredChannels()

  // Drag handlers for favorites reordering
  const handleFavDragStart = useCallback((channelId: string, e: React.DragEvent) => {
    setDragSourceId(channelId)
    e.dataTransfer.effectAllowed = 'move'
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }, [])

  const handleFavDragOver = useCallback((channelId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(channelId)
  }, [])

  const handleFavDrop = useCallback((targetId: string) => {
    if (!dragSourceId || dragSourceId === targetId) {
      setDragSourceId(null)
      setDragOverId(null)
      return
    }
    const currentOrder = filteredChannels.map(ch => ch.id)
    const sourceIdx = currentOrder.indexOf(dragSourceId)
    const targetIdx = currentOrder.indexOf(targetId)
    if (sourceIdx === -1 || targetIdx === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(sourceIdx, 1)
    newOrder.splice(targetIdx, 0, dragSourceId)
    setFavoriteOrder(newOrder)
    setDragSourceId(null)
    setDragOverId(null)
  }, [dragSourceId, filteredChannels, setFavoriteOrder])

  const handleFavDragEnd = useCallback(() => {
    setDragSourceId(null)
    setDragOverId(null)
  }, [])

  // Build grouped list for virtualized rendering
  const activeGroupBy = (showOnlyFavorites || showRecentChannels) ? 'none' as GroupByMode : groupBy
  const groupedItems = useMemo(
    () => buildGroupedList(filteredChannels, activeGroupBy),
    [filteredChannels, activeGroupBy]
  )

  const getRowHeight = useCallback((index: number) => {
    return groupedItems[index]?.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT
  }, [groupedItems])

  // Scroll to current channel when it changes
  useEffect(() => {
    if (currentChannel && listRef.current && filteredChannels.length > 0) {
      if (activeGroupBy === 'none') {
        const index = filteredChannels.findIndex(ch => ch.id === currentChannel.id)
        if (index !== -1) {
          listRef.current.scrollToRow({ index, align: 'smart' })
        }
      } else {
        const index = groupedItems.findIndex(item => item.type === 'channel' && item.channel.id === currentChannel.id)
        if (index !== -1) {
          listRef.current.scrollToRow({ index, align: 'smart' })
        }
      }
    }
  }, [currentChannel, filteredChannels, groupedItems, activeGroupBy, listRef])

  // Статистика каналов
  const totalChannels = filteredChannels.length
  const offlineCount = filteredChannels.filter(ch => ch.isOffline).length
  const onlineCount = totalChannels - offlineCount

  const groupByLabel = groupBy === 'country' ? (t('byCountry') || 'By country')
    : groupBy === 'language' ? (t('byLanguage') || 'By language')
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Stats + Favorites toggle */}
      <div className="px-2 py-1.5 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Tv className="h-3 w-3" />
              )}
              <span>{totalChannels}</span>
            </div>
            {/* Favorites toggle button - only for logged in users */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-5 px-1.5 text-[10px] gap-1',
                  showOnlyFavorites
                    ? 'text-yellow-500 bg-yellow-500/10'
                    : 'text-muted-foreground hover:text-yellow-500'
                )}
                onClick={() => {
                  if (showRecentChannels) setShowRecentChannels(false)
                  setShowOnlyFavorites(!showOnlyFavorites, user?.uid)
                }}
              >
                <Star className={cn('h-3 w-3', showOnlyFavorites && 'fill-current')} />
                {favorites.length > 0 && <span>{favorites.length}</span>}
              </Button>
            )}
            {/* Recent channels toggle button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-5 px-1.5 text-[10px] gap-1',
                showRecentChannels
                  ? 'text-blue-500 bg-blue-500/10'
                  : 'text-muted-foreground hover:text-blue-500'
              )}
              onClick={() => {
                if (showOnlyFavorites) setShowOnlyFavorites(false, user?.uid)
                setShowRecentChannels(!showRecentChannels)
              }}
            >
              <History className="h-3 w-3" />
              {watchHistory.length > 0 && <span>{watchHistory.length}</span>}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {offlineCount > 0 && (
              <>
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{onlineCount}</span>
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" />
                  <span>{offlineCount}</span>
                </div>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-5 px-1.5 text-[10px] gap-1',
                    groupBy !== 'none'
                      ? 'text-purple-500 bg-purple-500/10'
                      : 'text-muted-foreground hover:text-purple-500'
                  )}
                >
                  <Layers className="h-3 w-3" />
                  {groupByLabel && <span>{groupByLabel}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuRadioGroup value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByMode)}>
                  <DropdownMenuRadioItem value="none" className="text-xs">{t('noGrouping') || 'No grouping'}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="country" className="text-xs">{t('byCountry') || 'By country'}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="language" className="text-xs">{t('byLanguage') || 'By language'}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('searchChannels')}
            className="pl-8 h-8 text-sm bg-muted/50"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading && !initialized ? (
          <div className="p-1.5 space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg p-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="shrink-0 h-12 w-12 rounded-md" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredChannels.length > 0 ? (
              showOnlyFavorites ? (
                /* Plain scrollable list with drag-and-drop for favorites */
                <div className="h-full overflow-auto p-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {filteredChannels.map((channel) => (
                    <div
                      key={channel.id}
                      draggable
                      onDragStart={(e) => handleFavDragStart(channel.id, e)}
                      onDragOver={(e) => handleFavDragOver(channel.id, e)}
                      onDrop={() => handleFavDrop(channel.id)}
                      onDragEnd={handleFavDragEnd}
                      className={cn(
                        'relative flex items-center transition-all duration-150',
                        dragSourceId === channel.id && 'opacity-40',
                        dragOverId === channel.id && dragSourceId !== channel.id && 'border-t-2 border-primary'
                      )}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing px-0.5 text-muted-foreground/40 hover:text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 pl-4">
                        <ChannelCard channel={channel} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <List<GroupedRowProps>
                  listRef={listRef}
                  rowCount={groupedItems.length}
                  rowHeight={activeGroupBy === 'none' ? ITEM_HEIGHT : getRowHeight}
                  rowComponent={RowComponent}
                  rowProps={{ items: groupedItems }}
                  className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                  style={{ padding: '6px' }}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">{t('noChannelsFound')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
