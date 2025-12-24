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
    <div className="w-52 rounded-lg overflow-hidden shadow-2xl border border-border/50 bg-black">
      {/* Video container - 16:9 aspect ratio */}
      <div className="relative aspect-video">
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
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
            <XCircle className="h-8 w-8 text-red-500/70" />
            <span className="text-xs text-red-400">Не удалось загрузить</span>
          </div>
        )}

        {/* Live badge */}
        {!isLoading && !hasError && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
            LIVE
          </div>
        )}
      </div>

    </div>
  )
}
