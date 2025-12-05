import Link from 'next/link'
import { Play, Tv, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-xl font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Stellix TV</span>
          </div>

          {/* Hero content */}
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Watch Live TV
              <span className="block text-primary">Without the Clutter</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Modern IPTV player with a clean interface. No annoying popups, no intrusive ads
              inside the player. Just pure streaming experience.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/watch">
                  <Play className="h-5 w-5" />
                  Start Watching
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg">
                <Link href="/watch">
                  Browse Channels
                </Link>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Tv className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Free Channels</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Access hundreds of live TV channels from around the world, completely free.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Fast & Smooth</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adaptive streaming quality ensures smooth playback even on slower connections.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No Popups</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Clean viewing experience. Ads stay in their place, never blocking your content.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Stellix TV. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
