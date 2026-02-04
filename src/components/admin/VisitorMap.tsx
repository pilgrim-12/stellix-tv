'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { VisitorSession } from '@/lib/visitorAnalytics'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

function DeviceIcon({ device }: { device: string }) {
  switch (device) {
    case 'mobile': return <Smartphone className="h-3 w-3 inline" />
    case 'tablet': return <Tablet className="h-3 w-3 inline" />
    default: return <Monitor className="h-3 w-3 inline" />
  }
}

// Auto-fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      const L = require('leaflet')
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 })
    }
  }, [positions, map])
  return null
}

interface VisitorMapProps {
  sessions: VisitorSession[]
}

export default function VisitorMap({ sessions }: VisitorMapProps) {
  // Only show sessions that have coordinates
  const mappableSessions = useMemo(() =>
    sessions.filter(s => s.latitude && s.longitude),
    [sessions]
  )

  const positions = useMemo(() =>
    mappableSessions.map(s => [s.latitude!, s.longitude!] as [number, number]),
    [mappableSessions]
  )

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      {/* Count */}
      <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs font-medium">
        {mappableSessions.length} / {sessions.length} visitors on map
      </div>

      <MapContainer
        center={[30, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={13}
        style={{ height: '100%', width: '100%' }}
        className="visitor-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds positions={positions} />

        {mappableSessions.map((session) => (
          <CircleMarker
            key={session.sessionId}
            center={[session.latitude!, session.longitude!]}
            radius={6}
            pathOptions={{
              color: session.isAnonymous ? '#f97316' : '#22c55e',
              fillColor: session.isAnonymous ? '#f97316' : '#22c55e',
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup className="visitor-popup">
              <div className="min-w-[220px] text-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    session.isAnonymous
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-green-500/20 text-green-500'
                  }`}>
                    {session.isAnonymous ? 'Anonymous' : 'Logged In'}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DeviceIcon device={session.device} />
                    {session.browser}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    <span>{session.country}{session.city ? `, ${session.city}` : ''}</span>
                  </div>
                  {session.ip && (
                    <div>
                      <span className="text-muted-foreground">IP: </span>
                      <span className="font-mono">{session.ip}</span>
                    </div>
                  )}
                  {!session.isAnonymous && session.userEmail && (
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span>{session.userEmail}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Started: </span>
                    <span>{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last active: </span>
                    <span>{new Date(session.lastActivity).toLocaleString()}</span>
                  </div>
                  {session.channelsWatched > 0 && (
                    <div>
                      <span className="text-muted-foreground">Channels: </span>
                      <span>{session.channelsWatched}</span>
                    </div>
                  )}
                  {session.totalWatchTime > 0 && (
                    <div>
                      <span className="text-muted-foreground">Watch time: </span>
                      <span>{Math.floor(session.totalWatchTime / 60)}m {Math.round(session.totalWatchTime % 60)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
