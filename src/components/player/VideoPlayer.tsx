'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type Hls from 'hls.js'
import { usePlayerStore, useChannelStore } from '@/stores'
import { useSettings } from '@/contexts/SettingsContext'
import { ChevronLeft, ChevronRight, PictureInPicture2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startWatchSession, endWatchSession, markSessionError } from '@/lib/channelAnalytics'

// Document PiP types
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

// Lazy load HLS.js only when needed
let HlsModule: typeof Hls | null = null
const loadHls = async () => {
  if (!HlsModule) {
    HlsModule = (await import('hls.js')).default
  }
  return HlsModule
}

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [isPiPActive, setIsPiPActive] = useState(false)
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const [isDocPiPSupported, setIsDocPiPSupported] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)

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
  const initializePlayer = useCallback(async (url: string) => {
    const video = videoRef.current
    if (!video) return

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setLoading(true)
    setError(null)

    // Load HLS.js dynamically
    const Hls = await loadHls()

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

      // Clear error when stream recovers (fragment loaded successfully)
      hls.on(Hls.Events.FRAG_LOADED, () => {
        setError(null)
      })

      let retryCount = 0
      const maxRetries = 2

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          retryCount++
          // Mark analytics session as having error
          markSessionError()
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
      // Start analytics tracking for new channel
      startWatchSession(currentChannel.id, currentChannel.name)
      initializePlayer(currentChannel.url)
    }

    return () => {
      // End analytics tracking when channel changes or component unmounts
      endWatchSession(false)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [currentChannel?.url, currentChannel?.id, currentChannel?.name, initializePlayer])

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

  // Check PiP support and handle PiP events
  useEffect(() => {
    setIsPiPSupported('pictureInPictureEnabled' in document && document.pictureInPictureEnabled)
    setIsDocPiPSupported('documentPictureInPicture' in window)

    const video = videoRef.current
    if (!video) return

    const handleEnterPiP = () => setIsPiPActive(true)
    const handleLeavePiP = () => setIsPiPActive(false)

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [])

  // Setup Media Session API for PiP metadata
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const video = videoRef.current
    if (!video || !currentChannel) return

    // Set media metadata for PiP window
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentChannel.name,
      artist: currentChannel.group || 'Live TV',
      album: 'Stellix TV',
      artwork: currentChannel.logo ? [
        { src: currentChannel.logo, sizes: '96x96', type: 'image/png' },
        { src: currentChannel.logo, sizes: '256x256', type: 'image/png' },
      ] : [],
    })

    // Handle play/pause actions from PiP
    navigator.mediaSession.setActionHandler('play', () => {
      video.play()
      setPlaying(true)
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      video.pause()
      setPlaying(false)
    })

    return () => {
      // Cleanup action handlers
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [currentChannel, setPlaying])

  // Toggle Picture-in-Picture (with Document PiP for volume control)
  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      // If Document PiP is active, close it
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close()
        pipWindowRef.current = null
        setIsPiPActive(false)
        return
      }

      // If regular PiP is active, exit
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        return
      }

      // Try Document PiP first (supports custom controls with volume slider)
      if (isDocPiPSupported && window.documentPictureInPicture) {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 400,
          height: 300,
        })
        pipWindowRef.current = pipWindow

        // Copy styles to PiP window
        const pipDoc = pipWindow.document
        pipDoc.head.innerHTML = `
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: #000;
              display: flex;
              flex-direction: column;
              height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .video-wrapper { flex: 1; position: relative; overflow: hidden; }
            video { width: 100%; height: 100%; object-fit: contain; }
            .controls {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: linear-gradient(transparent, rgba(0,0,0,0.8));
              padding: 12px;
              display: flex;
              align-items: center;
              gap: 8px;
              opacity: 0;
              transition: opacity 0.2s;
            }
            .video-wrapper:hover .controls { opacity: 1; }
            .btn {
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .btn:hover { background: rgba(255,255,255,0.3); }
            .btn svg { width: 18px; height: 18px; }
            .volume-slider {
              flex: 1;
              max-width: 100px;
              height: 4px;
              -webkit-appearance: none;
              appearance: none;
              background: rgba(255,255,255,0.3);
              border-radius: 2px;
              cursor: pointer;
            }
            .volume-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
            }
            .channel-info {
              color: white;
              font-size: 12px;
              padding: 8px 12px;
              background: rgba(0,0,0,0.5);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        `

        // Create PiP content
        pipDoc.body.innerHTML = `
          <div class="channel-info">${currentChannel?.name || 'Stellix TV'}</div>
          <div class="video-wrapper">
            <div class="controls">
              <button class="btn" id="muteBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              </button>
              <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.05" value="${video.muted ? 0 : video.volume}">
            </div>
          </div>
        `

        // Move video to PiP window and hide native controls
        const wrapper = pipDoc.querySelector('.video-wrapper')
        const controls = pipDoc.querySelector('.controls')
        video.removeAttribute('controls') // Hide native browser controls in PiP
        wrapper?.insertBefore(video, controls)

        // Setup volume controls
        const muteBtn = pipDoc.getElementById('muteBtn') as HTMLButtonElement
        const volumeSlider = pipDoc.getElementById('volumeSlider') as HTMLInputElement

        const updateMuteIcon = () => {
          if (muteBtn) {
            muteBtn.innerHTML = video.muted || video.volume === 0
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>'
          }
        }

        muteBtn?.addEventListener('click', () => {
          video.muted = !video.muted
          setMuted(video.muted)
          if (volumeSlider) volumeSlider.value = video.muted ? '0' : String(video.volume)
          updateMuteIcon()
        })

        volumeSlider?.addEventListener('input', (e) => {
          const val = parseFloat((e.target as HTMLInputElement).value)
          video.volume = val
          video.muted = val === 0
          setMuted(val === 0)
          usePlayerStore.getState().setVolume(val)
          updateMuteIcon()
        })

        setIsPiPActive(true)

        // Handle window close - return video to main page
        pipWindow.addEventListener('pagehide', () => {
          video.setAttribute('controls', '') // Restore native controls
          const mainWrapper = containerRef.current?.querySelector('.relative')
          if (mainWrapper && video.parentElement !== mainWrapper) {
            mainWrapper.insertBefore(video, mainWrapper.firstChild)
          }
          pipWindowRef.current = null
          setIsPiPActive(false)
        })
      } else if (document.pictureInPictureEnabled) {
        // Fallback to regular PiP (no volume control)
        await video.requestPictureInPicture()
      }
    } catch (error) {
      console.error('PiP error:', error)
    }
  }, [isDocPiPSupported, currentChannel, setMuted])

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

        {/* PiP button - top right corner */}
        {isPiPSupported && currentChannel && (
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 z-20 h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity ${isPiPActive ? 'bg-primary/50' : ''}`}
            onClick={togglePiP}
            title={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
          >
            <PictureInPicture2 className="h-4 w-4" />
          </Button>
        )}

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
