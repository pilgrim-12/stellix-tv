'use client'

import { useEffect, useRef } from 'react'
import { useChannelStore } from '@/stores'
import { checkChannelsInBatches } from '@/lib/channelChecker'

/**
 * Хук для фоновой проверки доступности каналов
 * Запускается один раз при монтировании компонента
 */
export function useChannelHealthCheck() {
  const hasRun = useRef(false)
  const { channels, setChannelStatus } = useChannelStore()

  useEffect(() => {
    // Запускаем проверку только один раз
    if (hasRun.current || channels.length === 0) return
    hasRun.current = true

    // Небольшая задержка перед началом проверки
    const timeoutId = setTimeout(() => {
      const channelsToCheck = channels.map(ch => ({
        id: ch.id,
        url: ch.url,
      }))

      console.log(`[ChannelCheck] Starting health check for ${channelsToCheck.length} channels...`)

      checkChannelsInBatches(
        channelsToCheck,
        (channelId, isOnline) => {
          if (!isOnline) {
            console.log(`[ChannelCheck] Channel ${channelId} is offline`)
          }
          setChannelStatus(channelId, isOnline)
        },
        5, // batch size
        300 // delay between batches
      ).then(() => {
        console.log('[ChannelCheck] Health check completed')
      })
    }, 2000) // Начинаем через 2 секунды после загрузки

    return () => clearTimeout(timeoutId)
  }, [channels, setChannelStatus])
}
