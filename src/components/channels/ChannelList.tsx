'use client'

import { useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { sampleChannels, channelCategories } from '@/data/channels'
import { ChannelCard } from './ChannelCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChannelCategory } from '@/types'

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
      {/* Category tabs */}
      <div className="p-3 border-b border-border/40 shrink-0">
        <div className="overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={(v) => setCategory(v as ChannelCategory)}>
            <TabsList className="inline-flex h-8 bg-muted/50">
              {channelCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs px-2.5 whitespace-nowrap"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
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
