'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Tv,
  Users,
  BarChart3,
  FolderOpen,
  ArrowLeft,
  Settings,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Redirect non-admins only after admin status is fully loaded
  useEffect(() => {
    if (!loading && !adminLoading && !isAdmin) {
      router.push('/watch')
    }
  }, [loading, adminLoading, isAdmin, router])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Show loading while checking auth or admin status
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const handleNavClick = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden h-14 border-b bg-background/95 backdrop-blur flex items-center px-4 gap-3 shrink-0 sticky top-0 z-50">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon}
          <h1 className="text-base font-semibold truncate">{title}</h1>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => router.push('/watch')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <aside className={cn(
        "md:hidden fixed top-14 left-0 bottom-0 w-64 bg-card border-r z-50 transform transition-transform duration-200",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-11',
                  isActive && 'bg-primary/10 text-primary font-medium'
                )}
                onClick={() => handleNavClick(item.path)}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                {item.label}
              </Button>
            )
          })}
        </nav>
        <div className="border-t p-3 mt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 text-muted-foreground"
            onClick={() => handleNavClick('/watch')}
          >
            <Tv className="h-5 w-5" />
            Back to TV
          </Button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 border-r bg-card/50 flex-col shrink-0">
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
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 border-b bg-background/95 backdrop-blur items-center px-6 gap-4 shrink-0">
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

        {/* Mobile Header Actions */}
        {headerActions && (
          <div className="md:hidden border-b bg-background/95 backdrop-blur px-4 py-2 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {headerActions}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
