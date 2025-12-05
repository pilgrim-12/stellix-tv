'use client'

import { useEffect } from 'react'
import { Header } from '@/components/layout'
import { VideoPlayer } from '@/components/player'
import { ChannelList, CategoryFilter } from '@/components/channels'
import { ProtectedRoute } from '@/components/auth'
import { useChannelStore } from '@/stores'
import { sampleChannels } from '@/data/channels'

export default function WatchPage() {
  return (
    <ProtectedRoute>
      <WatchContent />
    </ProtectedRoute>
  )
}

function WatchContent() {
  const { currentChannel } = useChannelStore()

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
          <div className="lg:flex-1 flex flex-col">
            <div className="p-2">
              <VideoPlayer />
              {currentChannel && (
                <div className="mt-1">
                  <h1 className="text-sm font-semibold">{currentChannel.name}</h1>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {currentChannel.group} • {currentChannel.country}
                  </p>
                </div>
              )}

              {/* Ad banner below player */}
              <div className="mt-2 rounded bg-muted/30 border border-border/40 p-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Реклама</p>
                <div className="h-[50px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">728x90 Banner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Channels section - scrollable */}
          <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-border/40 flex flex-col overflow-hidden">
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
    </div>
  )
}
