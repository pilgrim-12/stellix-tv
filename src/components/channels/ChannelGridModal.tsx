'use client'

import { useState, useMemo } from 'react'
import { useChannelStore } from '@/stores'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
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
  MapPin,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { languageNames, languageOrder } from '@/types'
import type { Channel, ChannelCategory } from '@/types'
import { channelCategories } from '@/data/channels'

interface ChannelGridModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChannelGridModal({ open, onOpenChange }: ChannelGridModalProps) {
  const { user } = useAuthContext()
  const { t, getCategoryName } = useSettings()
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
    selectedCountry,
    setCountry,
    getAvailableCountries,
    showOnlyFavorites,
    setShowOnlyFavorites,
  } = useChannelStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const [showLanguages, setShowLanguages] = useState(false)
  const [showCountries, setShowCountries] = useState(false)

  const availableLanguages = getAvailableLanguages()
  const availableCountries = getAvailableCountries()

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
      // Country
      if (selectedCountry !== 'all' && channel.country !== selectedCountry) {
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

  // Stats - count working channels from total channels (not just filtered)
  const totalCount = filteredChannels.length
  const onlineCount = filteredChannels.filter(ch => !ch.isOffline).length
  const totalWorkingChannels = channels.filter(ch => !ch.isOffline).length

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel, user?.uid)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              {t('allChannels')}
              <span className="text-sm font-normal text-muted-foreground">
                ({channels.length} {t('channels')}, {totalWorkingChannels} {t('workingChannels')})
              </span>
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
                placeholder={t('searchChannels')}
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
              {onlineCount < totalCount && (
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{onlineCount}</span>
                </div>
              )}
            </div>

            <Button
              variant={showOnlyFavorites ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites, user?.uid)}
            >
              <Star className={cn('h-4 w-4', showOnlyFavorites && 'fill-current')} />
              {t('favorites')} ({favorites.length})
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
              <span>{t('category')}: {getCategoryName(selectedCategory)}</span>
              {showCategories ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showCategories && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-[200px] overflow-y-auto">
                {channelCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setCategory(cat.id as ChannelCategory); setShowCategories(false) }}
                  >
                    {getCategoryName(cat.id)}
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
              <span>{t('language')}: {selectedLanguage === 'all' ? t('allCategories') : (languageNames[selectedLanguage] || selectedLanguage)}</span>
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
                  {t('allLanguages')}
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

          {/* Countries - collapsible */}
          {availableCountries.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 px-2"
                onClick={() => setShowCountries(!showCountries)}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Country: {selectedCountry === 'all' ? 'All' : selectedCountry}</span>
                {showCountries ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>

              {showCountries && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Button
                    variant={selectedCountry === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setCountry('all'); setShowCountries(false) }}
                  >
                    All Countries
                  </Button>
                  {availableCountries.sort().map((country) => (
                    <Button
                      key={country}
                      variant={selectedCountry === country ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setCountry(country); setShowCountries(false) }}
                    >
                      {country}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Channel grid */}
        <div className="flex-1 overflow-auto p-4">
          {filteredChannels.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t('noChannelsFound')}
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16 gap-2">
              {filteredChannels.map((channel) => {
                const isActive = currentChannel?.id === channel.id
                const isFavorite = favorites.includes(channel.id)

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      'group relative cursor-pointer rounded-lg p-2 transition-all',
                      'hover:bg-muted/50',
                      isActive && 'bg-primary/15 ring-2 ring-primary'
                    )}
                    onClick={() => handleSelectChannel(channel)}
                  >
                    {/* Logo */}
                    <div className="w-12 h-12 mx-auto rounded bg-muted overflow-hidden mb-1 flex items-center justify-center">
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
                      <Tv className={cn(
                        'h-6 w-6 text-muted-foreground',
                        channel.logo && 'hidden'
                      )} />
                    </div>

                    {/* Name */}
                    <p className="text-[10px] font-medium text-center line-clamp-2 leading-tight w-full">
                      {channel.name}
                    </p>

                    {/* Country badge */}
                    {channel.country && (
                      <p className="text-[8px] text-center text-sky-400 truncate w-full">
                        {channel.country}
                      </p>
                    )}

                    {/* Favorite star */}
                    {isFavorite && (
                      <Star className="absolute top-0.5 right-0.5 h-3 w-3 text-yellow-500 fill-current" />
                    )}

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
  const { t } = useSettings()
  const workingCount = channels.filter(ch => !ch.isOffline).length
  const hasOffline = workingCount < channels.length

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title={t('openChannelGrid')}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>{channels.length} {t('channels')}</span>
        {hasOffline && <span className="text-green-500">({workingCount})</span>}
      </Button>
      <ChannelGridModal open={open} onOpenChange={setOpen} />
    </>
  )
}
