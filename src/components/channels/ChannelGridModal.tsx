'use client'

import { useState, useMemo } from 'react'
import { useChannelStore } from '@/stores'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Grid3X3,
  Star,
  Tv,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder, categoryNames } from '@/types'
import type { Channel, ChannelCategory } from '@/types'

interface ChannelGridModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChannelGridModal({ open, onOpenChange }: ChannelGridModalProps) {
  const { user } = useAuthContext()
  const {
    channels,
    currentChannel,
    setCurrentChannel,
    favorites,
    toggleFavorite,
    selectedCategory,
    setCategory,
    selectedLanguage,
    setLanguage,
    getAvailableLanguages,
  } = useChannelStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showLanguages, setShowLanguages] = useState(false)

  const availableLanguages = getAvailableLanguages()

  // Sort languages
  const sortedLanguages = [...availableLanguages].sort((a, b) => {
    const indexA = languageOrder.indexOf(a)
    const indexB = languageOrder.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      // Search
      if (searchQuery && !channel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Category
      if (selectedCategory !== 'all' && channel.group !== selectedCategory) {
        return false
      }
      // Language
      if (selectedLanguage !== 'all' && channel.language !== selectedLanguage) {
        return false
      }
      // Favorites
      if (showOnlyFavorites && !favorites.includes(channel.id)) {
        return false
      }
      // Hide offline
      if (channel.isOffline) {
        return false
      }
      return true
    })
  }, [channels, searchQuery, selectedCategory, selectedLanguage, showOnlyFavorites, favorites])

  // Stats
  const totalCount = filteredChannels.length
  const onlineCount = filteredChannels.filter(ch => !ch.isOffline).length

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel, user?.uid)
    onOpenChange(false)
  }

  const categories: ChannelCategory[] = [
    'all', 'news', 'sports', 'movies', 'kids', 'music',
    'entertainment', 'documentary', 'nature', 'lifestyle', 'cooking', 'gaming'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[75vw] w-[75vw] h-[90vh] p-0 gap-0 flex flex-col left-[37.5%]">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Все каналы
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-4 py-3 border-b space-y-3 shrink-0">
          {/* Search + Stats */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск каналов..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tv className="h-4 w-4" />
                <span>{totalCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>{onlineCount}</span>
              </div>
            </div>

            <Button
              variant={showOnlyFavorites ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            >
              <Star className={cn('h-4 w-4', showOnlyFavorites && 'fill-current')} />
              Избранное ({favorites.length})
            </Button>
          </div>

          {/* Categories - collapsible */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2"
              onClick={() => setShowCategories(!showCategories)}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Категория: {categoryNames[selectedCategory] || selectedCategory}</span>
              {showCategories ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showCategories && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setCategory(cat); setShowCategories(false) }}
                  >
                    {categoryNames[cat] || cat}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Languages - collapsible */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2"
              onClick={() => setShowLanguages(!showLanguages)}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Язык: {selectedLanguage === 'all' ? 'Все' : (languageNames[selectedLanguage] || selectedLanguage)}</span>
              {showLanguages ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showLanguages && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button
                  variant={selectedLanguage === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setLanguage('all'); setShowLanguages(false) }}
                >
                  Все языки
                </Button>
                {sortedLanguages.map((lang) => (
                  <Button
                    key={lang}
                    variant={selectedLanguage === lang ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setLanguage(lang); setShowLanguages(false) }}
                  >
                    {languageNames[lang] || lang.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Channel grid */}
        <div className="flex-1 overflow-auto p-4">
          {filteredChannels.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Каналы не найдены
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-2">
              {filteredChannels.map((channel) => {
                const isActive = currentChannel?.id === channel.id
                const isFavorite = favorites.includes(channel.id)

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      'group relative cursor-pointer rounded-lg p-3 transition-all min-w-[100px]',
                      'hover:bg-muted/60 hover:scale-105',
                      isActive && 'bg-primary/15 ring-2 ring-primary'
                    )}
                    onClick={() => handleSelectChannel(channel)}
                  >
                    {/* Logo */}
                    <div className="aspect-square rounded-md bg-black/40 overflow-hidden mb-2 flex items-center justify-center">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <span className={cn(
                        'text-2xl font-bold text-muted-foreground',
                        channel.logo && 'hidden'
                      )}>
                        {channel.name.charAt(0)}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-xs font-medium text-center line-clamp-2 leading-tight min-h-[2.5em]">
                      {channel.name}
                    </p>

                    {/* Favorite star */}
                    <button
                      className={cn(
                        'absolute top-1 right-1 p-0.5 rounded transition-all',
                        'opacity-0 group-hover:opacity-100',
                        isFavorite && 'opacity-100 text-yellow-500'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(channel.id, user?.uid)
                      }}
                    >
                      <Star className={cn('h-3 w-3', isFavorite && 'fill-current')} />
                    </button>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Trigger button component
export function ChannelGridTrigger() {
  const [open, setOpen] = useState(false)
  const { channels } = useChannelStore()

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Grid3X3 className="h-3 w-3" />
        <span>{channels.length} каналов</span>
      </Button>
      <ChannelGridModal open={open} onOpenChange={setOpen} />
    </>
  )
}
