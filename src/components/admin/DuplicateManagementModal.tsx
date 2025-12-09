'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { FirebaseChannel } from '@/lib/channelService'
import { ChannelStatus, languageNames } from '@/types'
import {
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Tv,
  ExternalLink,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DuplicateChannel {
  id: string
  playlistId: string
  playlistName: string
  status: string
  isPrimary?: boolean
}

interface DuplicateInfo {
  name: string
  normalizedName: string
  count: number
  channels: DuplicateChannel[]
}

interface DuplicateManagementModalProps {
  isOpen: boolean
  onClose: () => void
  duplicate: DuplicateInfo | null
  channelsData: FirebaseChannel[]
  onApply: (primaryId: string | null, inactiveIds: string[]) => Promise<void>
}

const statusColors: Record<ChannelStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-500 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  broken: 'bg-red-500/20 text-red-500 border-red-500/30',
}

const statusNames: Record<ChannelStatus, string> = {
  pending: 'Ожидает',
  active: 'Рабочий',
  inactive: 'Отключен',
  broken: 'Нерабочий',
}

const statusIcons: Record<ChannelStatus, typeof CheckCircle2> = {
  pending: Clock,
  active: CheckCircle2,
  inactive: Ban,
  broken: XCircle,
}

export function DuplicateManagementModal({
  isOpen,
  onClose,
  duplicate,
  channelsData,
  onApply,
}: DuplicateManagementModalProps) {
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string | null>(null)
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  // Reset state when duplicate changes
  useEffect(() => {
    if (duplicate) {
      // Auto-select the channel that is already marked as primary
      const primaryChannel = duplicate.channels.find(c => c.isPrimary)
      setSelectedPrimaryId(primaryChannel?.id || null)
      setPreviewChannelId(null)
      setPlayerError(null)
    }
  }, [duplicate])

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [])

  // Play preview
  const playPreview = async (channelId: string) => {
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setPreviewChannelId(channelId)
    setPlayerError(null)

    const channel = channelsData.find(ch => ch.id === channelId)
    if (!channel || !videoRef.current) return

    if (channel.url.includes('.m3u8')) {
      const Hls = (await import('hls.js')).default
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hlsRef.current = hls
        hls.loadSource(channel.url)
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setPlayerError('Не удалось загрузить поток')
          }
        })
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = channel.url
      }
    } else {
      videoRef.current.src = channel.url
    }
  }

  // Handle apply
  const handleApply = async () => {
    if (!duplicate) return

    setIsApplying(true)
    try {
      const inactiveIds = duplicate.channels
        .map(c => c.id)
        .filter(id => id !== selectedPrimaryId)

      await onApply(selectedPrimaryId, inactiveIds)
      onClose()
    } catch (error) {
      console.error('Error applying duplicate management:', error)
    } finally {
      setIsApplying(false)
    }
  }

  // Handle deselect (click on already selected item)
  const handleChannelClick = (channelId: string) => {
    if (selectedPrimaryId === channelId) {
      // Deselect if clicking on already selected
      setSelectedPrimaryId(null)
    } else {
      setSelectedPrimaryId(channelId)
    }
  }

  if (!duplicate) return null

  const getFullChannel = (channelId: string) => channelsData.find(ch => ch.id === channelId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Управление дубликатами: {duplicate.name}
          </DialogTitle>
          <DialogDescription>
            Найдено {duplicate.count} источников. Выберите основной источник для использования.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Channel list */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Источники ({duplicate.count})
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                {duplicate.channels.map((dupChannel) => {
                  const fullChannel = getFullChannel(dupChannel.id)
                  const isSelected = selectedPrimaryId === dupChannel.id
                  const isPreviewing = previewChannelId === dupChannel.id
                  const status = (dupChannel.status || 'pending') as ChannelStatus
                  const StatusIcon = statusIcons[status]

                  return (
                    <div
                      key={dupChannel.id}
                      className={cn(
                        'p-3 rounded-lg border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      )}
                      onClick={() => handleChannelClick(dupChannel.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Radio indicator */}
                        <div
                          className={cn(
                            'mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                            isSelected ? 'border-primary' : 'border-muted-foreground'
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>

                        {/* Logo */}
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {fullChannel?.logo ? (
                            <img
                              src={fullChannel.logo}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Tv className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1',
                                statusColors[status]
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusNames[status]}
                            </span>
                            {dupChannel.isPrimary && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                                Основной
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                              {dupChannel.playlistName}
                            </span>
                          </div>

                          <p className="text-sm font-medium truncate">
                            {fullChannel?.name || dupChannel.id}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {fullChannel?.language && (
                              <span>
                                {languageNames[fullChannel.language] || fullChannel.language}
                              </span>
                            )}
                            {fullChannel?.group && (
                              <>
                                <span>•</span>
                                <span>{fullChannel.group}</span>
                              </>
                            )}
                          </div>

                          {/* URL preview */}
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            <span className="truncate max-w-[200px]" title={fullChannel?.url}>
                              {fullChannel?.url?.slice(0, 50)}...
                            </span>
                          </div>
                        </div>

                        {/* Preview button */}
                        <Button
                          variant={isPreviewing ? 'default' : 'outline'}
                          size="sm"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            playPreview(dupChannel.id)
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {isPreviewing ? 'Играет' : 'Тест'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Preview player */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Предпросмотр
              </h4>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {previewChannelId ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      controls
                      autoPlay
                      playsInline
                      muted
                      onError={() => setPlayerError('Ошибка воспроизведения')}
                    />
                    {playerError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-500">
                        <XCircle className="h-8 w-8 mb-2" />
                        <p className="text-sm">{playerError}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Нажмите "Тест" для предпросмотра</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected channel info */}
              {selectedPrimaryId ? (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-1">
                    Выбран как основной:
                  </p>
                  <p className="text-sm">
                    {getFullChannel(selectedPrimaryId)?.name || selectedPrimaryId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Статусы каналов не изменятся — только отметка "основной"
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Кликните на источник ещё раз чтобы снять выбор
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Основной источник не выбран
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Выберите источник или оставьте без выбора
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Статусы каналов не изменятся
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            Отмена
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохраняю...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {selectedPrimaryId ? 'Сохранить выбор' : 'Сохранить без выбора'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
