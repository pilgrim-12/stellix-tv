'use client'

import { Channel } from '@/types'
import { useChannelStore } from '@/stores'
import { Card } from '@/components/ui/card'
import { Star, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChannelCardProps {
  channel: Channel
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { currentChannel, setCurrentChannel, favorites, toggleFavorite } = useChannelStore()
  const isActive = currentChannel?.id === channel.id
  const isFavorite = favorites.includes(channel.id)
  const isOffline = channel.isOffline

  return (
    <Card
      className={cn(
        'channel-card relative cursor-pointer overflow-hidden p-3',
        'hover:border-primary/50',
        isActive && 'border-primary ring-1 ring-primary',
        isOffline && 'opacity-50'
      )}
      onClick={() => setCurrentChannel(channel)}
    >
      {/* Offline indicator */}
      {isOffline && (
        <div className="absolute left-2 top-2 z-10">
          <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
            <WifiOff className="h-3 w-3" />
            Offline
          </span>
        </div>
      )}

      {/* Favorite button */}
      <button
        className={cn(
          'absolute right-2 top-2 z-10 rounded-full p-1 transition-colors',
          'hover:bg-muted',
          isFavorite ? 'text-yellow-500' : 'text-muted-foreground'
        )}
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(channel.id)
        }}
      >
        <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
      </button>

      {/* Channel logo */}
      <div className="mb-2 flex h-12 w-full items-center justify-center rounded bg-muted/50">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="h-10 w-auto max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <span className="text-2xl font-bold text-muted-foreground">
            {channel.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Channel info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">
          {channel.name}
        </h3>
        <p className="text-xs text-muted-foreground capitalize">
          {channel.group}
        </p>
      </div>

      {/* Live indicator for active channel */}
      {isActive && !isOffline && (
        <div className="absolute bottom-2 right-2">
          <span className="live-indicator inline-flex items-center gap-1 text-xs font-medium text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            LIVE
          </span>
        </div>
      )}
    </Card>
  )
}
