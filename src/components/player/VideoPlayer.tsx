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

  const { currentChannel } = useChannelStore()
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
        video.play().catch(() => {
          // Autoplay blocked, user needs to interact
          setPlaying(false)
        })
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
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
              setError('Failed to load stream')
              hls.destroy()
              break
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
  }, [setLoading, setError, setPlaying])

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

  return (
    <div ref={containerRef} className="video-container group relative">
      <video
        ref={videoRef}
        className="w-full h-full"
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

      {/* Controls */}
      <PlayerControls videoRef={videoRef} containerRef={containerRef} />
    </div>
  )
}
