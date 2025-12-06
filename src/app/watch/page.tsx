'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout'
import { VideoPlayer } from '@/components/player'
import { ChannelList, CategoryFilter, LanguageFilter } from '@/components/channels'
import { ProtectedRoute } from '@/components/auth'
import { useChannelStore } from '@/stores'
import { sampleChannels } from '@/data/channels'
import { getCurrentProgram, getUpcomingPrograms } from '@/data/programs'

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

function WatchContent() {
  const { currentChannel } = useChannelStore()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

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
      const { currentChannel, setCurrentChannel } = require('@/stores').useChannelStore.getState()

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'm':
          toggleMute()
          break
        case 'arrowup':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
        case 'arrowleft':
          e.preventDefault()
          if (currentChannel) {
            const currentIndex = sampleChannels.findIndex(ch => ch.id === currentChannel.id)
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : sampleChannels.length - 1
            setCurrentChannel(sampleChannels[prevIndex])
          }
          break
        case 'arrowright':
          e.preventDefault()
          if (currentChannel) {
            const currentIndex = sampleChannels.findIndex(ch => ch.id === currentChannel.id)
            const nextIndex = currentIndex < sampleChannels.length - 1 ? currentIndex + 1 : 0
            setCurrentChannel(sampleChannels[nextIndex])
          }
          break
        default:
          if (/^[1-9]$/.test(e.key)) {
            const index = parseInt(e.key) - 1
            if (sampleChannels[index]) {
              setCurrentChannel(sampleChannels[index])
            }
          }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />

      {/* Filters bar */}
      <CategoryFilter />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Player section */}
          <div className="lg:flex-1 flex flex-col overflow-auto">
            <div className="p-2 flex flex-col gap-2">
              <VideoPlayer />
              {currentChannel && (
                <div className="flex items-start gap-3">
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

          {/* Channels section - scrollable */}
          <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-border/40 flex flex-col overflow-hidden">
            {/* Language filter */}
            <LanguageFilter />
            {/* Ad banner in sidebar */}
            <div className="p-1.5 border-b border-border/40 shrink-0">
              <div className="rounded bg-muted/30 border border-border/40 p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Реклама</p>
                <div className="h-[40px] bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">300x50 Banner</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <ChannelList />
            </div>
          </div>
        </div>
      </div>

      {/* Ad banner fixed at bottom */}
      <div className="shrink-0 border-t border-border/40 bg-background p-2 text-center">
        <p className="text-[10px] text-muted-foreground mb-0.5">Реклама</p>
        <div className="h-[50px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">728x90 Banner</span>
        </div>
      </div>
    </div>
  )
}
