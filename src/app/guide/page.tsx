'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Header } from '@/components/layout'
import { ProtectedRoute } from '@/components/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sampleChannels } from '@/data/channels'
import { samplePrograms, getCurrentProgram, getUpcomingPrograms } from '@/data/programs'
import { useChannelStore } from '@/stores'
import { useRouter } from 'next/navigation'
import { Channel, TVProgram, languageNames } from '@/types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Clock,
  Calendar,
  Radio,
  Globe,
  Tv
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GuidePage() {
  return (
    <ProtectedRoute>
      <GuideContent />
    </ProtectedRoute>
  )
}

function GuideContent() {
  const router = useRouter()
  const { setCurrentChannel } = useChannelStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const timelineRef = useRef<HTMLDivElement>(null)

  // Filter channels
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return sampleChannels
    const query = searchQuery.toLowerCase()
    return sampleChannels.filter(
      ch => ch.name.toLowerCase().includes(query) || ch.group.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Generate time slots for the day (every 30 minutes)
  const timeSlots = useMemo(() => {
    const slots: Date[] = []
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < 48; i++) {
      const slot = new Date(start)
      slot.setMinutes(i * 30)
      slots.push(slot)
    }
    return slots
  }, [selectedDate])

  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current && selectedDate.toDateString() === new Date().toDateString()) {
      const now = new Date()
      const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
      const scrollPosition = (minutesSinceMidnight / 30) * 80 - 200 // 80px per slot, offset for visibility
      timelineRef.current.scrollLeft = Math.max(0, scrollPosition)
    }
  }, [selectedDate])

  const handleWatchChannel = (channel: Channel) => {
    setCurrentChannel(channel)
    router.push('/watch')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const goToNow = () => {
    setSelectedDate(new Date())
    if (timelineRef.current) {
      const now = new Date()
      const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
      const scrollPosition = (minutesSinceMidnight / 30) * 80 - 200
      timelineRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
    }
  }

  // Calculate current time position
  const now = new Date()
  const isToday = selectedDate.toDateString() === now.toDateString()
  const currentTimePosition = isToday
    ? ((now.getHours() * 60 + now.getMinutes()) / 30) * 80
    : -1

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Guide header */}
        <div className="border-b border-border/40 p-3 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Программа передач</h1>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial sm:w-56">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск каналов..."
                  className="pl-8 h-9"
                />
              </div>

              {/* Date navigation */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[120px] font-medium"
                  onClick={goToNow}
                >
                  {selectedDate.toLocaleDateString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Guide grid */}
        <div className="flex-1 overflow-hidden flex">
          {/* Channel list - fixed */}
          <div className="w-52 shrink-0 border-r border-border/40 flex flex-col">
            {/* Header */}
            <div className="h-10 border-b border-border/40 bg-muted/50 flex items-center px-3">
              <span className="text-xs font-medium text-muted-foreground">Канал</span>
            </div>
            {/* Channels */}
            <div className="flex-1 overflow-y-auto">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="h-16 border-b border-border/40 px-2 py-1.5 flex items-center gap-2 hover:bg-muted/30 cursor-pointer group"
                  onClick={() => handleWatchChannel(channel)}
                >
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="h-10 w-10 object-contain rounded shrink-0"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Tv className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {channel.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize truncate">
                      {channel.group}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleWatchChannel(channel); }}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {filteredChannels.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Каналы не найдены
                </div>
              )}
            </div>
          </div>

          {/* Timeline - scrollable */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Time header */}
            <div className="h-10 border-b border-border/40 bg-muted/50 overflow-hidden">
              <div
                ref={timelineRef}
                className="h-full overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="flex h-full relative" style={{ width: `${48 * 80}px` }}>
                  {timeSlots.map((slot, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-20 shrink-0 flex items-center justify-center text-xs font-medium border-r border-border/40',
                        i % 2 === 0 ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {formatTime(slot)}
                    </div>
                  ))}
                  {/* Current time indicator */}
                  {currentTimePosition > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${currentTimePosition}px` }}
                    >
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Programs grid */}
            <div className="flex-1 overflow-y-auto">
              <div
                className="overflow-x-auto h-full"
                onScroll={(e) => {
                  // Sync timeline scroll with programs scroll
                  if (timelineRef.current) {
                    timelineRef.current.scrollLeft = e.currentTarget.scrollLeft
                  }
                }}
              >
                <div style={{ width: `${48 * 80}px` }}>
                  {filteredChannels.map((channel) => (
                    <ChannelProgramRow
                      key={channel.id}
                      channel={channel}
                      selectedDate={selectedDate}
                      currentTimePosition={currentTimePosition}
                      onWatch={() => handleWatchChannel(channel)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChannelProgramRowProps {
  channel: Channel
  selectedDate: Date
  currentTimePosition: number
  onWatch: () => void
}

function ChannelProgramRow({ channel, selectedDate, currentTimePosition, onWatch }: ChannelProgramRowProps) {
  const programs = useMemo(() => {
    return samplePrograms.filter(p => p.channelId === channel.id)
  }, [channel.id])

  const now = new Date()

  // Generate program blocks
  const programBlocks = useMemo(() => {
    if (programs.length === 0) {
      // No programs - show empty placeholder
      return [{
        id: 'empty',
        title: 'Нет данных о программе',
        category: undefined as string | undefined,
        startTime: undefined as Date | undefined,
        endTime: undefined as Date | undefined,
        left: 0,
        width: 48 * 80,
        isLive: false,
        program: null as TVProgram | null
      }]
    }

    return programs.map(program => {
      const startMinutes = program.startTime.getHours() * 60 + program.startTime.getMinutes()
      const endMinutes = (program.endTime.getHours() || 24) * 60 + program.endTime.getMinutes()
      const left = (startMinutes / 30) * 80
      const width = ((endMinutes - startMinutes) / 30) * 80
      const isLive = program.startTime <= now && program.endTime > now

      return {
        id: program.id,
        title: program.title,
        category: program.category,
        startTime: program.startTime,
        endTime: program.endTime,
        left,
        width: Math.max(width, 40), // minimum width
        isLive,
        program: program as TVProgram | null
      }
    })
  }, [programs, now])

  return (
    <div className="h-16 border-b border-border/40 relative flex">
      {programBlocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            'absolute top-1 bottom-1 rounded px-2 py-1 overflow-hidden cursor-pointer transition-colors',
            block.isLive
              ? 'bg-primary/20 border border-primary/40 hover:bg-primary/30'
              : 'bg-muted/50 hover:bg-muted border border-border/40',
            !block.program && 'bg-muted/20 border-dashed'
          )}
          style={{ left: `${block.left}px`, width: `${block.width}px` }}
          onClick={onWatch}
        >
          <div className="flex items-start gap-1 h-full">
            {block.isLive && (
              <Radio className="h-3 w-3 text-red-500 animate-pulse shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-xs font-medium truncate',
                block.isLive && 'text-primary'
              )}>
                {block.title}
              </p>
              {block.program && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {formatTime(block.startTime!)} - {formatTime(block.endTime!)}
                </p>
              )}
              {block.category && (
                <span className="inline-block mt-0.5 px-1 py-0 text-[9px] rounded bg-background/50 text-muted-foreground capitalize">
                  {block.category}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Current time line */}
      {currentTimePosition > 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: `${currentTimePosition}px` }}
        />
      )}
    </div>
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
