'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UILanguage, translations, TranslationKey, t as translate } from '@/lib/i18n'

interface SettingsContextType {
  uiLanguage: UILanguage
  setUILanguage: (lang: UILanguage) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'stellix-ui-language'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUILanguageState] = useState<UILanguage>('ru')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved language on mount
    const saved = localStorage.getItem(STORAGE_KEY) as UILanguage | null
    if (saved && translations[saved]) {
      setUILanguageState(saved)
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0]
      if (browserLang === 'uk' || browserLang === 'ru' || browserLang === 'en') {
        setUILanguageState(browserLang as UILanguage)
      }
    }
    setMounted(true)
  }, [])

  const setUILanguage = (lang: UILanguage) => {
    setUILanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(uiLanguage, key, params)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <SettingsContext.Provider value={{ uiLanguage: 'ru', setUILanguage, t: (key) => translate('ru', key) }}>
        {children}
      </SettingsContext.Provider>
    )
  }

  return (
    <SettingsContext.Provider value={{ uiLanguage, setUILanguage, t }}>
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
