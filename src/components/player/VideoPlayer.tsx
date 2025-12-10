'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Hls from 'hls.js'
import { usePlayerStore, useChannelStore } from '@/stores'
import { useSettings } from '@/contexts/SettingsContext'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  const { currentChannel, markChannelOffline, markChannelOnline, getFilteredChannels, setCurrentChannel } = useChannelStore()
  const { t } = useSettings()
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

  // Swipe handlers for mobile channel switching
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setSwipeDirection(null)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current

    // Only show swipe indicator if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left')
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const minSwipeDistance = 80

    // Only trigger channel switch if horizontal swipe is dominant and long enough
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      const filteredChannels = getFilteredChannels()
      if (currentChannel && filteredChannels.length > 0) {
        const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id)

        if (deltaX > 0) {
          // Swipe right = previous channel
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChannels.length - 1
          setCurrentChannel(filteredChannels[prevIndex])
        } else {
          // Swipe left = next channel
          const nextIndex = currentIndex < filteredChannels.length - 1 ? currentIndex + 1 : 0
          setCurrentChannel(filteredChannels[nextIndex])
        }
      }
    }

    touchStartX.current = null
    touchStartY.current = null
    setSwipeDirection(null)
  }, [currentChannel, getFilteredChannels, setCurrentChannel])

  return (
    <div ref={containerRef} className="video-container group">
      {/* Video wrapper - aspect-video on mobile, flex-1 on desktop */}
      <div
        className="relative aspect-video lg:aspect-auto lg:flex-1 lg:min-h-[200px] bg-black rounded-lg overflow-hidden"
        onDoubleClick={toggleFullscreen}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          controls
          autoPlay
          onPlay={handlePlay}
          onPause={handlePause}
        />

        {/* Swipe indicators - only visible on touch devices */}
        {swipeDirection && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white ${
              swipeDirection === 'left' ? 'animate-pulse' : 'animate-pulse'
            }`}>
              {swipeDirection === 'right' ? (
                <>
                  <ChevronLeft className="h-6 w-6" />
                  <span className="text-sm">Previous</span>
                </>
              ) : (
                <>
                  <span className="text-sm">Next</span>
                  <ChevronRight className="h-6 w-6" />
                </>
              )}
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* No channel selected */}
        {!currentChannel && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-muted-foreground">{t('selectChannel')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
