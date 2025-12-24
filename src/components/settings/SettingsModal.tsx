'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Globe, Check, Sun, Moon, Monitor, Eye } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings, Theme } from '@/contexts/SettingsContext'
import { uiLanguages, UILanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { uiLanguage, setUILanguage, theme, setTheme, hoverPreview, setHoverPreview, t } = useSettings()

  const handleLanguageSelect = (lang: UILanguage) => {
    setUILanguage(lang)
  }

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settingsTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sun className="h-4 w-4" />
              {t('theme')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeSelect(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-all',
                      theme === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', theme === option.value ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hover Preview */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('hoverPreview')}</p>
                <p className="text-xs text-muted-foreground">{t('hoverPreviewDesc')}</p>
              </div>
            </div>
            <Switch
              checked={hoverPreview}
              onCheckedChange={setHoverPreview}
            />
          </div>

          {/* Interface Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              {t('interfaceLanguage')}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {uiLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
                    uiLanguage === lang.code
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{lang.name}</span>
                  </div>
                  {uiLanguage === lang.code && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Trigger component for easy use
export function SettingsTrigger() {
  const [open, setOpen] = useState(false)
  const { t } = useSettings()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
      >
        <Settings className="h-4 w-4" />
        {t('settings')}
      </button>
      <SettingsModal open={open} onOpenChange={setOpen} />
    </>
  )
}
