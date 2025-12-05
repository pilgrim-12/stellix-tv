'use client'

import { useState, useMemo } from 'react'
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
  Globe
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

  // Filter channels
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return sampleChannels
    const query = searchQuery.toLowerCase()
    return sampleChannels.filter(
      ch => ch.name.toLowerCase().includes(query) || ch.group.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Generate time slots for the day (every hour)
  const timeSlots = useMemo(() => {
    const slots: Date[] = []
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < 24; i++) {
      const slot = new Date(start)
      slot.setHours(i)
      slots.push(slot)
    }
    return slots
  }, [selectedDate])

  const handleWatchChannel = (channel: Channel) => {
    setCurrentChannel(channel)
    router.push('/watch')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const isCurrentHour = (hour: number) => {
    const now = new Date()
    return now.getHours() === hour && selectedDate.toDateString() === now.toDateString()
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Guide header */}
        <div className="border-b border-border/40 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">TV Guide</h1>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="pl-10"
                />
              </div>

              {/* Date navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {selectedDate.toLocaleDateString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
                <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Guide grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[1200px]">
            {/* Time header */}
            <div className="sticky top-0 z-20 flex bg-background border-b border-border/40">
              <div className="w-48 shrink-0 p-2 font-medium text-sm border-r border-border/40 bg-muted/30">
                Channel
              </div>
              <div className="flex">
                {timeSlots.map((slot, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-32 shrink-0 p-2 text-center text-xs font-medium border-r border-border/40',
                      isCurrentHour(i) && 'bg-primary/10 text-primary'
                    )}
                  >
                    {formatTime(slot)}
                  </div>
                ))}
              </div>
            </div>

            {/* Channels */}
            {filteredChannels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                timeSlots={timeSlots}
                onWatch={() => handleWatchChannel(channel)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChannelRowProps {
  channel: Channel
  timeSlots: Date[]
  onWatch: () => void
}

function ChannelRow({ channel, timeSlots, onWatch }: ChannelRowProps) {
  const programs = useMemo(() => {
    return samplePrograms.filter(p => p.channelId === channel.id)
  }, [channel.id])

  const currentProgram = getCurrentProgram(channel.id)
  const languageName = channel.language ? languageNames[channel.language] || channel.language.toUpperCase() : null

  return (
    <div className="flex border-b border-border/40 hover:bg-muted/20">
      {/* Channel info */}
      <div
        className="w-48 shrink-0 p-2 border-r border-border/40 cursor-pointer hover:bg-muted/30"
        onClick={onWatch}
      >
        <div className="flex items-center gap-2">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="h-8 w-8 object-contain rounded"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          ) : (
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
              {channel.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{channel.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{channel.group}</span>
              {languageName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Globe className="h-3 w-3" />
                    {languageName}
                  </span>
                </>
              )}
            </div>
          </div>
          <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={(e) => { e.stopPropagation(); onWatch(); }}>
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Program grid */}
      <div className="flex relative">
        {timeSlots.map((slot, i) => {
          const program = programs.find(p => {
            const pStart = p.startTime.getHours()
            const pEnd = p.endTime.getHours() || 24
            return i >= pStart && i < pEnd
          })

          // Only render program at its start hour
          const isStart = program && program.startTime.getHours() === i
          const duration = program ? (program.endTime.getHours() || 24) - program.startTime.getHours() : 1

          if (program && !isStart) return null

          return (
            <ProgramCell
              key={i}
              program={program}
              duration={duration}
              isCurrentHour={new Date().getHours() === i}
            />
          )
        }).filter(Boolean)}

        {/* Fill empty slots */}
        {programs.length === 0 && timeSlots.map((_, i) => (
          <div key={i} className="w-32 shrink-0 p-2 border-r border-border/40" />
        ))}
      </div>
    </div>
  )
}

interface ProgramCellProps {
  program?: TVProgram
  duration: number
  isCurrentHour: boolean
}

function ProgramCell({ program, duration, isCurrentHour }: ProgramCellProps) {
  if (!program) {
    return <div className="w-32 shrink-0 p-2 border-r border-border/40" />
  }

  const now = new Date()
  const isLive = program.startTime <= now && program.endTime > now

  return (
    <div
      className={cn(
        'shrink-0 p-2 border-r border-border/40 cursor-pointer hover:bg-muted/30 group',
        isLive && 'bg-primary/5'
      )}
      style={{ width: `${duration * 128}px` }}
    >
      <div className="flex items-start gap-1">
        {isLive && (
          <span className="shrink-0 mt-0.5">
            <Radio className="h-3 w-3 text-red-500 animate-pulse" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
            {program.title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {program.startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} -
            {program.endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {program.category && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground capitalize">
              {program.category}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
