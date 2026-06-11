import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Convert HLS.js error data into a human-readable message.
 * httpCode: response status (0 = CORS/unreachable, 403, 404, etc.)
 */
export function formatHlsError(detail: string, httpCode?: number, reason?: string): string {
  // Network load errors — differentiate by HTTP code
  if (detail === 'manifestLoadError' || detail === 'levelLoadError' || detail === 'fragLoadError') {
    const target = detail.startsWith('manifest') ? 'плейлист' : detail.startsWith('level') ? 'качество' : 'фрагмент'
    if (httpCode === 0 || httpCode === undefined) return `CORS — сервер блокирует запросы из браузера (${target})`
    if (httpCode === 403) return `Доступ запрещён (403) — сервер отклонил запрос`
    if (httpCode === 404) return `Поток не найден (404) — URL не существует`
    if (httpCode === 410) return `Поток удалён (410)`
    if (httpCode === 451) return `Поток заблокирован в вашем регионе (451)`
    if (httpCode >= 500) return `Ошибка сервера (${httpCode}) — попробуйте позже`
    return `Ошибка загрузки (${httpCode})`
  }

  const map: Record<string, string> = {
    manifestLoadTimeOut: 'Таймаут — сервер не отвечает',
    manifestParsingError: 'Битый плейлист — невалидный формат',
    levelLoadTimeOut: 'Таймаут загрузки качества',
    fragLoadTimeOut: 'Таймаут загрузки видео',
    fragParsingError: 'Битый фрагмент видео',
    bufferAppendError: 'Формат видео не поддерживается',
    bufferStalledError: 'Буфер — поток слишком медленный',
    bufferFullError: 'Переполнение буфера',
    keyLoadError: 'Не удалось загрузить ключ DRM',
    keyLoadTimeOut: 'Таймаут ключа DRM',
  }
  return map[detail] || reason || detail
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
