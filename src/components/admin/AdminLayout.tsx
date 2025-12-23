'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Tv,
  Users,
  BarChart3,
  FolderOpen,
  ArrowLeft,
  Settings,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  icon?: React.ReactNode
  headerActions?: React.ReactNode
}

const navItems = [
  { path: '/admin', label: 'Channels', icon: Tv },
  { path: '/admin/staging', label: 'Staging', icon: FolderOpen },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/stats', label: 'Statistics', icon: BarChart3 },
]

export function AdminLayout({ children, title, icon, headerActions }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAdmin, loading, adminLoading } = useAuthContext()

  // Redirect non-admins only after admin status is fully loaded
  useEffect(() => {
    if (!loading && !adminLoading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, adminLoading, isAdmin, router])

  // Show loading while checking auth or admin status
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card/50 flex flex-col shrink-0">
        {/* Logo/Brand */}
        <div className="h-14 border-b flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/watch')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <span className="font-semibold">Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-10',
                  isActive && 'bg-primary/10 text-primary font-medium'
                )}
                onClick={() => router.push(item.path)}
              >
                <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                {item.label}
              </Button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 text-muted-foreground text-sm"
            onClick={() => router.push('/watch')}
          >
            <Tv className="h-4 w-4" />
            Back to TV
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {icon}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          {headerActions && (
            <div className="ml-auto flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
