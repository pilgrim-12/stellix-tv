'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { XCircle } from 'lucide-react'
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

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  useEffect(() => {
    cleanup()
    setError(null)

    if (!url || !videoRef.current) return

    const video = videoRef.current
    let proxyTimeout: ReturnType<typeof setTimeout> | null = null

    const loadStream = async () => {
      if (!url.includes('.m3u8')) {
        video.src = url
        return
      }

      const Hls = (await import('hls.js')).default

      if (!Hls.isSupported()) {
        video.src = url
        return
      }

      const hls = new Hls({
        enableWorker: true,
        manifestLoadingMaxRetry: 1,
        levelLoadingMaxRetry: 1,
        fragLoadingMaxRetry: 1,
        manifestLoadingTimeOut: 8000,
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

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Retry through server proxy to bypass CORS
          hls.destroy()
          hlsRef.current = null
          const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(url)}`
          const hls2 = new Hls({
            enableWorker: true,
            manifestLoadingMaxRetry: 1,
            levelLoadingMaxRetry: 1,
            fragLoadingMaxRetry: 1,
            manifestLoadingTimeOut: 10000,
          })
          hlsRef.current = hls2
          hls2.loadSource(proxyUrl)
          hls2.attachMedia(video)

          // Timeout — if proxy doesn't load in 12s, give up
          proxyTimeout = setTimeout(() => {
            if (hlsRef.current === hls2) {
              hls2.destroy()
              hlsRef.current = null
              setError('Таймаут — сервер не отвечает')
            }
          }, 12000)

          hls2.on(Hls.Events.MANIFEST_PARSED, () => {
            if (proxyTimeout) clearTimeout(proxyTimeout)
            setError(null)
          })

          hls2.on(Hls.Events.ERROR, (_, d2) => {
            if (d2.fatal) {
              if (proxyTimeout) clearTimeout(proxyTimeout)
              const proxyCode = d2.response?.code
              const proxyDetail = d2.details || 'unknown'
              const proxyReason = d2.reason || d2.error?.message || ''
              hls2.destroy()
              hlsRef.current = null
              // Show proxy error directly — short message
              setError(formatHlsError(proxyDetail, proxyCode, proxyReason))
            }
          })
        } else {
          setError(formatHlsError(detail, httpCode, reason))
        }
      })
    }

    loadStream()

    return () => {
      if (proxyTimeout) clearTimeout(proxyTimeout)
      cleanup()
    }
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
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4">
              <XCircle className="h-8 w-8 mb-2 text-red-500" />
              <p className="text-sm font-medium text-center max-w-xs">{error}</p>
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
