'use client'

import { RefObject } from 'react'
import { usePlayerStore, useChannelStore } from '@/stores'
import { Button } from '@/components/ui/button'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sampleChannels } from '@/data/channels'

interface PlayerControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
}

export function PlayerControls({ videoRef, containerRef }: PlayerControlsProps) {
  const {
    isPlaying,
    isMuted,
    isFullscreen,
    volume,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
    togglePiP,
  } = usePlayerStore()

  const { currentChannel, setCurrentChannel } = useChannelStore()

  const handleFullscreen = () => {
    if (!containerRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
    toggleFullscreen()
  }

  const handlePiP = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
      togglePiP()
    } catch (err) {
      console.error('PiP error:', err)
    }
  }

  const handlePrevChannel = () => {
    if (!currentChannel) return
    const currentIndex = sampleChannels.findIndex(ch => ch.id === currentChannel.id)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sampleChannels.length - 1
    setCurrentChannel(sampleChannels[prevIndex])
  }

  const handleNextChannel = () => {
    if (!currentChannel) return
    const currentIndex = sampleChannels.findIndex(ch => ch.id === currentChannel.id)
    const nextIndex = currentIndex < sampleChannels.length - 1 ? currentIndex + 1 : 0
    setCurrentChannel(sampleChannels[nextIndex])
  }

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent',
        'px-4 pb-4 pt-10 rounded-b-lg',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
      )}
    >
      {/* Channel info */}
      {currentChannel && (
        <div className="mb-3 flex items-center gap-2">
          <span className="live-indicator inline-flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-sm font-medium text-white truncate">{currentChannel.name}</span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Channel navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
          onClick={handlePrevChannel}
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
          onClick={handleNextChannel}
        >
          <SkipForward className="h-5 w-5" />
        </Button>

        {/* Volume */}
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1.5 cursor-pointer"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* PiP */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
          onClick={handlePiP}
        >
          <PictureInPicture2 className="h-5 w-5" />
        </Button>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
          onClick={handleFullscreen}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
