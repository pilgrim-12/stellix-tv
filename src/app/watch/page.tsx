'use client'

import { useEffect } from 'react'
import { Header } from '@/components/layout'
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

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Player section - fixed height on mobile, fixed width on desktop */}
          <div className="lg:w-2/3 xl:w-3/4 flex flex-col shrink-0">
            <div className="p-4">
              <VideoPlayer />
              {currentChannel && (
                <div className="mt-3">
                  <h1 className="text-xl font-semibold">{currentChannel.name}</h1>
                  <p className="text-sm text-muted-foreground capitalize">
                    {currentChannel.group} • {currentChannel.country}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Channels section - scrollable */}
          <div className="flex-1 lg:w-1/3 xl:w-1/4 border-t lg:border-t-0 lg:border-l border-border/40 overflow-auto">
            <ChannelList />
          </div>
        </div>
      </div>
    </div>
  )
}
