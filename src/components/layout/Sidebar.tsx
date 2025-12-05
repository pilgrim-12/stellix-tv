'use client'

import { cn } from '@/lib/utils'
import { useChannelStore } from '@/stores'
import { channelCategories } from '@/data/channels'
import {
  Grid3X3,
  Newspaper,
  Trophy,
  Film,
  Baby,
  Music,
  Tv,
  BookOpen,
} from 'lucide-react'
import { ChannelCategory } from '@/types'

const iconMap = {
  Grid: Grid3X3,
  Newspaper,
  Trophy,
  Film,
  Baby,
  Music,
  Tv,
  BookOpen,
}

export function Sidebar() {
  const { selectedCategory, setCategory } = useChannelStore()

  return (
    <aside className="hidden lg:flex w-48 flex-col border-r border-border/40 bg-card/50">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Categories
        </h2>
        <nav className="space-y-1">
          {channelCategories.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap]
            return (
              <button
                key={category.id}
                onClick={() => setCategory(category.id as ChannelCategory)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Ad placeholder */}
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">Ad Space</p>
          <p className="text-xs text-muted-foreground">300x250</p>
        </div>
      </div>
    </aside>
  )
}
