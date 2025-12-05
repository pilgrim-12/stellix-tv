'use client'

import { useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { sampleChannels, channelCategories } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChannelCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export function ChannelList() {
  const {
    setChannels,
    selectedCategory,
    setCategory,
    getFilteredChannels,
    favorites,
    searchQuery,
    setSearchQuery,
  } = useChannelStore()

  useEffect(() => {
    setChannels(sampleChannels)

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
  }, [setChannels, favorites])

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

      {/* Category buttons - horizontal scroll */}
      <div className="p-2 border-b border-border/40 shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {channelCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 text-xs px-3 whitespace-nowrap',
                selectedCategory === category.id && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setCategory(category.id as ChannelCategory)}
            >
              {category.name}
            </Button>
          ))}
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
