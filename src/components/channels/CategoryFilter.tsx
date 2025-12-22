'use client'

import { useState, useRef, useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { useSettings } from '@/contexts/SettingsContext'
import { channelCategories } from '@/data/channels'
import { Button } from '@/components/ui/button'
import { ChannelCategory, languageNames } from '@/types'
import { cn } from '@/lib/utils'
import { Globe, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  children: React.ReactNode
  className?: string
}

function Carousel({ children, className }: CarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = 150
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
    setTimeout(checkScroll, 300)
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 z-10 h-6 w-6 bg-background/80 hover:bg-background"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 h-6 w-6 bg-background/80 hover:bg-background"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function CategoryFilter() {
  const {
    selectedCategory,
    setCategory,
    getCategoryCounts,
  } = useChannelStore()
  const { getCategoryName } = useSettings()

  const categoryCounts = getCategoryCounts()
  // Sum of all category counts = filtered total (with current language/country filters)
  const filteredTotal = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="border-b border-border/40 bg-muted/20 shrink-0 px-2 py-1.5">
      <Carousel>
        {channelCategories.map((category) => {
          const count = category.id === 'all' ? filteredTotal : (categoryCounts[category.id] || 0)
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-6 text-[11px] px-2 whitespace-nowrap shrink-0 gap-1',
                selectedCategory === category.id && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setCategory(category.id as ChannelCategory)}
            >
              {getCategoryName(category.id)}
              <span className={cn(
                'text-[10px]',
                selectedCategory === category.id ? 'opacity-80' : 'text-muted-foreground'
              )}>
                ({count})
              </span>
            </Button>
          )
        })}
      </Carousel>
    </div>
  )
}

// Порядок языков: Русский, Английский, Испанский, Французский, Немецкий и т.д.
const languageOrder = ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'tr', 'pl', 'uk', 'ar', 'zh', 'ja', 'ko', 'hi', 'nl', 'az', 'hy', 'bs', 'sr', 'sq', 'bg', 'ca']

export function LanguageFilter() {
  const {
    selectedLanguage,
    setLanguage,
    getAvailableLanguages,
    selectedCountry,
    setCountry,
    getAvailableCountries,
    getLanguageCounts,
    getCountryCounts,
  } = useChannelStore()
  const { t } = useSettings()

  const [isOpen, setIsOpen] = useState(false)
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const countryPopoverRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const availableLanguages = getAvailableLanguages()
  const availableCountries = getAvailableCountries()
  const languageCounts = getLanguageCounts()
  const countryCounts = getCountryCounts()
  // Sum of counts = filtered total
  const languageTotal = Object.values(languageCounts).reduce((sum, count) => sum + count, 0)
  const countryTotal = Object.values(countryCounts).reduce((sum, count) => sum + count, 0)

  // Сортировка языков по заданному порядку
  const sortedLanguages = [...availableLanguages].sort((a, b) => {
    const indexA = languageOrder.indexOf(a)
    const indexB = languageOrder.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
      if (countryPopoverRef.current && !countryPopoverRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false)
      }
    }
    if (isOpen || isCountryOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isCountryOpen])

  const scroll = (direction: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'left' ? -120 : 120,
      behavior: 'smooth',
    })
  }

  const selectedLabel = selectedLanguage === 'all'
    ? t('allCategories')
    : (languageNames[selectedLanguage] || selectedLanguage.toUpperCase())

  const selectedCountryLabel = selectedCountry === 'all'
    ? 'All Countries'
    : selectedCountry

  // Only show country filter if there are countries available
  const showCountryFilter = availableCountries.length > 0

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-border/40 bg-muted/10 shrink-0">
      {/* Language filter */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {/* Desktop/Tablet landscape: Popover button */}
      <div className="hidden md:block relative" ref={popoverRef}>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[11px] px-3 gap-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedLabel}
          <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[280px] max-w-[400px] max-h-[60vh] overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedLanguage === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => { setLanguage('all'); setIsOpen(false) }}
              >
                {t('allCategories')} <span className="text-muted-foreground ml-1">({languageTotal})</span>
              </Button>
              {sortedLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => { setLanguage(lang); setIsOpen(false) }}
                >
                  {languageNames[lang] || lang.toUpperCase()} <span className="text-muted-foreground ml-1">({languageCounts[lang] || 0})</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Horizontal scroll (hidden on md+) */}
      <div className="md:hidden flex-1 flex items-center gap-1 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div
          ref={containerRef}
          className="flex-1 min-w-0 flex items-center gap-1 overflow-x-scroll overflow-y-hidden scrollbar-hide"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Button
            variant={selectedLanguage === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-[11px] px-2 shrink-0"
            onClick={() => setLanguage('all')}
          >
            {t('allCategories')}
          </Button>
          {sortedLanguages.map((lang) => (
            <Button
              key={lang}
              variant={selectedLanguage === lang ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-[11px] px-2 shrink-0"
              onClick={() => setLanguage(lang)}
            >
              {languageNames[lang] || lang.toUpperCase()}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      </div>

      {/* Country filter - only show if countries are available */}
      {showCountryFilter && (
        <div className="flex items-center gap-1 shrink-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="hidden md:block relative" ref={countryPopoverRef}>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-3 gap-1"
              onClick={() => setIsCountryOpen(!isCountryOpen)}
            >
              {selectedCountryLabel}
              <ChevronRight className={cn("h-3 w-3 transition-transform", isCountryOpen && "rotate-90")} />
            </Button>

            {isCountryOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px] max-w-[300px] max-h-[60vh] overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant={selectedCountry === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => { setCountry('all'); setIsCountryOpen(false) }}
                  >
                    All Countries <span className="text-muted-foreground ml-1">({countryTotal})</span>
                  </Button>
                  {availableCountries.map((country) => (
                    <Button
                      key={country}
                      variant={selectedCountry === country ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => { setCountry(country); setIsCountryOpen(false) }}
                    >
                      {country} <span className="text-muted-foreground ml-1">({countryCounts[country] || 0})</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
