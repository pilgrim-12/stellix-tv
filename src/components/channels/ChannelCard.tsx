'use client'

import { useState } from 'react'
import { Channel, languageNames } from '@/types'
import { useChannelStore } from '@/stores'
import { Card } from '@/components/ui/card'
import { Star, WifiOff, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChannelCardProps {
  channel: Channel
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { currentChannel, setCurrentChannel, favorites, toggleFavorite } = useChannelStore()
  const isActive = currentChannel?.id === channel.id
  const isFavorite = favorites.includes(channel.id)
  const isOffline = channel.isOffline
  const [imgError, setImgError] = useState(false)

  return (
    <Card
      className={cn(
        'channel-card relative cursor-pointer p-2 flex items-center gap-3',
        'hover:bg-muted/50 transition-colors',
        isActive && 'bg-primary/10 border-primary',
        isOffline && 'opacity-50'
      )}
      onClick={() => setCurrentChannel(channel)}
    >
      {/* Channel logo */}
      <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded bg-muted/50 overflow-hidden">
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="h-8 w-8 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">
            {channel.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Channel info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium truncate">{channel.name}</h3>
          {isActive && !isOffline && (
            <Radio className="h-3 w-3 text-red-500 shrink-0 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize truncate">
          {channel.group}
          {channel.language && ` • ${languageNames[channel.language] || channel.language.toUpperCase()}`}
        </p>
      </div>

      {/* Status indicators */}
      <div className="shrink-0 flex items-center gap-1">
        {isOffline && (
          <WifiOff className="h-4 w-4 text-red-400" />
        )}
        <button
          className={cn(
            'rounded-full p-1 transition-colors hover:bg-muted',
            isFavorite ? 'text-yellow-500' : 'text-muted-foreground/50'
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(channel.id)
          }}
        >
          <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </button>
      </div>
    </Card>
  )
}
