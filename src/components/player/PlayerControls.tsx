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
    <div className="bg-black px-2 py-1.5">

      {/* Controls row */}
      <div className="flex items-center gap-1">
        {/* Channel navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={handlePrevChannel}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={handleNextChannel}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Volume */}
        <div className="flex items-center gap-1 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 cursor-pointer"
          />
        </div>

        {/* Live indicator */}
        {currentChannel && (
          <span className="live-indicator ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* PiP */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={handlePiP}
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={handleFullscreen}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
