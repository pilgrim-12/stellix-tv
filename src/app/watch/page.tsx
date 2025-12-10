'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Header } from '@/components/layout'
import { VideoPlayer } from '@/components/player'
import { ChannelList, CategoryFilter, LanguageFilter, ChannelGridTrigger } from '@/components/channels'
import { ProtectedRoute } from '@/components/auth'
import { useChannelStore } from '@/stores'
import { useSettings } from '@/contexts/SettingsContext'
import { sampleChannels } from '@/data/channels'
import { getCurrentProgram, getUpcomingPrograms } from '@/data/programs'
import { Keyboard } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

export default function WatchPage() {
  return (
    <ProtectedRoute>
      <WatchContent />
    </ProtectedRoute>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Map UI language to locale for date formatting
const localeMap: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  uk: 'uk-UA',
  es: 'es-ES',
  it: 'it-IT',
}

function WatchContent() {
  const { currentChannel, channels, setCurrentChannel } = useChannelStore()
  const { uiLanguage } = useSettings()
  const [currentTime, setCurrentTime] = useState(new Date())
  const locale = localeMap[uiLanguage] || 'ru-RU'

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Load channel from URL param or localStorage (once on mount)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (initialLoadDone.current) return
    if (channels.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const targetId = params.get('channel') || localStorage.getItem('stellix-last-channel')

    if (targetId) {
      const channel = channels.find((ch) => ch.id === targetId)
      if (channel) {
        setCurrentChannel(channel)
        initialLoadDone.current = true
      }
    } else {
      initialLoadDone.current = true
    }
  }, [channels, setCurrentChannel])

  // Update URL when channel changes (but don't depend on searchParams to avoid loops)
  useEffect(() => {
    if (currentChannel) {
      // Get current URL param directly from window to avoid stale React state
      const urlParams = new URLSearchParams(window.location.search)
      const currentParam = urlParams.get('channel')
      if (currentParam !== currentChannel.id) {
        window.history.replaceState(null, '', `/watch?channel=${currentChannel.id}`)
      }
    }
  }, [currentChannel])

  const currentProgram = useMemo(() => {
    if (!currentChannel) return undefined
    return getCurrentProgram(currentChannel.id)
  }, [currentChannel, currentTime])

  const nextProgram = useMemo(() => {
    if (!currentChannel) return undefined
    const upcoming = getUpcomingPrograms(currentChannel.id, 1)
    return upcoming[0]
  }, [currentChannel, currentTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const { togglePlay, toggleMute, setVolume, volume } = require('@/stores').usePlayerStore.getState()
      const { currentChannel, setCurrentChannel, getFilteredChannels } = require('@/stores').useChannelStore.getState()

      // Use filtered channels for navigation (respects category, language, favorites filters)
      const filteredChannels = getFilteredChannels()

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'm':
          toggleMute()
          break
        case '+':
        case '=':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case '-':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
        case 'arrowup':
          e.preventDefault()
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex((ch: { id: string }) => ch.id === currentChannel.id)
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChannels.length - 1
            setCurrentChannel(filteredChannels[prevIndex])
          }
          break
        case 'arrowdown':
          e.preventDefault()
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex((ch: { id: string }) => ch.id === currentChannel.id)
            const nextIndex = currentIndex < filteredChannels.length - 1 ? currentIndex + 1 : 0
            setCurrentChannel(filteredChannels[nextIndex])
          }
          break
        case 'arrowleft':
          e.preventDefault()
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex((ch: { id: string }) => ch.id === currentChannel.id)
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChannels.length - 1
            setCurrentChannel(filteredChannels[prevIndex])
          }
          break
        case 'arrowright':
          e.preventDefault()
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex((ch: { id: string }) => ch.id === currentChannel.id)
            const nextIndex = currentIndex < filteredChannels.length - 1 ? currentIndex + 1 : 0
            setCurrentChannel(filteredChannels[nextIndex])
          }
          break
        default:
          if (/^[1-9]$/.test(e.key)) {
            const index = parseInt(e.key) - 1
            if (filteredChannels[index]) {
              setCurrentChannel(filteredChannels[index])
            }
          }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header - hidden in mobile landscape */}
      <div className="mobile-landscape:hidden">
        <Header />
      </div>

      {/* Filters bar - hidden in mobile landscape */}
      <div className="mobile-landscape:hidden">
        <CategoryFilter />
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Main content - Grid on md+, flex-col on mobile */}
        <div className="h-full flex flex-col md:grid md:grid-cols-[1fr_16rem] lg:grid-cols-[1fr_18rem] xl:grid-cols-[1fr_20rem] overflow-hidden">
          {/* Player section */}
          <div className="shrink-0 md:min-h-0 flex flex-col overflow-hidden">
            <div className="flex flex-col p-2 mobile-landscape:p-1 gap-2 mobile-landscape:gap-0 lg:flex-1 lg:min-h-0">
              <VideoPlayer />
              {currentChannel && (
                <div className="shrink-0 flex items-start gap-3 mobile-landscape:hidden">
                  <div className="shrink-0">
                    <h1 className="text-sm font-semibold">{currentChannel.name}</h1>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {currentChannel.group} • {currentChannel.country}
                    </p>
                  </div>

                  {/* Current & next program - inline */}
                  {(currentProgram || nextProgram) && (
                    <div className="flex items-center gap-3 text-[10px] min-w-0">
                      {currentProgram && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                            СЕЙЧАС
                          </span>
                          <span className="truncate">{currentProgram.title}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {formatTime(currentProgram.endTime)}
                          </span>
                        </div>
                      )}
                      {nextProgram && (
                        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                          <span className="shrink-0">→</span>
                          <span className="truncate">{nextProgram.title}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Channels section - hidden in mobile landscape */}
          <div className="flex-1 md:flex-none border-t md:border-t-0 md:border-l border-border/40 flex flex-col overflow-hidden mobile-landscape:hidden">
            {/* Language filter */}
            <LanguageFilter />
            {/* Ad banner in sidebar - hidden for now */}
            {/* <div className="p-1.5 border-b border-border/40 shrink-0">
              <div className="rounded bg-muted/30 border border-border/40 p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Реклама</p>
                <div className="h-[40px] bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">300x50 Banner</span>
                </div>
              </div>
            </div> */}
            <div className="flex-1 overflow-auto">
              <ChannelList />
            </div>
          </div>
        </div>
      </div>

      {/* Ad banner fixed at bottom - hidden for now */}
      {/* <div className="shrink-0 border-t border-border/40 bg-background p-2 text-center mobile-landscape:hidden">
        <p className="text-[10px] text-muted-foreground mb-0.5">Реклама</p>
        <div className="h-[50px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">728x90 Banner</span>
        </div>
      </div> */}

      {/* Status bar - tablet and desktop */}
      <div className="hidden md:flex shrink-0 border-t border-border/40 bg-muted/30 px-3 py-1 items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <ChannelGridTrigger />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground">
                <Keyboard className="h-3 w-3" />
                <span className="hidden lg:inline">Hotkeys</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Play / Pause</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mute / Unmute</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume Up</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">+</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume Down</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">-</kbd>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previous Channel</span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Channel</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Channel 1-9</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">1-9</kbd>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          {currentTime.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} • {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
