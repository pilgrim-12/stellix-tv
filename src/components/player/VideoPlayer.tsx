'use client'

import { useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'
import { usePlayerStore, useChannelStore } from '@/stores'
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

  return (
    <div ref={containerRef} className="video-container group">
      {/* Video wrapper - aspect-video on mobile, flex-1 on desktop */}
      <div
        className="relative aspect-video lg:aspect-auto lg:flex-1 lg:min-h-[200px] bg-black rounded-lg overflow-hidden"
        onDoubleClick={toggleFullscreen}
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

        {/* Loading overlay - hide when there's an error */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* No channel selected */}
        {!currentChannel && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-muted-foreground">Select a channel to start watching</p>
          </div>
        )}
      </div>
    </div>
  )
}
