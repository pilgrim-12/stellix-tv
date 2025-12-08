'use client'

import { useEffect, useState } from 'react'
import { useChannelStore } from '@/stores'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { sampleChannels } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Tv, CheckCircle2, XCircle, Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChannelList() {
  const {
    setChannels,
    loadChannelsFromFirebase,
    getFilteredChannels,
    searchQuery,
    setSearchQuery,
    loadDisabledChannels,
    loadCustomPlaylists,
    loadSavedFilters,
    channels,
    isLoading,
    showOnlyFavorites,
    setShowOnlyFavorites,
    favorites,
  } = useChannelStore()
  const { user } = useAuthContext()
  const { t } = useSettings()

  const [initialized, setInitialized] = useState(false)

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-auto p-1.5">
        {isLoading && !initialized ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-0.5">
              {filteredChannels.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>

            {filteredChannels.length === 0 && (
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
