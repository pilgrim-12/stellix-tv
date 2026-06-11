'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { formatHlsError } from '@/lib/utils'

interface PreviewPlayerProps {
  url: string | null
  className?: string
  placeholder?: string
}

/**
 * Shared preview player for admin pages.
 * Handles HLS with CORS proxy fallback, error display, and cleanup.
 */
export function PreviewPlayer({ url, className = '', placeholder = 'Select a channel' }: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  useEffect(() => {
    cleanup()
    setError(null)
    setRetrying(false)

    if (!url || !videoRef.current) return

    const video = videoRef.current

    const loadStream = async () => {
      if (!url.includes('.m3u8')) {
        video.src = url
        return
      }

      const Hls = (await import('hls.js')).default

      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url
        } else {
          video.src = url
        }
        return
      }

      const hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr) => { xhr.withCredentials = false },
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => setError(null))

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return

        const detail = data.details || 'unknown'
        const httpCode = data.response?.code
        const reason = data.reason || data.error?.message || ''
        const msg = formatHlsError(detail, httpCode, reason)

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Retry through server proxy to bypass CORS
          hls.destroy()
          hlsRef.current = null
          setRetrying(true)
          const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(url)}`
          const hls2 = new Hls({ enableWorker: true })
          hlsRef.current = hls2
          hls2.loadSource(proxyUrl)
          hls2.attachMedia(video)
          hls2.on(Hls.Events.MANIFEST_PARSED, () => {
            setRetrying(false)
            setError(null)
          })
          hls2.on(Hls.Events.ERROR, (_, d2) => {
            if (d2.fatal) {
              const proxyDetail = d2.details || 'unknown'
              const proxyCode = d2.response?.code
              const proxyReason = d2.reason || d2.error?.message || ''
              const proxyMsg = formatHlsError(proxyDetail, proxyCode, proxyReason)
              hls2.destroy()
              hlsRef.current = null
              setRetrying(false)
              setError(`Поток недоступен: ${proxyMsg}`)
            }
          })
        } else {
          setError(msg)
        }
      })
    }

    loadStream()

    return cleanup
  }, [url, cleanup])

  return (
    <div className={`aspect-video bg-black rounded-lg overflow-hidden relative ${className}`}>
      {url ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            onCanPlay={() => setError(null)}
          />
          {retrying && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
              <Loader2 className="h-8 w-8 mb-2 animate-spin text-blue-400" />
              <p className="text-sm text-muted-foreground">Прокси...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4">
              <XCircle className="h-10 w-10 mb-3 text-red-500" />
              <p className="text-base font-semibold text-center leading-snug max-w-sm">{error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{placeholder}</p>
        </div>
      )}
    </div>
  )
}
