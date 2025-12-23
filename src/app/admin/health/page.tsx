'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Play,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Tv,
  X,
  Check,
  Square,
} from 'lucide-react'
import {
  getAllCuratedChannelsRaw,
  CuratedChannel,
} from '@/lib/curatedChannelService'
import { useAuthContext } from '@/contexts/AuthContext'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { cn } from '@/lib/utils'

export default function HealthCheckPage() {
  const { user } = useAuthContext()
  const brokenVideoRef = useRef<HTMLVideoElement>(null)
  const brokenHlsRef = useRef<{ destroy: () => void } | null>(null)
  const checkAbortRef = useRef(false)

  const [channels, setChannels] = useState<CuratedChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Channel health check state
  const [isCheckingChannels, setIsCheckingChannels] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ checked: 0, total: 0, broken: 0 })
  const [brokenChannels, setBrokenChannels] = useState<string[]>([])
  const [selectedBrokenIds, setSelectedBrokenIds] = useState<Set<string>>(new Set())
  const [showBrokenModal, setShowBrokenModal] = useState(false)
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null)

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    try {
      const channelsData = await getAllCuratedChannelsRaw()
      setChannels(channelsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Check all channels for broken URLs
  const handleCheckChannels = async () => {
    const activeChannels = channels.filter(ch => ch.status === 'active')
    if (activeChannels.length === 0) return

    setIsCheckingChannels(true)
    checkAbortRef.current = false
    setCheckProgress({ checked: 0, total: activeChannels.length, broken: 0 })
    setBrokenChannels([])

    const broken: string[] = []
    const BATCH_SIZE = 5

    try {
      for (let i = 0; i < activeChannels.length; i += BATCH_SIZE) {
        if (checkAbortRef.current) break

        const batch = activeChannels.slice(i, i + BATCH_SIZE)
        const batchData = batch.map(ch => ({ id: ch.id, url: ch.url }))

        try {
          const response = await fetch('/api/check-channel', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channels: batchData }),
          })

          if (response.ok) {
            const { results } = await response.json()
            for (const result of results) {
              if (!result.online) {
                broken.push(result.id)
              }
            }
          }
        } catch (error) {
          console.error('Error checking batch:', error)
        }

        setCheckProgress({
          checked: Math.min(i + BATCH_SIZE, activeChannels.length),
          total: activeChannels.length,
          broken: broken.length,
        })
        setBrokenChannels([...broken])

        if (i + BATCH_SIZE < activeChannels.length && !checkAbortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    } finally {
      setIsCheckingChannels(false)
    }
  }

  // Stop checking channels
  const handleStopCheck = () => {
    checkAbortRef.current = true
  }

  // Open broken channels modal
  const handleOpenBrokenModal = () => {
    setSelectedBrokenIds(new Set(brokenChannels))
    setPreviewChannelId(null)
    setShowBrokenModal(true)
  }

  // Preview channel in broken modal
  const playBrokenPreview = async (channel: CuratedChannel) => {
    if (brokenHlsRef.current) {
      brokenHlsRef.current.destroy()
      brokenHlsRef.current = null
    }

    setPreviewChannelId(channel.id)

    if (!brokenVideoRef.current) return

    if (channel.url.includes('.m3u8')) {
      const Hls = (await import('hls.js')).default
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        brokenHlsRef.current = hls
        hls.loadSource(channel.url)
        hls.attachMedia(brokenVideoRef.current)
      } else if (brokenVideoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        brokenVideoRef.current.src = channel.url
      }
    } else {
      brokenVideoRef.current.src = channel.url
    }
  }

  // Toggle broken channel selection
  const toggleBrokenSelection = (id: string) => {
    setSelectedBrokenIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select/deselect all broken channels
  const toggleAllBroken = () => {
    if (selectedBrokenIds.size === brokenChannels.length) {
      setSelectedBrokenIds(new Set())
    } else {
      setSelectedBrokenIds(new Set(brokenChannels))
    }
  }

  // Mark selected broken channels
  const handleMarkSelectedBroken = async () => {
    if (selectedBrokenIds.size === 0) return

    try {
      const { bulkUpdateStatus } = await import('@/lib/curatedChannelService')
      await bulkUpdateStatus(Array.from(selectedBrokenIds), 'broken', user?.email || undefined)
      setBrokenChannels(prev => prev.filter(id => !selectedBrokenIds.has(id)))
      setSelectedBrokenIds(new Set())
      setShowBrokenModal(false)
      setCheckProgress({ checked: 0, total: 0, broken: 0 })
      await loadData()
    } catch (error) {
      console.error('Error marking channels as broken:', error)
    }
  }

  // Stats
  const activeChannels = channels.filter(ch => ch.status === 'active').length
  const brokenCount = channels.filter(ch => ch.status === 'broken').length
  const pendingCount = channels.filter(ch => ch.status === 'pending').length

  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1 text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-bold">{activeChannels}</span>
          <span className="opacity-70">active</span>
        </div>
        <div className="flex items-center gap-1 text-red-500">
          <XCircle className="h-3 w-3" />
          <span className="font-bold">{brokenCount}</span>
          <span className="opacity-70">broken</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
        <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )

  return (
    <AdminLayout
      title="Channel Health Check"
      icon={<AlertCircle className="h-5 w-5 text-primary" />}
      headerActions={headerActions}
    >
      <div className="p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-muted">
                  <Tv className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{channels.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeChannels}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{brokenCount}</p>
                  <p className="text-sm text-muted-foreground">Broken</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Check Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              URL Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check all active channels to find broken URLs. This will send a request to each channel URL to verify it&apos;s accessible.
            </p>

            <div className="flex items-center gap-3">
              {!isCheckingChannels ? (
                <Button
                  onClick={handleCheckChannels}
                  disabled={activeChannels === 0 || isLoading}
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Check {activeChannels} Active Channels
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopCheck}
                >
                  <X className="h-5 w-5 mr-2" />
                  Stop Check
                </Button>
              )}
            </div>

            {/* Progress */}
            {(isCheckingChannels || checkProgress.total > 0) && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{checkProgress.checked} / {checkProgress.total}</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(checkProgress.checked / checkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <span className="text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {checkProgress.checked - checkProgress.broken} online
                  </span>
                  <span className="text-red-500 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {checkProgress.broken} broken
                  </span>
                </div>

                {!isCheckingChannels && brokenChannels.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleOpenBrokenModal}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Review {brokenChannels.length} Broken Channels
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Broken Channels */}
        {brokenCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <XCircle className="h-5 w-5" />
                Broken Channels ({brokenCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {channels.filter(ch => ch.status === 'broken').map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5"
                  >
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Tv className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{channel.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broken Channels Modal */}
      <Dialog open={showBrokenModal} onOpenChange={(open) => {
        if (!open && brokenHlsRef.current) {
          brokenHlsRef.current.destroy()
          brokenHlsRef.current = null
        }
        setShowBrokenModal(open)
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Broken Channels ({brokenChannels.length})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Channel list */}
            <div className="flex flex-col overflow-hidden border rounded-lg">
              {/* Select all */}
              <div
                className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 shrink-0"
                onClick={toggleAllBroken}
              >
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  selectedBrokenIds.size === brokenChannels.length && brokenChannels.length > 0
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                )}>
                  {selectedBrokenIds.size === brokenChannels.length && brokenChannels.length > 0 && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm">
                  Select all ({selectedBrokenIds.size} / {brokenChannels.length})
                </span>
              </div>

              {/* Channel list */}
              <div className="flex-1 overflow-auto">
                <div className="space-y-1 p-2">
                  {brokenChannels.map(id => {
                    const channel = channels.find(ch => ch.id === id)
                    if (!channel) return null
                    const isSelected = selectedBrokenIds.has(id)
                    const isPreviewing = previewChannelId === id

                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                          isPreviewing && 'ring-2 ring-blue-500',
                          isSelected
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-border hover:bg-muted/50'
                        )}
                        onClick={() => toggleBrokenSelection(id)}
                      >
                        {/* Checkbox */}
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'border-red-500 bg-red-500'
                            : 'border-muted-foreground'
                        )}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>

                        {/* Logo */}
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tv className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{channel.name}</p>
                        </div>

                        {/* Test button */}
                        <Button
                          variant={isPreviewing ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            playBrokenPreview(channel)
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: Preview player */}
            <div className="flex flex-col gap-2">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {previewChannelId ? (
                  <video
                    ref={brokenVideoRef}
                    className="w-full h-full"
                    controls
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click Play to test channel</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview channel info */}
              {previewChannelId && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  {(() => {
                    const channel = channels.find(ch => ch.id === previewChannelId)
                    if (!channel) return null
                    return (
                      <>
                        <p className="font-medium">{channel.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {channel.url}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toggleBrokenSelection(previewChannelId)
                            }}
                          >
                            {selectedBrokenIds.has(previewChannelId) ? 'Deselect' : 'Select'}
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowBrokenModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkSelectedBroken}
              disabled={selectedBrokenIds.size === 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark {selectedBrokenIds.size} as broken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
