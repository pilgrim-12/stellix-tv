'use client'

import { useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import { Loader2, XCircle } from 'lucide-react'

interface ChannelPreviewProps {
  url: string
  isVisible: boolean
}

export function ChannelPreview({ url, isVisible }: ChannelPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!isVisible || !url) {
      // Cleanup when hidden
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      setIsLoading(true)
      setHasError(false)
      return
    }

    const video = videoRef.current
    if (!video) return

    const initPlayer = async () => {
      setIsLoading(true)
      setHasError(false)

      try {
        if (url.includes('.m3u8')) {
          const HlsModule = (await import('hls.js')).default
          if (HlsModule.isSupported()) {
            const hls = new HlsModule({
              enableWorker: true,
              lowLatencyMode: true,
              maxBufferLength: 5, // Small buffer for quick start
              maxMaxBufferLength: 10,
            })
            hlsRef.current = hls

            hls.loadSource(url)
            hls.attachMedia(video)

            hls.on(HlsModule.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {})
            })

            hls.on(HlsModule.Events.ERROR, (_, data) => {
              if (data.fatal) {
                setHasError(true)
                setIsLoading(false)
              }
            })
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url
            video.play().catch(() => {})
          }
        } else {
          video.src = url
          video.play().catch(() => {})
        }
      } catch {
        setHasError(true)
        setIsLoading(false)
      }
    }

    initPlayer()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [url, isVisible])

  const handleCanPlay = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-20 bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        onCanPlay={handleCanPlay}
        onError={handleError}
      />

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="h-6 w-6 animate-spin text-white/70" />
        </div>
      )}

      {/* Error indicator */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <XCircle className="h-6 w-6 text-red-500/70" />
        </div>
      )}

      {/* Live badge */}
      {!isLoading && !hasError && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-semibold rounded">
          LIVE
        </div>
      )}
    </div>
  )
}
