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

  // Load channels on mount
  useEffect(() => {
    setChannels(sampleChannels)

    // Load favorites from localStorage
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('stellix-favorites')
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites)
          // Update store with saved favorites
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
    <div className="p-4">
      {/* Category tabs - visible on mobile and tablet */}
      <div className="lg:hidden mb-4">
        <div className="overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={(v) => setCategory(v as ChannelCategory)}>
            <TabsList className="inline-flex h-9 bg-muted/50">
              {channelCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs px-3 whitespace-nowrap"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Channels grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredChannels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">No channels found</p>
        </div>
      )}
    </div>
  )
}
