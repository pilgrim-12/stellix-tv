'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UILanguage, translations, TranslationKey, t as translate, getCategoryName as getCatName } from '@/lib/i18n'

export type Theme = 'dark' | 'light' | 'system'

interface SettingsContextType {
  uiLanguage: UILanguage
  setUILanguage: (lang: UILanguage) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
  hoverPreview: boolean
  setHoverPreview: (enabled: boolean) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  getCategoryName: (category: string) => string
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'stellix-ui-language'
const THEME_STORAGE_KEY = 'stellix-theme'
const HOVER_PREVIEW_KEY = 'stellix-hover-preview'

// Helper to get system theme preference
function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUILanguageState] = useState<UILanguage>('ru')
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const [hoverPreview, setHoverPreviewState] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    // Load saved language on mount
    const saved = localStorage.getItem(STORAGE_KEY) as UILanguage | null
    if (saved && translations[saved]) {
      setUILanguageState(saved)
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0]
      if (['uk', 'ru', 'en', 'es', 'it'].includes(browserLang)) {
        setUILanguageState(browserLang as UILanguage)
      }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
    } else {
      applyTheme('dark')
    }

    // Load hover preview setting (default is true)
    const savedHoverPreview = localStorage.getItem(HOVER_PREVIEW_KEY)
    if (savedHoverPreview === 'false') {
      setHoverPreviewState(false)
    }

    setMounted(true)
  }, [])

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setUILanguage = (lang: UILanguage) => {
    setUILanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  const setHoverPreview = (enabled: boolean) => {
    setHoverPreviewState(enabled)
    localStorage.setItem(HOVER_PREVIEW_KEY, String(enabled))
  }

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(uiLanguage, key, params)
  }

  const getCategoryName = (category: string) => {
    return getCatName(uiLanguage, category)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <SettingsContext.Provider value={{
        uiLanguage: 'ru',
        setUILanguage,
        theme: 'dark',
        setTheme: () => {},
        resolvedTheme: 'dark',
        hoverPreview: false,
        setHoverPreview: () => {},
        t: (key) => translate('ru', key),
        getCategoryName: (cat) => getCatName('ru', cat)
      }}>
        {children}
      </SettingsContext.Provider>
    )
  }

  return (
    <SettingsContext.Provider value={{ uiLanguage, setUILanguage, theme, setTheme, resolvedTheme, hoverPreview, setHoverPreview, t, getCategoryName }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
