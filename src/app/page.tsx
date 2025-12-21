'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Play, Tv, Zap, Shield, Globe, Newspaper, Trophy, Film, Baby, Music, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDefaultLanguageFilter } from '@/lib/geoLanguageService'

// Language data with emoji flags
const languageData = [
  { code: 'en', name: 'English', flag: '🇬🇧', channels: 444 },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', channels: 375 },
  { code: 'es', name: 'Español', flag: '🇪🇸', channels: 99 },
  { code: 'fr', name: 'Français', flag: '🇫🇷', channels: 85 },
  { code: 'pt', name: 'Português', flag: '🇧🇷', channels: 45 },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', channels: 38 },
]

// Category data
const categories = [
  { id: 'news', name: 'News', icon: Newspaper },
  { id: 'sports', name: 'Sports', icon: Trophy },
  { id: 'movies', name: 'Movies', icon: Film },
  { id: 'kids', name: 'Kids', icon: Baby },
  { id: 'music', name: 'Music', icon: Music },
  { id: 'documentary', name: 'Documentary', icon: FileVideo },
]

// Country flags for social proof
const countryFlags = ['🇺🇸', '🇬🇧', '🇷🇺', '🇩🇪', '🇫🇷', '🇪🇸', '🇧🇷', '🇮🇹', '🇵🇱', '🇺🇦', '🇳🇱', '🇨🇦', '🇦🇺', '🇲🇽', '🇦🇷', '🇨🇴', '🇮🇳', '🇹🇷', '🇬🇪']

export default function Home() {
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en')

  useEffect(() => {
    // Detect user's language for "Start Watching" button
    getDefaultLanguageFilter().then(result => {
      setDetectedLanguage(result.language)
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <img
              src="/icons/icon.svg"
              alt="Stellix TV"
              className="h-12 w-12 rounded-xl"
            />
            <span className="text-2xl font-bold tracking-tight">Stellix TV</span>
          </div>

          {/* Hero content */}
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-primary">1,200+</span> Live Channels
              <span className="block text-foreground/90">100% Free</span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              Stream live TV from <span className="text-foreground font-medium">50+ countries</span>.
              News, sports, movies, kids — all in one clean player. No popups, no clutter.
            </p>

            {/* Stats badges */}
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                <Globe className="h-4 w-4" />
                50+ countries
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                <Tv className="h-4 w-4" />
                1,200+ channels
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                <Zap className="h-4 w-4" />
                No signup required
              </span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2 text-base">
                <Link href={`/watch?lang=${detectedLanguage}`}>
                  <Play className="h-5 w-5" />
                  Start Watching
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="/watch">
                  Browse All Channels
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Channels by Language */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Channels by Language
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {languageData.map((lang) => (
              <Link
                key={lang.code}
                href={`/watch?lang=${lang.code}`}
                className="group flex flex-col items-center p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <span className="text-3xl mb-2">{lang.flag}</span>
                <span className="font-medium text-sm">{lang.name}</span>
                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  {lang.channels} channels
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Categories */}
      <div className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold mb-6">Popular Categories</h2>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.id}
                  href={`/watch?category=${cat.id}`}
                  className="group flex flex-col items-center p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Trusted by viewers in {countryFlags.length}+ countries
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-2xl">
              {countryFlags.map((flag, i) => (
                <span key={i} className="opacity-70 hover:opacity-100 transition-opacity">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Free Forever</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                All channels are free. No subscription, no credit card required.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Fast & Smooth</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Adaptive streaming for smooth playback on any connection.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">No Popups</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Clean experience. Ads never block your content.
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
              © 2025 Stellix TV. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/dmca" className="hover:text-foreground transition-colors">
                DMCA
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
