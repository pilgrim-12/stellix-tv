'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Globe, Check, Sun, Moon, Flame, Monitor, Eye } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings, Theme } from '@/contexts/SettingsContext'
import { uiLanguages, UILanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'warm', icon: Flame, label: 'Warm' },
  { value: 'system', icon: Monitor, label: 'System' },
]

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { uiLanguage, setUILanguage, theme, setTheme, hoverPreview, setHoverPreview, t } = useSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            {t('settingsTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Theme */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('theme')}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const active = theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2 rounded-md border text-xs transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interface Language */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('interfaceLanguage')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {uiLanguages.map((lang) => {
                const active = uiLanguage === lang.code
                return (
                  <button
                    key={lang.code}
                    onClick={() => setUILanguage(lang.code)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <span className={cn('truncate', active ? 'font-medium text-primary' : 'text-foreground')}>
                      {lang.nativeName}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hover Preview */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t('hoverPreview')}</p>
              <p className="text-xs text-muted-foreground">{t('hoverPreviewDesc')}</p>
            </div>
            <Switch
              checked={hoverPreview}
              onCheckedChange={setHoverPreview}
            />
          </div>
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
