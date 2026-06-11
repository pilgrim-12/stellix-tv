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
 * Convert HLS.js error data into a human-readable message
 */
export function formatHlsError(detail: string, reason?: string): string {
  const map: Record<string, string> = {
    manifestLoadError: 'Не удалось загрузить поток (сервер не ответил или CORS)',
    manifestLoadTimeOut: 'Таймаут загрузки потока — сервер не отвечает',
    manifestParsingError: 'Битый плейлист — сервер вернул невалидный ответ',
    levelLoadError: 'Не удалось загрузить качество потока',
    levelLoadTimeOut: 'Таймаут загрузки качества потока',
    fragLoadError: 'Не удалось загрузить фрагмент видео',
    fragLoadTimeOut: 'Таймаут загрузки фрагмента видео',
    fragParsingError: 'Битый фрагмент видео',
    bufferAppendError: 'Ошибка буфера — видеоформат не поддерживается',
    bufferStalledError: 'Буфер остановился — поток слишком медленный',
    bufferFullError: 'Переполнение буфера',
    keyLoadError: 'Не удалось загрузить ключ шифрования (DRM)',
    keyLoadTimeOut: 'Таймаут загрузки ключа шифрования',
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
