'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  X,
  CheckSquare,
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
function SortableCard({
  channel,
  isActive,
  isSelected,
  selectedCount,
  onSelect,
}: {
  channel: CuratedChannel
  isActive?: boolean
  isSelected?: boolean
  selectedCount?: number
  onSelect?: (id: string, e: React.MouseEvent) => void
}) {
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

  const handleClick = (e: React.MouseEvent) => {
    // If Ctrl/Cmd or Shift is pressed, toggle selection
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      onSelect?.(channel.id, e)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none relative',
        'bg-background hover:bg-muted/50',
        statusColors[channel.status || 'pending'],
        isDragging && 'opacity-50 shadow-xl',
        isActive && 'ring-2 ring-primary',
        isSelected && 'ring-2 ring-blue-500 bg-blue-500/10'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
          {isDragging && selectedCount && selectedCount > 1 ? selectedCount : '✓'}
        </div>
      )}
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

// Overlay card shown while dragging (shows count if multiple selected)
function DragOverlayCard({ channel, selectedCount }: { channel: CuratedChannel; selectedCount: number }) {
  return (
    <div className={cn(
      'flex flex-col items-center p-2 rounded-lg border-2 cursor-grabbing select-none shadow-2xl relative',
      'bg-background',
      selectedCount > 1 ? 'border-blue-500' : statusColors[channel.status || 'pending']
    )}>
      {/* Count badge for multiple selection */}
      {selectedCount > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
          {selectedCount}
        </div>
      )}
      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden mb-1">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-full h-full object-cover" />
        ) : (
          <Tv className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-[10px] font-medium text-center line-clamp-2 leading-tight w-full">
        {selectedCount > 1 ? `${selectedCount} каналов` : channel.name}
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // Reset state when modal opens with new channels
  useEffect(() => {
    if (isOpen) {
      setChannels(initialChannels)
      setHasChanges(false)
      setSearchQuery('')
      setSelectedIds(new Set())
      setLastSelectedId(null)
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

  // Handle selection
  const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)

      // Shift+click for range selection
      if (e.shiftKey && lastSelectedId) {
        const displayIds = displayChannels.map(ch => ch.id)
        const startIdx = displayIds.indexOf(lastSelectedId)
        const endIdx = displayIds.indexOf(id)

        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          for (let i = from; i <= to; i++) {
            newSet.add(displayIds[i])
          }
        }
      } else {
        // Ctrl/Cmd+click for toggle
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
      }

      return newSet
    })
    setLastSelectedId(id)
  }, [lastSelectedId, displayChannels])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string
    setActiveId(draggedId)

    // If dragging a non-selected item, clear selection and select only this one
    if (!selectedIds.has(draggedId)) {
      setSelectedIds(new Set([draggedId]))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setChannels((items) => {
        const activeIndex = items.findIndex((item) => item.id === active.id)
        const overIndex = items.findIndex((item) => item.id === over.id)

        // If we have multiple selected items, move them all together
        if (selectedIds.size > 1 && selectedIds.has(active.id as string)) {
          // Get all selected channels in their current order
          const selectedChannels = items.filter(item => selectedIds.has(item.id))
          // Get all non-selected channels
          const otherChannels = items.filter(item => !selectedIds.has(item.id))

          // Find where to insert (index in otherChannels)
          const overItem = items[overIndex]
          let insertIndex = otherChannels.findIndex(item => item.id === overItem.id)

          // If over item is selected, find the nearest non-selected item
          if (selectedIds.has(overItem.id)) {
            // Insert at the position where the drag ended
            insertIndex = overIndex - selectedChannels.filter((_, i) => {
              const originalIdx = items.findIndex(item => item.id === selectedChannels[i].id)
              return originalIdx < overIndex
            }).length
          }

          if (insertIndex === -1) insertIndex = otherChannels.length

          // Insert all selected channels at the new position
          const result = [
            ...otherChannels.slice(0, insertIndex),
            ...selectedChannels,
            ...otherChannels.slice(insertIndex),
          ]

          return result
        }

        // Single item move
        return arrayMove(items, activeIndex, overIndex)
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
  const selectedCount = selectedIds.size

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

        {/* Search + Selection info */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск каналов..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Selection controls */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-500 flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  Выбрано: {selectedCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3" />
                  Сбросить
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ctrl+клик для выбора нескольких каналов, Shift+клик для диапазона. Перетащите выбранные каналы вместе.
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
                    isSelected={selectedIds.has(channel.id)}
                    selectedCount={selectedCount}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeChannel && (
                <DragOverlayCard
                  channel={activeChannel}
                  selectedCount={selectedIds.has(activeChannel.id) ? selectedCount : 1}
                />
              )}
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
