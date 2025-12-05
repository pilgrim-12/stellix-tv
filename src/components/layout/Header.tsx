'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, Star, LogOut, Loader2, Calendar, Tv } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthContext } from '@/contexts/AuthContext'

export function Header() {
  const router = useRouter()
  const { user, loading, logout } = useAuthContext()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-base font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">Stellix TV</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/watch" className="flex items-center gap-1.5">
              <Tv className="h-4 w-4" />
              <span className="hidden sm:inline">Смотреть</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/guide" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Программа</span>
            </Link>
          </Button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">

          {loading ? (
            <Button variant="ghost" size="icon" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback className="bg-purple-600 text-white text-sm">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/watch">
                    <Star className="mr-2 h-4 w-4" />
                    Favorites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
