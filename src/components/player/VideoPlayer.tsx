'use client'

import { useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'
import { usePlayerStore, useChannelStore } from '@/stores'
import { PlayerControls } from './PlayerControls'
import { Loader2 } from 'lucide-react'

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { currentChannel, markChannelOffline, markChannelOnline } = useChannelStore()
  const {
    isPlaying,
    isMuted,
    volume,
    isLoading,
    error,
    setPlaying,
    setLoading,
    setError,
    setFullscreen,
  } = usePlayerStore()

  // Initialize HLS
  const initializePlayer = useCallback((url: string) => {
    const video = videoRef.current
    if (!video) return

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setLoading(true)
    setError(null)

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        if (currentChannel) markChannelOnline(currentChannel.id)
        video.play().catch(() => {
          setPlaying(false)
        })
      })

      let retryCount = 0
      const maxRetries = 2

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          retryCount++
          if (retryCount <= maxRetries) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error - trying to recover...')
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError('Media error - trying to recover...')
                hls.recoverMediaError()
                break
              default:
                setError('Channel offline')
                if (currentChannel) markChannelOffline(currentChannel.id)
                hls.destroy()
                break
            }
          } else {
            setError('Channel offline')
            setLoading(false)
            if (currentChannel) markChannelOffline(currentChannel.id)
            hls.destroy()
          }
        }
      })

      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        setLoading(false)
        video.play().catch(() => setPlaying(false))
      })
    } else {
      setError('HLS is not supported in this browser')
    }
  }, [setLoading, setError, setPlaying, currentChannel, markChannelOffline, markChannelOnline])

  // Load channel when changed
  useEffect(() => {
    if (currentChannel?.url) {
      initializePlayer(currentChannel.url)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [currentChannel?.url, initializePlayer])

  // Sync play state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }, [isPlaying, setPlaying])

  // Sync volume
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = volume
    video.muted = isMuted
  }, [volume, isMuted])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [setFullscreen])

  // Video event handlers
  const handlePlay = () => setPlaying(true)
  const handlePause = () => setPlaying(false)

  // Toggle play/pause on single click
  const handleClick = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentChannel) return

    if (video.paused) {
      video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }, [currentChannel, setPlaying])

  // Toggle fullscreen on double click
  const handleDoubleClick = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  return (
    <div ref={containerRef} className="video-container group">
      {/* Video wrapper with minimum height to prevent layout shift */}
      <div
        className="relative w-full min-h-[200px] bg-black rounded-lg overflow-hidden cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <video
          ref={videoRef}
          className="w-full h-auto"
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* No channel selected */}
        {!currentChannel && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-muted-foreground">Select a channel to start watching</p>
          </div>
        )}
      </div>

      {/* Controls - positioned below video */}
      <PlayerControls videoRef={videoRef} containerRef={containerRef} />
    </div>
  )
}
