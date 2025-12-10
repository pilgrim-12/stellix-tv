'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CuratedChannel } from '@/lib/curatedChannelService'
import { ChannelStatus, languageNames } from '@/types'
import {
  Loader2,
  Save,
  Search,
  GripVertical,
  Tv,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ChannelReorderModalProps {
  isOpen: boolean
  onClose: () => void
  channels: CuratedChannel[]
  onSave: (orderedIds: string[]) => Promise<void>
}

const statusColors: Record<ChannelStatus, string> = {
  pending: 'border-yellow-500/50',
  active: 'border-green-500/50',
  inactive: 'border-gray-500/50',
  broken: 'border-red-500/50',
}

// Compact sortable card for grid
function SortableCard({ channel, isActive }: { channel: CuratedChannel; isActive?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: channel.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none',
        'bg-background hover:bg-muted/50',
        statusColors[channel.status || 'pending'],
        isDragging && 'opacity-50 shadow-xl',
        isActive && 'ring-2 ring-primary'
      )}
    >
      {/* Logo */}
      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden mb-1">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-full h-full object-cover" />
        ) : (
          <Tv className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      {/* Name */}
      <p className="text-[10px] font-medium text-center line-clamp-2 leading-tight w-full">
        {channel.name}
      </p>
    </div>
  )
}

// Overlay card shown while dragging
function DragOverlayCard({ channel }: { channel: CuratedChannel }) {
  return (
    <div className={cn(
      'flex flex-col items-center p-2 rounded-lg border-2 cursor-grabbing select-none shadow-2xl',
      'bg-background',
      statusColors[channel.status || 'pending']
    )}>
      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden mb-1">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-full h-full object-cover" />
        ) : (
          <Tv className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-[10px] font-medium text-center line-clamp-2 leading-tight w-full">
        {channel.name}
      </p>
    </div>
  )
}

export function ChannelReorderModal({
  isOpen,
  onClose,
  channels: initialChannels,
  onSave,
}: ChannelReorderModalProps) {
  const [channels, setChannels] = useState<CuratedChannel[]>(initialChannels)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Reset state when modal opens with new channels
  useEffect(() => {
    if (isOpen) {
      setChannels(initialChannels)
      setHasChanges(false)
      setSearchQuery('')
    }
  }, [isOpen, initialChannels])

  // Filter channels by search (but still show all for drag purposes)
  const displayChannels = useMemo(() => {
    if (!searchQuery) return channels
    const query = searchQuery.toLowerCase()
    return channels.filter(ch =>
      ch.name.toLowerCase().includes(query) ||
      (ch.language && languageNames[ch.language]?.toLowerCase().includes(query))
    )
  }, [channels, searchQuery])

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setChannels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const orderedIds = channels.map(ch => ch.id)
      await onSave(orderedIds)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Error saving order:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const activeChannel = activeId ? channels.find(ch => ch.id === activeId) : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            Сортировка каналов
            <span className="text-sm font-normal text-muted-foreground">
              ({channels.length} каналов)
            </span>
            {hasChanges && (
              <span className="text-sm font-normal text-orange-500">
                • Есть изменения
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск каналов..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Перетаскивайте карточки для изменения порядка. Зелёная рамка = активный, жёлтая = ожидает, красная = нерабочий.
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayChannels.map(ch => ch.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16 gap-2">
                {displayChannels.map((channel) => (
                  <SortableCard
                    key={channel.id}
                    channel={channel}
                    isActive={activeId === channel.id}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeChannel && <DragOverlayCard channel={activeChannel} />}
            </DragOverlay>
          </DndContext>
        </div>

        <DialogFooter className="px-4 py-3 border-t shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {searchQuery && `Показано ${displayChannels.length} из ${channels.length}`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить порядок
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
