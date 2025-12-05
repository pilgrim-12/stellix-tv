'use client'

import { useEffect } from 'react'
import { Header } from '@/components/layout'
import { Sidebar } from '@/components/layout'
import { VideoPlayer } from '@/components/player'
import { ChannelList } from '@/components/channels'
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
      // Ignore if user is typing in an input
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
        case 'f':
          // Fullscreen is handled by the player component
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
          // Number keys 1-9 for quick channel select
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
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          {/* Player section */}
          <div className="p-4 pb-2">
            <div className="max-w-3xl">
              <VideoPlayer />
            </div>

            {/* Now playing info */}
            {currentChannel && (
              <div className="mt-2 max-w-3xl">
                <h1 className="text-lg font-semibold">{currentChannel.name}</h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {currentChannel.group} • {currentChannel.country}
                </p>
              </div>
            )}
          </div>

          {/* Channel list */}
          <div className="border-t border-border/40">
            <ChannelList />
          </div>
        </main>

        {/* Right sidebar with ad space */}
        <aside className="hidden xl:flex w-80 flex-col border-l border-border/40 p-4">
          {/* Ad banner placeholder */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center mb-4">
            <p className="text-xs text-muted-foreground">Ad Space</p>
            <p className="text-xs text-muted-foreground">300x250</p>
          </div>

          {/* Now playing card */}
          {currentChannel && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="live-indicator inline-flex items-center gap-1 text-xs font-medium text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  LIVE
                </span>
                <span className="text-xs text-muted-foreground">Now Playing</span>
              </div>

              {currentChannel.logo && (
                <div className="mb-3 flex h-16 items-center justify-center rounded bg-muted/50">
                  <img
                    src={currentChannel.logo}
                    alt={currentChannel.name}
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}

              <h3 className="font-semibold">{currentChannel.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {currentChannel.group}
              </p>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="mt-auto rounded-lg border border-border bg-card/50 p-4">
            <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><kbd className="px-1 bg-muted rounded">Space</kbd> Play/Pause</p>
              <p><kbd className="px-1 bg-muted rounded">M</kbd> Mute</p>
              <p><kbd className="px-1 bg-muted rounded">←</kbd> <kbd className="px-1 bg-muted rounded">→</kbd> Change channel</p>
              <p><kbd className="px-1 bg-muted rounded">↑</kbd> <kbd className="px-1 bg-muted rounded">↓</kbd> Volume</p>
              <p><kbd className="px-1 bg-muted rounded">1-9</kbd> Quick select</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
