'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Clock,
  Eye,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  getAllChannelStats,
  getTopChannelsByWatchTime,
  getProblematicChannels,
  formatWatchTime,
  ChannelStats,
} from '@/lib/channelAnalytics'
import { cn } from '@/lib/utils'

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [allStats, setAllStats] = useState<ChannelStats[]>([])
  const [topChannels, setTopChannels] = useState<ChannelStats[]>([])
  const [problematicChannels, setProblematicChannels] = useState<(ChannelStats & { quickExitRate: number; errorRate: number })[]>([])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const [all, top, problematic] = await Promise.all([
        getAllChannelStats(),
        getTopChannelsByWatchTime(20),
        getProblematicChannels(),
      ])
      setAllStats(all)
      setTopChannels(top)
      setProblematicChannels(problematic)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Calculate summary stats
  const totalViews = allStats.reduce((sum, s) => sum + s.viewCount, 0)
  const totalWatchTime = allStats.reduce((sum, s) => sum + s.totalWatchTime, 0)
  const totalErrors = allStats.reduce((sum, s) => sum + s.errorCount, 0)
  const avgWatchTime = allStats.length > 0
    ? Math.round(totalWatchTime / totalViews)
    : 0

  return (
    <AdminLayout
      title="Channel Statistics"
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      headerActions={
        <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoading}>
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
        ) : allStats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No statistics collected yet.</p>
            <p className="text-sm mt-2">Stats will appear after users start watching channels.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Eye className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Clock className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatWatchTime(totalWatchTime)}</p>
                      <p className="text-sm text-muted-foreground">Total Watch Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatWatchTime(avgWatchTime)}</p>
                      <p className="text-sm text-muted-foreground">Avg per View</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalErrors.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Playback Errors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Top Channels by Watch Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {topChannels.map((stat, index) => (
                      <div
                        key={stat.channelId}
                        className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50"
                      >
                        <span className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          index === 0 && 'bg-yellow-500/20 text-yellow-500',
                          index === 1 && 'bg-gray-400/20 text-gray-400',
                          index === 2 && 'bg-orange-500/20 text-orange-500',
                          index > 2 && 'bg-muted text-muted-foreground'
                        )}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{stat.channelName}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.viewCount} views
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-500">
                            {formatWatchTime(stat.totalWatchTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {topChannels.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No data yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Problematic Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Problematic Channels
                    {problematicChannels.length > 0 && (
                      <span className="text-sm font-normal text-orange-500">
                        ({problematicChannels.length})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {problematicChannels.map((stat) => (
                      <div
                        key={stat.channelId}
                        className="flex items-center gap-3 p-2 rounded-lg border border-orange-500/30 bg-orange-500/5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{stat.channelName}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.viewCount} views
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs">
                          {stat.quickExitRate > 30 && (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                              {stat.quickExitRate.toFixed(0)}% quick exit
                            </span>
                          )}
                          {stat.errorRate > 20 && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                              {stat.errorRate.toFixed(0)}% errors
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {problematicChannels.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No problematic channels detected
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Channels Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  All Channel Stats ({allStats.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left text-muted-foreground">
                        <th className="p-2">Channel</th>
                        <th className="p-2 text-right">Views</th>
                        <th className="p-2 text-right">Watch Time</th>
                        <th className="p-2 text-right">Quick Exits</th>
                        <th className="p-2 text-right">Errors</th>
                        <th className="p-2 text-right">Last Watched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStats.map((stat) => (
                        <tr key={stat.channelId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium truncate max-w-[200px]">
                            {stat.channelName}
                          </td>
                          <td className="p-2 text-right">{stat.viewCount}</td>
                          <td className="p-2 text-right text-green-500">
                            {formatWatchTime(stat.totalWatchTime)}
                          </td>
                          <td className="p-2 text-right">
                            <span className={cn(
                              stat.viewCount > 0 && (stat.quickExitCount / stat.viewCount) > 0.3
                                ? 'text-yellow-500'
                                : 'text-muted-foreground'
                            )}>
                              {stat.quickExitCount}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <span className={cn(
                              stat.errorCount > 0 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                              {stat.errorCount}
                            </span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground text-xs">
                            {stat.lastWatched
                              ? new Date(stat.lastWatched).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
