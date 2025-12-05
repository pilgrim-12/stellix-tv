'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChannelStore } from '@/stores'
import { sampleChannels, channelCategories } from '@/data/channels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Search,
  Tv,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { languageNames } from '@/types'

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

export default function AdminPage() {
  const router = useRouter()
  const {
    setChannels,
    getAllChannelsWithStatus,
    toggleChannelEnabled,
    loadDisabledChannels,
    disabledChannels,
  } = useChannelStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [showDisabledOnly, setShowDisabledOnly] = useState(false)

  useEffect(() => {
    setChannels(sampleChannels)
    loadDisabledChannels()
  }, [setChannels, loadDisabledChannels])

  const allChannels = getAllChannelsWithStatus()

  // Get available languages
  const availableLanguages = Array.from(
    new Set(allChannels.map((ch) => ch.language).filter(Boolean))
  ).sort() as string[]

  // Filter channels
  const filteredChannels = allChannels.filter((channel) => {
    const matchesCategory =
      selectedCategory === 'all' || channel.group === selectedCategory
    const matchesLanguage =
      selectedLanguage === 'all' || channel.language === selectedLanguage
    const matchesSearch =
      !searchQuery ||
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDisabled = !showDisabledOnly || !channel.enabled

    return matchesCategory && matchesLanguage && matchesSearch && matchesDisabled
  })

  // Stats
  const totalChannels = allChannels.length
  const enabledChannels = allChannels.filter((ch) => ch.enabled).length
  const disabledCount = totalChannels - enabledChannels

  const enableAll = () => {
    allChannels.forEach((ch) => {
      if (!ch.enabled) {
        toggleChannelEnabled(ch.id)
      }
    })
  }

  const disableAll = () => {
    allChannels.forEach((ch) => {
      if (ch.enabled) {
        toggleChannelEnabled(ch.id)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/watch')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Управление каналами</h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего каналов</p>
                <p className="text-2xl font-bold">{totalChannels}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Включено</p>
                <p className="text-2xl font-bold text-green-500">{enabledChannels}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-full bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Выключено</p>
                <p className="text-2xl font-bold text-red-500">{disabledCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск каналов..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {channelCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {categoryNamesRu[cat.id] || cat.name}
                </Button>
              ))}
            </div>

            {/* Languages */}
            <div className="flex flex-wrap items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={selectedLanguage === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedLanguage('all')}
              >
                Все языки
              </Button>
              {availableLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {languageNames[lang] || lang.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Show disabled only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-disabled"
                  checked={showDisabledOnly}
                  onCheckedChange={setShowDisabledOnly}
                />
                <label htmlFor="show-disabled" className="text-sm cursor-pointer">
                  Показать только выключенные
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={enableAll}>
                  <Eye className="h-4 w-4 mr-1" />
                  Включить все
                </Button>
                <Button variant="outline" size="sm" onClick={disableAll}>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Выключить все
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channels list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Каналы ({filteredChannels.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedLanguage('all')
                  setShowDisabledOnly(false)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={cn(
                    'flex items-center gap-4 py-3 transition-opacity',
                    !channel.enabled && 'opacity-50'
                  )}
                >
                  {/* Logo */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{channel.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{categoryNamesRu[channel.group] || channel.group}</span>
                      <span>•</span>
                      <span>{languageNames[channel.language || ''] || channel.language}</span>
                      {channel.labels?.map((label) => (
                        <span
                          key={label}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {channel.enabled ? 'Вкл' : 'Выкл'}
                    </span>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => toggleChannelEnabled(channel.id)}
                    />
                  </div>
                </div>
              ))}

              {filteredChannels.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Каналы не найдены
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
