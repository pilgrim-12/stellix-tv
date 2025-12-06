'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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
    setMuted,
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
        // Try to autoplay - browsers may block this without user interaction
        video.play().then(() => {
          setPlaying(true)
        }).catch(() => {
          // Autoplay blocked - try muted autoplay as fallback (user will need to unmute manually)
          video.muted = true
          setMuted(true)
          video.play().then(() => {
            setPlaying(true)
          }).catch(() => {
            setPlaying(false)
          })
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
        video.play().then(() => {
          setPlaying(true)
        }).catch(() => {
          video.muted = true
          setMuted(true)
          video.play().then(() => {
            setPlaying(true)
          }).catch(() => setPlaying(false))
        })
      })
    } else {
      setError('HLS is not supported in this browser')
    }
  }, [setLoading, setError, setPlaying, setMuted, currentChannel, markChannelOffline, markChannelOnline])

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

  // Track tap timing for double tap detection on mobile
  const lastTapRef = useRef<number>(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Toggle fullscreen - with iOS Safari/Chrome support
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    const video = videoRef.current as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
      webkitExitFullscreen?: () => void
      webkitDisplayingFullscreen?: boolean
    }

    if (!container || !video) return

    // Check if we're in fullscreen (including webkit)
    const isInFullscreen = !!(
      document.fullscreenElement ||
      (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      video.webkitDisplayingFullscreen
    )

    if (isInFullscreen) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.()
      } else if (video.webkitExitFullscreen) {
        video.webkitExitFullscreen()
      }
    } else {
      // Enter fullscreen - try container first, then video element for iOS
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          // Fallback to video element fullscreen for iOS
          if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen()
          }
        })
      } else if ((container as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        (container as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.()
      } else if (video.webkitEnterFullscreen) {
        // iOS Safari/Chrome - use video element's native fullscreen
        video.webkitEnterFullscreen()
      }
    }
  }, [])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentChannel) return

    if (video.paused) {
      video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }, [currentChannel, setPlaying])

  // Track if last interaction was touch
  const lastWasTouchRef = useRef<boolean>(false)

  // Handle touch tap with double tap detection
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    lastWasTouchRef.current = true

    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap - fullscreen
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
      toggleFullscreen()
    } else {
      // Single tap - wait to see if it's a double tap
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      tapTimeoutRef.current = setTimeout(() => {
        togglePlayPause()
        tapTimeoutRef.current = null
      }, 300)
    }

    lastTapRef.current = now
  }, [toggleFullscreen, togglePlayPause])

  // Handle mouse click
  const handleClick = useCallback(() => {
    // Skip if this click was triggered by touch (ghost click)
    if (lastWasTouchRef.current) {
      lastWasTouchRef.current = false
      return
    }

    const now = Date.now()
    const timeSinceLastClick = now - lastTapRef.current

    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      // Double click - fullscreen
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
      toggleFullscreen()
    } else {
      // Single click - wait to see if it's a double click
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      tapTimeoutRef.current = setTimeout(() => {
        togglePlayPause()
        tapTimeoutRef.current = null
      }, 300)
    }

    lastTapRef.current = now
  }, [toggleFullscreen, togglePlayPause])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="video-container group">
      {/* Video wrapper - fills available space */}
      <div
        className="relative flex-1 min-h-[200px] bg-black rounded-t-lg overflow-hidden cursor-pointer"
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
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
