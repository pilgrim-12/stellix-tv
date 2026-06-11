'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
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

interface ChannelReorderModalProps {
  isOpen: boolean
  onClose: () => void
  channels: CuratedChannel[]
  onSave: (orderedIds: string[]) => Promise<void>
}

const statusBorderColors: Record<ChannelStatus, string> = {
  pending: 'border-yellow-500/50',
  active: 'border-green-500/50',
  inactive: 'border-gray-500/50',
  broken: 'border-red-500/50',
}

// Simple draggable card — uses native HTML5 Drag and Drop
function DraggableCard({
  channel,
  isSelected,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  channel: CuratedChannel
  isSelected: boolean
  isDragOver: boolean
  onSelect: (id: string, e: React.MouseEvent) => void
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDrop: (id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        // Tiny transparent image as drag ghost (we show drop indicator instead)
        const img = new Image()
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        e.dataTransfer.setDragImage(img, 0, 0)
        onDragStart(channel.id)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver(e, channel.id)
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(channel.id)
      }}
      onClick={(e) => onSelect(channel.id, e)}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none relative transition-all duration-150',
        'bg-background hover:bg-muted/50',
        statusBorderColors[channel.status || 'pending'],
        isSelected && 'ring-2 ring-blue-500 bg-blue-500/10',
        isDragOver && 'ring-2 ring-primary scale-105'
      )}
    >
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
          ✓
        </div>
      )}
      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden mb-1">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-full h-full object-cover" draggable={false} />
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setChannels(initialChannels)
      setHasChanges(false)
      setSearchQuery('')
      setSelectedIds(new Set())
      setLastSelectedId(null)
      setDragSourceId(null)
      setDragOverId(null)
    }
  }, [isOpen, initialChannels])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onClose])

  // Filter for display
  const displayChannels = useMemo(() => {
    if (!searchQuery) return channels
    const query = searchQuery.toLowerCase()
    return channels.filter(ch =>
      ch.name.toLowerCase().includes(query) ||
      (ch.language && languageNames[ch.language]?.toLowerCase().includes(query))
    )
  }, [channels, searchQuery])

  // Selection
  const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault()
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        if (e.shiftKey && lastSelectedId) {
          const ids = displayChannels.map(ch => ch.id)
          const a = ids.indexOf(lastSelectedId)
          const b = ids.indexOf(id)
          if (a !== -1 && b !== -1) {
            const [from, to] = a < b ? [a, b] : [b, a]
            for (let i = from; i <= to; i++) newSet.add(ids[i])
          }
        } else {
          if (newSet.has(id)) newSet.delete(id)
          else newSet.add(id)
        }
        return newSet
      })
      setLastSelectedId(id)
    }
  }, [lastSelectedId, displayChannels])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  // Native drag handlers
  const handleDragStart = useCallback((id: string) => {
    setDragSourceId(id)
    // If dragging unselected item, select only it
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]))
    }
  }, [selectedIds])

  const handleDragOver = useCallback((_e: React.DragEvent, targetId: string) => {
    setDragOverId(targetId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragSourceId(null)
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback((targetId: string) => {
    if (!dragSourceId || dragSourceId === targetId) {
      setDragSourceId(null)
      setDragOverId(null)
      return
    }

    setChannels(items => {
      const draggingIds = selectedIds.size > 0 && selectedIds.has(dragSourceId)
        ? selectedIds
        : new Set([dragSourceId])

      // Extract dragged items in their current order
      const draggedItems = items.filter(item => draggingIds.has(item.id))
      const remaining = items.filter(item => !draggingIds.has(item.id))

      // Find target position in remaining array
      const targetIdx = remaining.findIndex(item => item.id === targetId)
      if (targetIdx === -1) return items

      // Insert dragged items at target position
      return [
        ...remaining.slice(0, targetIdx),
        ...draggedItems,
        ...remaining.slice(targetIdx),
      ]
    })

    setHasChanges(true)
    setDragSourceId(null)
    setDragOverId(null)
  }, [dragSourceId, selectedIds])

  // Save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(channels.map(ch => ch.id))
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Error saving order:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = selectedIds.size

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => !isSaving && onClose()} />

      {/* Panel */}
      <div className="fixed inset-[2.5vh_2.5vw] z-50 flex flex-col rounded-lg border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Сортировка каналов</h2>
            <span className="text-sm text-muted-foreground">({channels.length})</span>
            {hasChanges && <span className="text-sm text-orange-500">• Есть изменения</span>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search + Selection */}
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
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-500 flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  Выбрано: {selectedCount}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearSelection}>
                  <X className="h-3 w-3" />
                  Сбросить
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Перетаскивайте карточки для сортировки. Ctrl+клик — выбрать несколько, Shift+клик — диапазон.
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16 gap-2">
            {displayChannels.map((channel) => (
              <DraggableCard
                key={channel.id}
                channel={channel}
                isSelected={selectedIds.has(channel.id)}
                isDragOver={dragOverId === channel.id && dragSourceId !== channel.id}
                onSelect={handleSelect}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t shrink-0">
          <p className="text-sm text-muted-foreground">
            {searchQuery && `Показано ${displayChannels.length} из ${channels.length}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохраняю...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Сохранить порядок</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
