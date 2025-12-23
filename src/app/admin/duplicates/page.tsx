'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Copy,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Tv,
} from 'lucide-react'
import {
  getAllCuratedChannelsRaw,
  getPlaylistSources,
  findDuplicateChannels,
  setPrimaryChannel,
  CuratedChannel,
  PlaylistSource,
  DuplicateInfo,
} from '@/lib/curatedChannelService'
import { DuplicateManagementModal } from '@/components/admin/DuplicateManagementModal'
import { useAuthContext } from '@/contexts/AuthContext'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { cn } from '@/lib/utils'

export default function DuplicatesPage() {
  const { user } = useAuthContext()

  const [channels, setChannels] = useState<CuratedChannel[]>([])
  const [playlistSources, setPlaylistSources] = useState<PlaylistSource[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Duplicates state
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false)
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateInfo | null>(null)
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [channelsData, sourcesData] = await Promise.all([
        getAllCuratedChannelsRaw(),
        getPlaylistSources(),
      ])
      setChannels(channelsData)
      setPlaylistSources(sourcesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Find duplicates
  const handleFindDuplicates = async () => {
    setIsLoadingDuplicates(true)
    try {
      const found = await findDuplicateChannels(playlistSources)
      setDuplicates(found)
    } catch (error) {
      console.error('Error finding duplicates:', error)
    } finally {
      setIsLoadingDuplicates(false)
    }
  }

  // Handle duplicate management
  const handleDuplicateApply = async (primaryId: string | null, idsToDeactivate: string[], type: 'name' | 'url') => {
    // Deactivate duplicates (set status to inactive)
    if (idsToDeactivate.length > 0) {
      const { bulkUpdateStatus } = await import('@/lib/curatedChannelService')
      await bulkUpdateStatus(idsToDeactivate, 'inactive', user?.email || undefined)
    }
    // Set primary
    await setPrimaryChannel(primaryId, [])
    // Refresh duplicates list
    await handleFindDuplicates()
    // Reload channels
    await loadData()
  }

  // Stats
  const urlDuplicates = duplicates.filter(d => d.type === 'url')
  const nameDuplicates = duplicates.filter(d => d.type === 'name')

  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Total channels:</span>
        <span className="font-bold">{channels.length}</span>
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={handleFindDuplicates}
        disabled={isLoadingDuplicates || isLoading}
      >
        {isLoadingDuplicates ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        Find Duplicates
      </Button>
      <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
        <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )

  return (
    <AdminLayout
      title="Duplicate Management"
      icon={<Copy className="h-5 w-5 text-primary" />}
      headerActions={headerActions}
    >
      <div className="p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <Copy className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{duplicates.length}</p>
                  <p className="text-sm text-muted-foreground">Total groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{urlDuplicates.length}</p>
                  <p className="text-sm text-muted-foreground">Same URL</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <Tv className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{nameDuplicates.length}</p>
                  <p className="text-sm text-muted-foreground">Same name</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Duplicates list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* URL Duplicates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <XCircle className="h-5 w-5" />
                Same URL ({urlDuplicates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || isLoadingDuplicates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : urlDuplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {duplicates.length === 0 ? 'Click "Find Duplicates" to scan' : 'No URL duplicates found'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {urlDuplicates.map((dup) => (
                    <div
                      key={`url-${dup.normalizedName}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedDuplicate(dup)
                        setShowDuplicatesModal(true)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{dup.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dup.count} channels with same URL
                        </p>
                      </div>
                      <span className="text-sm px-3 py-1 rounded bg-red-500/20 text-red-500 font-medium">
                        x{dup.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Name Duplicates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500">
                <Tv className="h-5 w-5" />
                Same Name ({nameDuplicates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || isLoadingDuplicates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : nameDuplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {duplicates.length === 0 ? 'Click "Find Duplicates" to scan' : 'No name duplicates found'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {nameDuplicates.map((dup) => (
                    <div
                      key={`name-${dup.normalizedName}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedDuplicate(dup)
                        setShowDuplicatesModal(true)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{dup.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dup.count} different sources
                        </p>
                      </div>
                      <span className="text-sm px-3 py-1 rounded bg-orange-500/20 text-orange-500 font-medium">
                        x{dup.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Duplicate Management Modal */}
      <DuplicateManagementModal
        isOpen={showDuplicatesModal}
        onClose={() => {
          setShowDuplicatesModal(false)
          setSelectedDuplicate(null)
        }}
        duplicate={selectedDuplicate}
        channelsData={channels}
        onApply={handleDuplicateApply}
      />
    </AdminLayout>
  )
}
