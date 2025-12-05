'use client'

import { useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { sampleChannels, channelCategories } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Button } from '@/components/ui/button'
import { ChannelCategory } from '@/types'
import { cn } from '@/lib/utils'

export function ChannelList() {
  const {
    setChannels,
    selectedCategory,
    setCategory,
    getFilteredChannels,
    favorites,
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
      {/* Category buttons - grid layout */}
      <div className="p-2 border-b border-border/40 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {channelCategories.slice(0, 8).map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 text-xs px-2',
                selectedCategory === category.id && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setCategory(category.id as ChannelCategory)}
            >
              {category.name}
            </Button>
          ))}
        </div>
        {channelCategories.length > 8 && (
          <div className="grid grid-cols-4 gap-1 mt-1">
            {channelCategories.slice(8).map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 text-xs px-2',
                  selectedCategory === category.id && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setCategory(category.id as ChannelCategory)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {filteredChannels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No channels found</p>
          </div>
        )}
      </div>
    </div>
  )
}
