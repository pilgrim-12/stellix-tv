'use client'

import { useEffect, useState, useRef, CSSProperties, ReactElement, useMemo } from 'react'
import { List, ListImperativeAPI } from 'react-window'
import { useChannelStore } from '@/stores'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { sampleChannels } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Tv, CheckCircle2, XCircle, Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Channel } from '@/types'

const ITEM_HEIGHT = 66 // p-2 (16px) + h-12 (48px) + gap (2px)

// Custom row props type
interface ChannelRowProps {
  channels: Channel[]
}

// Row component for virtualized list
function RowComponent(props: {
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" }
  index: number
  style: CSSProperties
} & ChannelRowProps): ReactElement {
  const { index, style, channels } = props
  const channel = channels[index]
  return (
    <div style={style}>
      <ChannelCard channel={channel} />
    </div>
  )
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
  const isLoading = useChannelStore((state) => state.isLoading)
  const showOnlyFavorites = useChannelStore((state) => state.showOnlyFavorites)
  const setShowOnlyFavorites = useChannelStore((state) => state.setShowOnlyFavorites)
  const favorites = useChannelStore((state) => state.favorites)
  const currentChannel = useChannelStore((state) => state.currentChannel)

  const { user } = useAuthContext()
  const { t } = useSettings()

  const [initialized, setInitialized] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
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
            const currentFavorites = useChannelStore.getState().favorites
            parsed.forEach((id: string) => {
              if (!currentFavorites.includes(id)) {
                useChannelStore.getState().toggleFavorite(id)
              }
            })
          } catch {
            // Invalid JSON, ignore
          }
        }

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

  const filteredChannels = getFilteredChannels()

  // Scroll to current channel when it changes
  useEffect(() => {
    if (currentChannel && listRef.current && filteredChannels.length > 0) {
      const index = filteredChannels.findIndex(ch => ch.id === currentChannel.id)
      if (index !== -1) {
        listRef.current.scrollToRow({ index, align: 'smart' })
      }
    }
  }, [currentChannel, filteredChannels, listRef])

  // Статистика каналов
  const totalChannels = filteredChannels.length
  const offlineCount = filteredChannels.filter(ch => ch.isOffline).length
  const onlineCount = totalChannels - offlineCount

  return (
    <div className="h-full flex flex-col">
      {/* Stats + Favorites toggle */}
      <div className="px-2 py-1.5 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Tv className="h-3 w-3" />
              <span>{totalChannels}</span>
            </div>
            {/* Favorites toggle button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-5 px-1.5 text-[10px] gap-1',
                showOnlyFavorites
                  ? 'text-yellow-500 bg-yellow-500/10'
                  : 'text-muted-foreground hover:text-yellow-500'
              )}
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites, user?.uid)}
            >
              <Star className={cn('h-3 w-3', showOnlyFavorites && 'fill-current')} />
              {favorites.length > 0 && <span>{favorites.length}</span>}
            </Button>
          </div>
          {offlineCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-3 w-3" />
                <span>{onlineCount}</span>
              </div>
              <div className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" />
                <span>{offlineCount}</span>
              </div>
            </div>
          )}
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
      <div className="flex-1 overflow-hidden">
        {isLoading && !initialized ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {filteredChannels.length > 0 ? (
              <List<ChannelRowProps>
                listRef={listRef}
                rowCount={filteredChannels.length}
                rowHeight={ITEM_HEIGHT}
                rowComponent={RowComponent}
                rowProps={{ channels: filteredChannels }}
                className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                style={{ padding: '6px' }}
              />
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
