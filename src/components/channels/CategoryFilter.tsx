'use client'

import { useChannelStore } from '@/stores'
import { channelCategories } from '@/data/channels'
import { Button } from '@/components/ui/button'
import { ChannelCategory, languageNames } from '@/types'
import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'

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
    <div className="border-b border-border/40 bg-muted/20 shrink-0">
      {/* Categories row */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
        {channelCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 text-xs px-3 whitespace-nowrap shrink-0',
              selectedCategory === category.id && 'bg-primary text-primary-foreground'
            )}
            onClick={() => setCategory(category.id as ChannelCategory)}
          >
            {categoryNamesRu[category.id] || category.name}
          </Button>
        ))}

        {/* Divider */}
        <div className="h-5 w-px bg-border/60 mx-2 shrink-0" />

        {/* Language filter */}
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <Button
          variant={selectedLanguage === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 text-xs px-2 shrink-0',
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
              'h-7 text-xs px-2 shrink-0',
              selectedLanguage === lang && 'bg-secondary'
            )}
            onClick={() => setLanguage(lang)}
          >
            {languageNames[lang] || lang.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  )
}
