'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RefreshCw,
  Loader2,
  Users,
  Search,
  Shield,
  ShieldOff,
  Globe,
  Mail,
  Calendar,
  Eye,
  Heart,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  Tv,
  History,
  Network,
  Settings,
} from 'lucide-react'
import {
  setUserAsAdmin,
  removeUserAdmin,
  getAllUsers,
  saveUserCountry,
  getUserDetailedInfo,
  UserDetailedInfo,
  WatchHistoryEntry,
} from '@/lib/userService'
import { useAuthContext } from '@/contexts/AuthContext'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { cn } from '@/lib/utils'

type UserData = Awaited<ReturnType<typeof getAllUsers>>[0]
type SortField = 'email' | 'totalVisits' | 'favoritesCount' | 'lastVisit' | 'createdAt' | 'country'
type SortDirection = 'asc' | 'desc'

export default function UsersPage() {
  const { user } = useAuthContext()

  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null)
  const [detectingCountryId, setDetectingCountryId] = useState<string | null>(null)

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all')
  const [filterCountry, setFilterCountry] = useState<string>('all')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lastVisit')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // User details panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetailedInfo | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    withFavorites: 0,
    activeToday: 0,
    countries: [] as string[],
  })

  // Load users
  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const users = await getAllUsers()

      // Auto-detect countries for users without country
      const usersWithUpdates = await Promise.all(
        users.map(async (u) => {
          if (u.lastIP && !u.country) {
            try {
              const res = await fetch(`https://ipapi.co/${u.lastIP}/json/`)
              const data = await res.json()
              if (data.country_name) {
                await saveUserCountry(u.id, data.country_name)
                return { ...u, country: data.country_name }
              }
            } catch {
              // Skip failed requests
            }
          }
          return u
        })
      )

      setAllUsers(usersWithUpdates)

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const countries = [...new Set(usersWithUpdates.map(u => u.country).filter(Boolean))] as string[]

      setStats({
        total: usersWithUpdates.length,
        admins: usersWithUpdates.filter(u => u.isAdmin).length,
        withFavorites: usersWithUpdates.filter(u => (u.favoritesCount || 0) > 0).length,
        activeToday: usersWithUpdates.filter(u => {
          if (!u.lastVisit) return false
          const visitDate = u.lastVisit.toDate()
          return visitDate >= today
        }).length,
        countries,
      })
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Load user details when selected
  const loadUserDetails = async (userId: string) => {
    setSelectedUserId(userId)
    setLoadingDetails(true)
    try {
      const details = await getUserDetailedInfo(userId)
      setUserDetails(details)
    } catch (error) {
      console.error('Error loading user details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Toggle admin status
  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdminId(userId)
    try {
      if (currentIsAdmin) {
        await removeUserAdmin(userId)
      } else {
        await setUserAsAdmin(userId)
      }
      setAllUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u
      ))
      setStats(prev => ({
        ...prev,
        admins: currentIsAdmin ? prev.admins - 1 : prev.admins + 1,
      }))
      // Update details panel if open
      if (userDetails?.id === userId) {
        setUserDetails({ ...userDetails, isAdmin: !currentIsAdmin })
      }
    } catch (error) {
      console.error('Error toggling admin:', error)
    } finally {
      setTogglingAdminId(null)
    }
  }

  // Detect country for single user
  const detectCountry = async (userId: string, ip: string) => {
    setDetectingCountryId(userId)
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`)
      const data = await res.json()
      if (data.country_name) {
        await saveUserCountry(userId, data.country_name)
        setAllUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, country: data.country_name } : u
        ))
      }
    } catch (error) {
      console.error('Error detecting country:', error)
    } finally {
      setDetectingCountryId(null)
    }
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  // Filter and sort users
  const filteredUsers = allUsers
    .filter(u => {
      const matchesSearch = !searchQuery ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastIP?.includes(searchQuery) ||
        u.country?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesAdmin = filterAdmin === 'all' ||
        (filterAdmin === 'admin' && u.isAdmin) ||
        (filterAdmin === 'user' && !u.isAdmin)
      const matchesCountry = filterCountry === 'all' || u.country === filterCountry
      return matchesSearch && matchesAdmin && matchesCountry
    })
    .sort((a, b) => {
      let aVal: string | number | Date = ''
      let bVal: string | number | Date = ''

      switch (sortField) {
        case 'email':
          aVal = a.email || ''
          bVal = b.email || ''
          break
        case 'totalVisits':
          aVal = a.totalVisits || 0
          bVal = b.totalVisits || 0
          break
        case 'favoritesCount':
          aVal = a.favoritesCount || 0
          bVal = b.favoritesCount || 0
          break
        case 'lastVisit':
          aVal = a.lastVisit?.toDate() || new Date(0)
          bVal = b.lastVisit?.toDate() || new Date(0)
          break
        case 'createdAt':
          aVal = a.createdAt?.toDate() || new Date(0)
          bVal = b.createdAt?.toDate() || new Date(0)
          break
        case 'country':
          aVal = a.country || ''
          bVal = b.country || ''
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  // Format watch history time
  const formatWatchTime = (entry: WatchHistoryEntry) => {
    const date = entry.watchedAt.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const headerStats = (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="font-bold">{stats.total}</span>
        <span className="text-muted-foreground">total</span>
      </div>
      <div className="flex items-center gap-1 text-green-500">
        <Shield className="h-3 w-3" />
        <span className="font-bold">{stats.admins}</span>
        <span className="opacity-70">admins</span>
      </div>
      <div className="flex items-center gap-1 text-purple-500">
        <Heart className="h-3 w-3" />
        <span className="font-bold">{stats.withFavorites}</span>
        <span className="opacity-70">with favs</span>
      </div>
      <div className="flex items-center gap-1 text-blue-500">
        <Eye className="h-3 w-3" />
        <span className="font-bold">{stats.activeToday}</span>
        <span className="opacity-70">today</span>
      </div>
      <div className="flex items-center gap-1 text-orange-500">
        <Globe className="h-3 w-3" />
        <span className="font-bold">{stats.countries.length}</span>
        <span className="opacity-70">countries</span>
      </div>
      <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
        <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )

  return (
    <AdminLayout
      title="User Management"
      icon={<Users className="h-5 w-5 text-primary" />}
      headerActions={headerStats}
    >
      <div className="p-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className={cn("flex-1 min-w-0", selectedUserId && "max-w-[calc(100%-400px)]")}>
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by email, ID, IP, or country..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Admin filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={filterAdmin === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterAdmin('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterAdmin === 'admin' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterAdmin('admin')}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Admins
                      </Button>
                      <Button
                        variant={filterAdmin === 'user' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterAdmin('user')}
                      >
                        Users
                      </Button>
                    </div>
                  </div>

                  {/* Country filter */}
                  {stats.countries.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Country:</span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                      >
                        <option value="all">All countries</option>
                        {stats.countries.sort().map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Users ({filteredUsers.length}{filteredUsers.length !== stats.total ? ` of ${stats.total}` : ''})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="overflow-auto max-h-[calc(100vh-320px)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-4 py-3 font-medium">
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => handleSort('email')}
                            >
                              Email
                              <SortIcon field="email" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-medium">
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => handleSort('country')}
                            >
                              IP / Country
                              <SortIcon field="country" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            <button
                              className="flex items-center justify-center hover:text-foreground mx-auto"
                              onClick={() => handleSort('totalVisits')}
                            >
                              Visits
                              <SortIcon field="totalVisits" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-medium text-center">
                            <button
                              className="flex items-center justify-center hover:text-foreground mx-auto"
                              onClick={() => handleSort('favoritesCount')}
                            >
                              Favs
                              <SortIcon field="favoritesCount" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-medium">
                            <button
                              className="flex items-center hover:text-foreground"
                              onClick={() => handleSort('lastVisit')}
                            >
                              Last Visit
                              <SortIcon field="lastVisit" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-medium text-center">Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredUsers.map((u) => (
                          <tr
                            key={u.id}
                            className={cn(
                              "hover:bg-muted/50 cursor-pointer transition-colors",
                              selectedUserId === u.id && "bg-primary/10"
                            )}
                            onClick={() => loadUserDetails(u.id)}
                          >
                            <td className="px-4 py-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{u.email || '—'}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                                  {u.id.slice(0, 16)}...
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs">
                                {u.lastIP ? (
                                  <div>
                                    <div className="font-mono">{u.lastIP}</div>
                                    {u.country && (
                                      <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                        <Globe className="h-3 w-3" />
                                        {u.country}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "font-bold",
                                (u.totalVisits || 0) >= 100 && "text-green-500",
                                (u.totalVisits || 0) >= 10 && (u.totalVisits || 0) < 100 && "text-blue-500",
                              )}>
                                {u.totalVisits || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                (u.favoritesCount || 0) > 0 && "text-purple-500 font-medium"
                              )}>
                                {u.favoritesCount || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-muted-foreground">
                                {u.lastVisit ? (
                                  <>
                                    <div>{u.lastVisit.toDate().toLocaleDateString('en-US')}</div>
                                    <div>{u.lastVisit.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                  </>
                                ) : '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {u.isAdmin ? (
                                <span className="inline-flex items-center gap-1 text-green-500 font-medium text-xs">
                                  <Shield className="h-3 w-3" />
                                  Yes
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Details Panel */}
          {selectedUserId && (
            <div className="w-[380px] shrink-0">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">User Details</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedUserId(null)
                        setUserDetails(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : userDetails ? (
                    <>
                      {/* Basic Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{userDetails.email || 'No email'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono break-all">
                          {userDetails.id}
                        </div>
                        {userDetails.isAdmin && (
                          <div className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
                            <Shield className="h-3 w-3" />
                            Admin
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold">{userDetails.totalVisits || 0}</div>
                          <div className="text-[10px] text-muted-foreground">Visits</div>
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-purple-500">{userDetails.favorites.length}</div>
                          <div className="text-[10px] text-muted-foreground">Favorites</div>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-blue-500">{userDetails.watchHistory.length}</div>
                          <div className="text-[10px] text-muted-foreground">History</div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Registered:</span>
                          <span>{userDetails.createdAt?.toDate().toLocaleDateString('en-US') || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Last visit:</span>
                          <span>
                            {userDetails.lastVisit?.toDate().toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || '—'}
                          </span>
                        </div>
                      </div>

                      {/* IP Addresses */}
                      {userDetails.ipAddresses && userDetails.ipAddresses.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium mb-2">
                            <Network className="h-3 w-3" />
                            IP Addresses ({userDetails.ipAddresses.length})
                          </div>
                          <div className="max-h-20 overflow-auto space-y-1">
                            {userDetails.ipAddresses.map((ip, i) => (
                              <div key={i} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                                <span>{ip}</span>
                                {ip === userDetails.lastIP && (
                                  <span className="text-[10px] text-green-500">(current)</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {userDetails.country && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              {userDetails.country}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Favorites */}
                      {userDetails.favorites.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium mb-2">
                            <Heart className="h-3 w-3 text-purple-500" />
                            Favorite Channels ({userDetails.favorites.length})
                          </div>
                          <div className="max-h-32 overflow-auto space-y-1">
                            {userDetails.favorites.map((channelId, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Tv className="h-3 w-3 text-muted-foreground" />
                                <span className="font-mono text-muted-foreground truncate">{channelId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Watch History */}
                      {userDetails.watchHistory.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium mb-2">
                            <History className="h-3 w-3 text-blue-500" />
                            Watch History (last {Math.min(20, userDetails.watchHistory.length)})
                          </div>
                          <div className="max-h-48 overflow-auto space-y-1">
                            {userDetails.watchHistory.slice(0, 20).map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Tv className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{entry.channelName}</span>
                                </div>
                                <span className="text-muted-foreground text-[10px] shrink-0 ml-2">
                                  {formatWatchTime(entry)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Settings */}
                      {userDetails.settings && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium mb-2">
                            <Settings className="h-3 w-3" />
                            Settings
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Show only favorites: {userDetails.settings.showOnlyFavorites ? 'Yes' : 'No'}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 border-t">
                        <Button
                          variant={userDetails.isAdmin ? "destructive" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => toggleAdmin(userDetails.id, userDetails.isAdmin || false)}
                          disabled={userDetails.id === user?.uid || togglingAdminId === userDetails.id}
                        >
                          {togglingAdminId === userDetails.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : userDetails.isAdmin ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Revoke Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      User not found
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
