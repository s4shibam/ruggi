import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

/**
 * Formats a file size in KB to a human-readable string
 * @param sizeKB - File size in kilobytes
 * @returns Formatted string (e.g., "1.5 MB", "512 KB", "2 GB")
 */
export const formatFileSize = (sizeKB: number | null | undefined): string => {
  if (sizeKB === null || sizeKB === undefined || sizeKB === 0) {
    return '0 KB'
  }

  const KB_TO_MB = 1024
  const KB_TO_GB = KB_TO_MB * 1024

  if (sizeKB >= KB_TO_GB) {
    return `${(sizeKB / KB_TO_GB).toFixed(2)} GB`
  }
  if (sizeKB >= KB_TO_MB) {
    return `${(sizeKB / KB_TO_MB).toFixed(2)} MB`
  }
  return `${sizeKB} KB`
}

/**
 * Returns a time-based greeting based on the current hour
 * @returns Greeting string (e.g., "Good morning", "Good afternoon")
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 6) return 'Happy late night'
  if (hour < 12) return 'Good morning'
  if (hour < 16) return 'Good afternoon'
  if (hour < 20) return 'Good evening'
  return 'Happy late night'
}
