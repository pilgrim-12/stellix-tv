'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  UserX,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Loader2,
  RefreshCw,
  MapPin,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getVisitorStatsSummary, getRecentSessions, VisitorSession } from '@/lib/visitorAnalytics'
import { cn } from '@/lib/utils'

// Country flag emoji from country code
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === 'XX') return '🌍'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// Device icon
function DeviceIcon({ device }: { device: string }) {
  switch (device) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />
    case 'tablet':
      return <Tablet className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

// Format time ago
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function VisitorsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<{
    today: { total: number; anonymous: number; loggedIn: number }
    week: { total: number; anonymous: number; loggedIn: number }
    topCountries: { country: string; countryCode: string; count: number }[]
    recentSessions: VisitorSession[]
  } | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await getVisitorStatsSummary()
      setSummary(data)
    } catch (error) {
      console.error('Error loading visitor stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <AdminLayout
      title="Visitor Analytics"
      icon={<Users className="h-5 w-5 text-primary" />}
      headerActions={
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !summary ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No visitor data yet</p>
            <p className="text-sm">Data will appear as visitors browse the site</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Today Total */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.today.total}</p>
                      <p className="text-sm text-muted-foreground">Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today Anonymous */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-500/10">
                      <UserX className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.today.anonymous}</p>
                      <p className="text-sm text-muted-foreground">Anonymous</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today Logged In */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <UserCheck className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.today.loggedIn}</p>
                      <p className="text-sm text-muted-foreground">Logged In</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Week Total */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-500/10">
                      <Globe className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.week.total}</p>
                      <p className="text-sm text-muted-foreground">This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Week Stats Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Anonymous</span>
                      <span className="font-medium">{summary.week.anonymous}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${summary.week.total > 0 ? (summary.week.anonymous / summary.week.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Logged In</span>
                      <span className="font-medium">{summary.week.loggedIn}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${summary.week.total > 0 ? (summary.week.loggedIn / summary.week.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Countries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Top Countries (7 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.topCountries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No country data yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {summary.topCountries.map((country, idx) => (
                        <div
                          key={country.country}
                          className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(country.countryCode)}</span>
                            <span className="font-medium">{country.country}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{country.count} visitors</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Recent Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.recentSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {summary.recentSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getCountryFlag(session.countryCode)}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'text-xs px-1.5 py-0.5 rounded',
                                  session.isAnonymous
                                    ? 'bg-orange-500/20 text-orange-500'
                                    : 'bg-green-500/20 text-green-500'
                                )}>
                                  {session.isAnonymous ? 'Anonymous' : 'User'}
                                </span>
                                <DeviceIcon device={session.device} />
                                <span className="text-xs text-muted-foreground">{session.browser}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {session.country}
                                {session.city && `, ${session.city}`}
                                {!session.isAnonymous && session.userEmail && (
                                  <span className="ml-2 text-foreground">{session.userEmail}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              {formatTimeAgo(session.startTime)}
                            </div>
                            {session.channelsWatched > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {session.channelsWatched} channels
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
