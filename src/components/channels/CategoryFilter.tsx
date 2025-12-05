'use client'

import { useState, useRef, useEffect } from 'react'
import { useChannelStore } from '@/stores'
import { channelCategories } from '@/data/channels'
import { Button } from '@/components/ui/button'
import { ChannelCategory, languageNames } from '@/types'
import { cn } from '@/lib/utils'
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react'

const categoryNamesRu: Record<string, string> = {
  all: 'Все',
  news: 'Новости',
  sports: 'Спорт',
  movies: 'Кино',
  kids: 'Детям',
  music: 'Музыка',
  entertainment: 'Развлечения',
  documentary: 'Документальное',
  nature: 'Природа',
  lifestyle: 'Стиль жизни',
  cooking: 'Кулинария',
  gaming: 'Игры',
}

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
    selectedLanguage,
    setLanguage,
    getAvailableLanguages,
  } = useChannelStore()

  const availableLanguages = getAvailableLanguages()

  return (
    <div className="border-b border-border/40 bg-muted/20 shrink-0 px-2 py-1.5">
      <Carousel>
        {channelCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-6 text-[11px] px-2 whitespace-nowrap shrink-0',
              selectedCategory === category.id && 'bg-primary text-primary-foreground'
            )}
            onClick={() => setCategory(category.id as ChannelCategory)}
          >
            {categoryNamesRu[category.id] || category.name}
          </Button>
        ))}
      </Carousel>
    </div>
  )
}

export function LanguageFilter() {
  const {
    selectedLanguage,
    setLanguage,
    getAvailableLanguages,
  } = useChannelStore()

  const availableLanguages = getAvailableLanguages()

  return (
    <div className="flex items-center gap-1 px-1.5 py-1 border-b border-border/40 bg-muted/10">
      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
      <Carousel className="flex-1">
        <Button
          variant={selectedLanguage === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-5 text-[10px] px-1.5 shrink-0',
            selectedLanguage === 'all' && 'bg-secondary'
          )}
          onClick={() => setLanguage('all')}
        >
          Все
        </Button>
        {availableLanguages.map((lang) => (
          <Button
            key={lang}
            variant={selectedLanguage === lang ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-5 text-[10px] px-1.5 shrink-0',
              selectedLanguage === lang && 'bg-secondary'
            )}
            onClick={() => setLanguage(lang)}
          >
            {languageNames[lang] || lang.toUpperCase()}
          </Button>
        ))}
      </Carousel>
    </div>
  )
}
