'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { VisitorSession } from '@/lib/visitorAnalytics'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Nominatim geocoding cache
const geocodeCache = new Map<string, { lat: number; lng: number } | null>()

async function geocodeCity(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city},${country}`
  if (geocodeCache.has(key)) return geocodeCache.get(key) || null

  try {
    const q = encodeURIComponent(`${city}, ${country}`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache.set(key, result)
      return result
    }
  } catch {
    // Geocoding failed
  }
  geocodeCache.set(key, null)
  return null
}

// Country code to approximate center coordinates (fallback when no city)
const countryCenters: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8, lng: -98.5 }, GB: { lat: 51.5, lng: -0.1 }, DE: { lat: 51.2, lng: 10.4 },
  FR: { lat: 46.2, lng: 2.2 }, CA: { lat: 56.1, lng: -106.3 }, AU: { lat: -25.3, lng: 133.8 },
  RU: { lat: 55.8, lng: 37.6 }, JP: { lat: 36.2, lng: 138.3 }, CN: { lat: 35.9, lng: 104.2 },
  IN: { lat: 20.6, lng: 78.9 }, BR: { lat: -14.2, lng: -51.9 }, IT: { lat: 41.9, lng: 12.5 },
  ES: { lat: 40.5, lng: -3.7 }, NL: { lat: 52.1, lng: 5.3 }, SE: { lat: 60.1, lng: 18.6 },
  NO: { lat: 60.5, lng: 8.5 }, DK: { lat: 56.3, lng: 9.5 }, FI: { lat: 61.9, lng: 25.7 },
  PL: { lat: 51.9, lng: 19.1 }, UA: { lat: 48.4, lng: 31.2 }, TR: { lat: 39.0, lng: 35.2 },
  GE: { lat: 42.3, lng: 43.4 }, AZ: { lat: 40.1, lng: 47.6 }, KZ: { lat: 48.0, lng: 68.0 },
  AE: { lat: 23.4, lng: 53.8 }, SA: { lat: 23.9, lng: 45.1 }, IL: { lat: 31.0, lng: 34.9 },
  KR: { lat: 35.9, lng: 127.8 }, TH: { lat: 15.9, lng: 100.5 }, VN: { lat: 14.1, lng: 108.3 },
  MX: { lat: 23.6, lng: -102.6 }, AR: { lat: -38.4, lng: -63.6 }, CL: { lat: -35.7, lng: -71.5 },
  ZA: { lat: -30.6, lng: 22.9 }, NG: { lat: 9.1, lng: 8.7 }, EG: { lat: 26.8, lng: 30.8 },
  PT: { lat: 39.4, lng: -8.2 }, AT: { lat: 47.5, lng: 14.6 }, CH: { lat: 46.8, lng: 8.2 },
  BE: { lat: 50.5, lng: 4.5 }, CZ: { lat: 49.8, lng: 15.5 }, RO: { lat: 46.0, lng: 25.0 },
  IE: { lat: 53.1, lng: -7.7 }, HU: { lat: 47.2, lng: 19.5 }, GR: { lat: 39.1, lng: 21.8 },
}

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
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]))
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 })
    }
  }, [positions, map])
  return null
}

interface VisitorMapProps {
  sessions: VisitorSession[]
}

interface GeocodedSession extends VisitorSession {
  _lat: number
  _lng: number
}

export default function VisitorMap({ sessions }: VisitorMapProps) {
  const [geocodedSessions, setGeocodedSessions] = useState<GeocodedSession[]>([])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    let cancelled = false

    async function geocodeSessions() {
      setIsGeocoding(true)
      const results: GeocodedSession[] = []
      const needsGeocoding: VisitorSession[] = []

      // First pass: sessions that already have coords
      for (const s of sessions) {
        if (s.latitude && s.longitude) {
          results.push({ ...s, _lat: s.latitude, _lng: s.longitude })
        } else {
          needsGeocoding.push(s)
        }
      }

      // Show sessions with coords immediately
      if (!cancelled) {
        setGeocodedSessions([...results])
        setGeocodeProgress({ done: results.length, total: sessions.length })
      }

      // Geocode remaining sessions with city info
      for (const s of needsGeocoding) {
        if (cancelled) break

        let coords: { lat: number; lng: number } | null = null

        if (s.city && s.country) {
          coords = await geocodeCity(s.city, s.country)
        }

        // Fallback to country center
        if (!coords && s.countryCode) {
          coords = countryCenters[s.countryCode.toUpperCase()] || null
        }

        if (coords) {
          // Add small random offset to prevent exact overlap
          const offset = () => (Math.random() - 0.5) * 0.5
          results.push({ ...s, _lat: coords.lat + offset(), _lng: coords.lng + offset() })
        }

        if (!cancelled) {
          setGeocodedSessions([...results])
          setGeocodeProgress({ done: results.length, total: sessions.length })
        }

        // Rate limit Nominatim requests (1 req/sec policy)
        if (s.city && s.country && !geocodeCache.has(`${s.city},${s.country}`)) {
          await new Promise(r => setTimeout(r, 1100))
        }
      }

      if (!cancelled) {
        setIsGeocoding(false)
      }
    }

    if (sessions.length > 0) {
      geocodeSessions()
    }

    return () => { cancelled = true }
  }, [sessions])

  const positions = useMemo(() =>
    geocodedSessions.map(s => [s._lat, s._lng] as [number, number]),
    [geocodedSessions]
  )

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      {/* Progress indicator */}
      {isGeocoding && (
        <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground">
          Loading: {geocodeProgress.done}/{geocodeProgress.total}
        </div>
      )}

      {/* Total count */}
      <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs font-medium">
        {geocodedSessions.length} visitors on map
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

        {geocodedSessions.map((session) => (
          <CircleMarker
            key={session.sessionId}
            center={[session._lat, session._lng]}
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
