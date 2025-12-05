'use client'

import { useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { sampleChannels } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function ChannelList() {
  const {
    setChannels,
    getFilteredChannels,
    favorites,
    searchQuery,
    setSearchQuery,
    loadDisabledChannels,
  } = useChannelStore()

  useEffect(() => {
    setChannels(sampleChannels)
    loadDisabledChannels()

    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('stellix-favorites')
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites)
          parsed.forEach((id: string) => {
            if (!favorites.includes(id)) {
              useChannelStore.getState().toggleFavorite(id)
            }
          })
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [setChannels, favorites, loadDisabledChannels])

  const filteredChannels = getFilteredChannels()

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-2 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск каналов..."
            className="pl-8 h-8 text-sm bg-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-auto p-1.5">
        <div className="space-y-0.5">
          {filteredChannels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Каналы не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
