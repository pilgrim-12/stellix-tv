'use client'

import { useState, memo } from 'react'
import { Channel, languageNames } from '@/types'
import { useChannelStore } from '@/stores'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Star, WifiOff, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChannelCardProps {
  channel: Channel
}

const labelColors: Record<string, string> = {
  HD: 'bg-blue-500/20 text-blue-400',
  '4K': 'bg-purple-500/20 text-purple-400',
  Live: 'bg-red-500/20 text-red-400',
  New: 'bg-green-500/20 text-green-400',
  Premium: 'bg-yellow-500/20 text-yellow-400',
  Free: 'bg-emerald-500/20 text-emerald-400',
}

export const ChannelCard = memo(function ChannelCard({ channel }: ChannelCardProps) {
  const currentChannel = useChannelStore((state) => state.currentChannel)
  const setCurrentChannel = useChannelStore((state) => state.setCurrentChannel)
  const favorites = useChannelStore((state) => state.favorites)
  const toggleFavorite = useChannelStore((state) => state.toggleFavorite)
  const { user } = useAuthContext()
  const { getCategoryName } = useSettings()
  const isActive = currentChannel?.id === channel.id
  const isFavorite = favorites.includes(channel.id)
  const isOffline = channel.isOffline
  const [imgError, setImgError] = useState(false)

  const categoryName = getCategoryName(channel.group)
  const langName = channel.language ? (languageNames[channel.language] || channel.language.toUpperCase()) : null
  const countryName = channel.country || null

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg p-2 transition-all',
        'hover:bg-muted/60',
        isActive && 'bg-primary/15 ring-1 ring-primary',
        isOffline && 'opacity-40'
      )}
      onClick={() => setCurrentChannel(channel, user?.uid)}
    >
      <div className="flex items-center gap-3">
        {/* Channel logo */}
        <div className="shrink-0 h-12 w-12 flex items-center justify-center rounded-md bg-black/40 overflow-hidden">
          {channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">
              {channel.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Channel info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold truncate">{channel.name}</h3>
            {isActive && !isOffline && (
              <Radio className="h-3 w-3 text-red-500 shrink-0 animate-pulse" />
            )}
            {isOffline && <WifiOff className="h-3 w-3 text-red-400 shrink-0" />}
          </div>

          {/* Badges row - no wrap, overflow hidden */}
          <div className="flex items-center gap-1 mt-1 overflow-hidden">
            {/* Category badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {categoryName}
            </span>
            {/* Country badge */}
            {countryName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 shrink-0">
                {countryName}
              </span>
            )}
            {/* Language badge */}
            {langName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {langName}
              </span>
            )}
            {/* Labels */}
            {channel.labels?.map((label) => (
              <span
                key={label}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                  labelColors[label] || 'bg-muted text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Favorite button */}
        <button
          className={cn(
            'shrink-0 rounded-full p-1.5 transition-colors',
            'opacity-0 group-hover:opacity-100',
            isFavorite && 'opacity-100',
            isFavorite ? 'text-yellow-500' : 'text-muted-foreground/50 hover:text-yellow-500'
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(channel.id, user?.uid)
          }}
        >
          <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </button>
      </div>
    </div>
  )
})
