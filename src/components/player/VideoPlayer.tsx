'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type Hls from 'hls.js'
import { usePlayerStore, useChannelStore } from '@/stores'
import { useSettings } from '@/contexts/SettingsContext'
import { ChevronLeft, ChevronRight, PictureInPicture2, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
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
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const safariListenerRef = useRef<(() => void) | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { currentChannel, markChannelOffline, markChannelOnline, getFilteredChannels, setCurrentChannel } = useChannelStore()
  const currentChannelRef = useRef(currentChannel)
  const { t } = useSettings()
  const {
    isPlaying,
    isMuted,
    volume,
    isLoading,
    error,
    setPlaying,
    setMuted,
    setVolume,
    setLoading,
    setError,
    setFullscreen,
  } = usePlayerStore()

  // Keep currentChannelRef in sync
  useEffect(() => {
    currentChannelRef.current = currentChannel
  }, [currentChannel])

  // Initialize HLS
  const initializePlayer = useCallback(async (url: string) => {
    const video = videoRef.current
    if (!video) return

    // Abort any previous initialization in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Cleanup previous Safari listener
    if (safariListenerRef.current) {
      video.removeEventListener('loadedmetadata', safariListenerRef.current)
      safariListenerRef.current = null
    }

    setLoading(true)
    setError(null)

    // Load HLS.js dynamically
    const Hls = await loadHls()

    // Check if this initialization was aborted while awaiting HLS import
    if (abortController.signal.aborted) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (abortController.signal.aborted) return
        setLoading(false)
        const channel = currentChannelRef.current
        if (channel) markChannelOnline(channel.id)
        // Try to autoplay - browsers may block this without user interaction
        video.play().then(() => {
          if (abortController.signal.aborted) return
          setPlaying(true)
        }).catch(() => {
          if (abortController.signal.aborted) return
          // Autoplay blocked - try muted autoplay as fallback
          video.muted = true
          setMuted(true)
          video.play().then(() => {
            if (abortController.signal.aborted) return
            setPlaying(true)
          }).catch(() => {
            if (abortController.signal.aborted) return
            setPlaying(false)
          })
        })
      })

      // Clear error when stream recovers (fragment loaded successfully)
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (abortController.signal.aborted) return
        setError(null)
      })

      let retryCount = 0
      const maxRetries = 4
      const getRetryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 8000)

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (abortController.signal.aborted) return
        if (data.fatal) {
          retryCount++
          markSessionError()

          if (retryCount <= maxRetries) {
            const delay = getRetryDelay(retryCount - 1)
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError(`Network error - retrying in ${Math.ceil(delay / 1000)}s...`)
                setTimeout(() => {
                  if (abortController.signal.aborted) return
                  hls.startLoad()
                }, delay)
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError(`Media error - retrying in ${Math.ceil(delay / 1000)}s...`)
                setTimeout(() => {
                  if (abortController.signal.aborted) return
                  hls.recoverMediaError()
                }, delay)
                break
              default:
                setError('Channel offline')
                const channel = currentChannelRef.current
                if (channel) markChannelOffline(channel.id)
                hls.destroy()
                break
            }
          } else {
            // Retries exhausted — try through server proxy to bypass CORS
            hls.destroy()
            hlsRef.current = null
            setLoading(true)
            const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(url)}`
            const Hls2 = HlsModule!
            const hls2 = new Hls2({ enableWorker: true })
            hlsRef.current = hls2
            hls2.loadSource(proxyUrl)
            hls2.attachMedia(video)
            hls2.on(Hls2.Events.MANIFEST_PARSED, () => {
              if (abortController.signal.aborted) return
              setLoading(false)
              setError(null)
              const ch = currentChannelRef.current
              if (ch) markChannelOnline(ch.id)
              video.play().then(() => {
                if (abortController.signal.aborted) return
                setPlaying(true)
              }).catch(() => {})
            })
            hls2.on(Hls2.Events.ERROR, (_, d2) => {
              if (abortController.signal.aborted) return
              if (d2.fatal) {
                hls2.destroy()
                hlsRef.current = null
                setError('Канал недоступен')
                setLoading(false)
                const ch = currentChannelRef.current
                if (ch) markChannelOffline(ch.id)
              }
            })
          }
        }
      })

      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = url
      const onLoadedMetadata = () => {
        if (abortController.signal.aborted) return
        setLoading(false)
        video.play().then(() => {
          if (abortController.signal.aborted) return
          setPlaying(true)
        }).catch(() => {
          if (abortController.signal.aborted) return
          video.muted = true
          setMuted(true)
          video.play().then(() => {
            if (abortController.signal.aborted) return
            setPlaying(true)
          }).catch(() => {
            if (abortController.signal.aborted) return
            setPlaying(false)
          })
        })
      }
      safariListenerRef.current = onLoadedMetadata
      video.addEventListener('loadedmetadata', onLoadedMetadata)
    } else {
      setError('HLS is not supported in this browser')
    }
  }, [setLoading, setError, setPlaying, setMuted, markChannelOffline, markChannelOnline])

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
      // Abort any in-flight initialization
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      // Remove Safari listener if active
      if (safariListenerRef.current && videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', safariListenerRef.current)
        safariListenerRef.current = null
      }
      // Close PiP window if open
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close()
        pipWindowRef.current = null
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

  // Update PiP channel info when channel changes
  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed && currentChannel) {
      const info = pipWindowRef.current.document.querySelector('.channel-info')
      if (info) info.textContent = currentChannel.name
    }
  }, [currentChannel])

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
            .spacer { flex: 1; }
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
          <div class="channel-info">${currentChannelRef.current?.name || 'Stellix TV'}</div>
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
              <div class="spacer"></div>
              <button class="btn" id="refreshBtn" title="Reload stream">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
              <button class="btn" id="expandBtn" title="Fullscreen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
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
          setVolume(val)
          updateMuteIcon()
        })

        // Refresh button - reload the stream (use ref to avoid stale closure)
        const refreshBtn = pipDoc.getElementById('refreshBtn') as HTMLButtonElement
        refreshBtn?.addEventListener('click', () => {
          const channel = currentChannelRef.current
          if (channel?.url) {
            initializePlayer(channel.url)
          }
        })

        // Expand button - close PiP and go fullscreen in main browser
        const expandBtn = pipDoc.getElementById('expandBtn') as HTMLButtonElement
        expandBtn?.addEventListener('click', () => {
          // Set flag to enter fullscreen after PiP closes
          const shouldGoFullscreen = true
          pipWindow.close()
          // After PiP closes, video returns to main page, then go fullscreen
          setTimeout(() => {
            if (shouldGoFullscreen && containerRef.current) {
              containerRef.current.requestFullscreen?.().catch(() => {})
            }
          }, 100)
        })

        setIsPiPActive(true)

        // Handle window close - return video to main page
        pipWindow.addEventListener('pagehide', () => {
          video.removeAttribute('controls') // Keep native controls hidden, custom overlay handles UI
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
  }, [isDocPiPSupported, setMuted, setVolume, initializePlayer])

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

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
        setShowVolumeSlider(false)
      }
    }, 3000)
  }, [isPlaying])

  // Show controls on interaction
  const handleInteraction = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  // Toggle play/pause on tap (single tap)
  const handleVideoTap = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  // Channel navigation
  const handlePrevChannel = useCallback(() => {
    const filteredChannels = getFilteredChannels()
    if (currentChannel && filteredChannels.length > 0) {
      const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChannels.length - 1
      setCurrentChannel(filteredChannels[prevIndex])
    }
  }, [currentChannel, getFilteredChannels, setCurrentChannel])

  const handleNextChannel = useCallback(() => {
    const filteredChannels = getFilteredChannels()
    if (currentChannel && filteredChannels.length > 0) {
      const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id)
      const nextIndex = currentIndex < filteredChannels.length - 1 ? currentIndex + 1 : 0
      setCurrentChannel(filteredChannels[nextIndex])
    }
  }, [currentChannel, getFilteredChannels, setCurrentChannel])

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const newMuted = !isMuted
    video.muted = newMuted
    setMuted(newMuted)
  }, [isMuted, setMuted])

  // Volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    video.muted = newVolume === 0
    setMuted(newVolume === 0)
    setVolume(newVolume)
  }, [setMuted, setVolume])

  // Toggle play
  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [isPlaying])

  // Reload stream
  const handleReload = useCallback(() => {
    if (currentChannel?.url) {
      initializePlayer(currentChannel.url)
    }
  }, [currentChannel?.url, initializePlayer])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="video-container group">
      {/* Video wrapper - aspect-video on mobile, flex-1 on desktop */}
      <div
        className="relative aspect-video lg:aspect-auto lg:flex-1 lg:min-h-[200px] bg-black rounded-lg overflow-hidden"
        onDoubleClick={toggleFullscreen}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleVideoTap}
        onMouseMove={handleInteraction}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          autoPlay
          onPlay={handlePlay}
          onPause={handlePause}
        />

        {/* Custom controls overlay */}
        {currentChannel && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3 sm:pb-2 sm:px-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Controls row */}
            <div className="flex items-center gap-1">
              {/* Prev channel */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handlePrevChannel(); }}
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              {/* Next channel */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleNextChannel(); }}
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              {/* Volume control */}
              <div className="flex items-center gap-1 ml-1 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    // On mobile, first tap shows slider, second tap toggles mute
                    if (!showVolumeSlider && window.matchMedia('(max-width: 1023px)').matches) {
                      setShowVolumeSlider(true);
                    } else {
                      handleToggleMute();
                    }
                  }}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                {/* Volume slider - always visible on hover/touch */}
                <div
                  className={`flex items-center transition-all duration-200 overflow-hidden ${showVolumeSlider ? 'w-24 sm:w-20 opacity-100' : 'w-0 opacity-0 lg:w-20 lg:opacity-100'}`}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 cursor-pointer accent-white bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
              </div>

              {/* Live indicator */}
              <span className="live-indicator ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Reload */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleReload(); }}
                title="Reload stream"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              {/* PiP */}
              {isPiPSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20 ${isPiPActive ? 'bg-primary/50' : ''}`}
                  onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                  title={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                title="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
